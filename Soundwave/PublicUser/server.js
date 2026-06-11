const express = require('express');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const { body, query, validationResult } = require('express-validator');
const cors = require('cors');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const localStore = require('./localStore');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// ---------------------------------------------------------------------------
// Configuration — all from env
// ---------------------------------------------------------------------------
const requiredVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'FIREBASE_API_KEY', 'JWT_SECRET'];
for (const v of requiredVars) {
  if (!process.env[v]) {
    console.error(`Missing required env variable: ${v}`);
    process.exit(1);
  }
}

const PORT = parseInt(process.env.PORT, 10) || 8082;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const firebaseApiKey = process.env.FIREBASE_API_KEY;
const jwtSecret = process.env.JWT_SECRET;

// Supabase client for data queries only (podcasts, episodes, ratings, etc.)
const supabase = createClient(supabaseUrl, supabaseKey);

// ---------------------------------------------------------------------------
// Helper: direct HTTPS call to Firebase Identity Toolkit REST API
// ---------------------------------------------------------------------------
function callFirebaseAPI(endpoint, payload) {
  return new Promise((resolve, reject) => {
    const https = require('https');
    const body = JSON.stringify(payload);
    const url = `https://identitytoolkit.googleapis.com/v1/${endpoint}?key=${firebaseApiKey}`;
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
      timeout: 15000,
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Firebase API timeout')); });
    req.write(body);
    req.end();
  });
}

// ---------------------------------------------------------------------------
// Express app
// ---------------------------------------------------------------------------
const app = express();

// ---------------------------------------------------------------------------
// Security middleware
// ---------------------------------------------------------------------------
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://fonts.gstatic.com'],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      scriptSrcAttr: ["'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https://ui-avatars.com', 'https://image.simplecastcdn.com', 'https://*.supabase.co'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      mediaSrc: ["'self'", 'https:', 'http:', 'blob:'],
      connectSrc: ["'self'", `https://${supabaseUrl.replace('https://', '')}`],
    },
  },
}));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, try again later.' },
});
app.use('/api/', apiLimiter);

// Login rate limiter — 30 attempts per 15 minutes
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Try again in 15 minutes.' },
});

// Signup rate limiter — 20 attempts per 15 minutes (separate from login)
const signupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Try again in 15 minutes.' },
});

app.use(cors({ origin: 'http://localhost:8082', credentials: true }));
app.use(express.json());

// ---------------------------------------------------------------------------
// JWT helpers
// ---------------------------------------------------------------------------
function generateToken(payload) {
  return jwt.sign(payload, jwtSecret, { expiresIn: '7d' });
}

// Convert a Firebase UID to a deterministic UUID v4-compatible string.
// This avoids depending on Supabase Auth for generating UUIDs.
function firebaseUidToUuid(firebaseUid) {
  const hash = crypto.createHash('md5').update(firebaseUid).digest('hex');
  return hash.substring(0, 8) + '-' +
    hash.substring(8, 12) + '-4' +
    hash.substring(13, 16) + '-a' +
    hash.substring(16, 19) + '-' +
    hash.substring(20, 32);
}

// Ensure a user_roles entry exists for FK compatibility on follow/rating tables.
// This is called before any write to user_follows or ratings.
async function ensureUserRole(userId) {
  const { error } = await supabase
    .from('user_roles')
    .upsert({ id: userId, role: 'User' }, { onConflict: 'id' });
  if (error) console.warn('[ensureUserRole]', error.message);
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], jwtSecret);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Validation middleware
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array().map(e => ({ field: e.path, message: e.msg })) });
  }
  next();
}

// ---------------------------------------------------------------------------
// Routes: Auth
// ---------------------------------------------------------------------------

// POST /api/auth/signup
app.post('/api/auth/signup',
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  validate,
  async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Create user in Firebase Auth
    const fbResult = await callFirebaseAPI('accounts:signUp', {
      email,
      password,
      returnSecureToken: true,
      displayName: name,
    });

    if (fbResult.status !== 200) {
      const msg = fbResult.data?.error?.message || 'Signup failed';
      if (msg === 'EMAIL_EXISTS') {
        return res.status(409).json({ error: 'This email is already registered. Try signing in instead.' });
      }
      if (msg.includes('WEAK_PASSWORD')) {
        return res.status(400).json({ error: 'Password must be at least 6 characters.' });
      }
      return res.status(400).json({ error: msg });
    }

    const firebaseUid = fbResult.data.localId;

    // Generate a deterministic UUID from the Firebase UID for DB write compatibility
    const userUuid = firebaseUidToUuid(firebaseUid);

    // Also try creating a Supabase Auth user (best-effort, not required)
    const sbResult = await supabase.auth.signUp({ email, password });
    if (sbResult.error) {
      console.warn('[SIGNUP] Supabase signUp warning:', sbResult.error.message);
    }

    // Store role mapping using the deterministic UUID (for FK compatibility)
    const { error: roleError } = await supabase
      .from('user_roles')
      .upsert({ id: userUuid, role: 'User' }, { onConflict: 'id' });

    if (roleError) {
      console.warn('[SIGNUP] Role insert warning:', roleError.message);
    }

    console.log(`[SIGNUP SUCCESS] ${email} (Firebase UID: ${firebaseUid}, DB UUID: ${userUuid})`);
    res.json({
      message: 'Account created successfully! You can now sign in.',
    });
  } catch (err) {
    console.error('[SIGNUP ERROR]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/login
app.post('/api/auth/login',
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
  validate,
  async (req, res) => {
  try {
    const { email, password } = req.body;

    // Authenticate with Firebase Identity Toolkit
    const fbResult = await callFirebaseAPI('accounts:signInWithPassword', {
      email,
      password,
      returnSecureToken: true,
    });

    if (fbResult.status !== 200) {
      const msg = fbResult.data?.error?.message || 'Authentication failed';
      console.log(`[LOGIN FAILED] ${email}: ${msg}`);
      if (msg === 'EMAIL_NOT_FOUND' || msg === 'INVALID_PASSWORD' || msg === 'INVALID_LOGIN_CREDENTIALS') {
        return res.status(401).json({ error: 'Invalid email or password. Please check your credentials.' });
      }
      if (msg === 'TOO_MANY_ATTEMPTS_TRY_LATER') {
        return res.status(429).json({ error: 'Too many attempts. Try again later.' });
      }
      return res.status(401).json({ error: 'Invalid email or password. Please check your credentials.' });
    }

    const firebaseUid = fbResult.data.localId;
    const displayName = fbResult.data.displayName || email.split('@')[0] || 'User';

    // Generate a deterministic UUID from the Firebase UID for DB write compatibility.
    // This avoids depending on Supabase Auth (which may have sign-ups disabled).
    const userUuid = firebaseUidToUuid(firebaseUid);

    // Also try signing in with Supabase Auth (best-effort, not required)
    try {
      const sbResult = await supabase.auth.signInWithPassword({ email, password });
      if (sbResult.error) {
        const sbSignUp = await supabase.auth.signUp({ email, password });
        if (sbSignUp.error) {
          console.warn('[LOGIN] Supabase auth best-effort failed:', sbSignUp.error?.message);
        }
      }
    } catch (sbErr) {
      console.warn('[LOGIN] Supabase auth error:', sbErr.message);
    }

    // Ensure user_roles has an entry for FK compatibility
    const { error: roleError } = await supabase
      .from('user_roles')
      .upsert({ id: userUuid, role: 'User' }, { onConflict: 'id' });

    if (roleError) {
      console.warn('[LOGIN] Role upsert warning:', roleError.message);
    }

    const token = generateToken({
      sub: firebaseUid,
      supabase_uid: userUuid,
      email: fbResult.data.email,
      display_name: displayName,
    });

    console.log(`[LOGIN SUCCESS] ${email} (Firebase UID: ${firebaseUid}, DB UUID: ${userUuid})`);
    res.json({
      token,
      user: {
        id: firebaseUid,
        email: fbResult.data.email,
        display_name: displayName,
      },
    });
  } catch (err) {
    console.error('[LOGIN ERROR]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/me — current user info
app.get('/api/auth/me', authMiddleware, async (req, res) => {
  res.json({
    id: req.user.sub,
    email: req.user.email,
    display_name: req.user.display_name,
  });
});

// POST /api/auth/logout
app.post('/api/auth/logout', (_req, res) => {
  res.json({ success: true });
});

// ---------------------------------------------------------------------------
// Public Data Routes (no auth required)
// ---------------------------------------------------------------------------

// GET /api/podcasts - list all podcasts
app.get('/api/podcasts', async (req, res) => {
  try {
    const { search, category, featured, limit = 20, offset = 0 } = req.query;
    let query = supabase.from('podcasts').select('*', { count: 'exact' });

    if (search) query = query.ilike('title', `%${search}%`);
    if (category) {
      const { data: catFeeds } = await supabase
        .from('feeds')
        .select('id')
        .eq('category', category)
        .eq('status', 'active');
      const feedIds = catFeeds?.map(f => f.id) || [];
      if (feedIds.length === 0) return res.json({ data: [], total: 0, offset: Number(offset), limit: Number(limit) });
      query = query.in('feed_id', feedIds);
    }
    if (featured === 'true') query = query.eq('featured', true);

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (error) throw error;
    res.json({ data, total: count, offset: Number(offset), limit: Number(limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/podcasts/featured
app.get('/api/podcasts/featured', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('podcasts')
      .select('*')
      .eq('featured', true)
      .order('created_at', { ascending: false })
      .limit(6);

    if (error) throw error;
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/podcasts/:id
app.get('/api/podcasts/:id', async (req, res) => {
  try {
    const { data: podcast, error } = await supabase
      .from('podcasts')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) {
      // PGRST116 = no rows returned by .single()
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Podcast not found' });
      }
      throw error;
    }
    if (!podcast) return res.status(404).json({ error: 'Podcast not found' });

    const { data: episodes, error: epError } = await supabase
      .from('episodes')
      .select('*')
      .eq('podcast_id', podcast.id)
      .eq('status', 'published')
      .order('published_at', { ascending: false });

    if (!epError) podcast.episodes = episodes;

    res.json({ data: podcast });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/episodes
app.get('/api/episodes', async (req, res) => {
  try {
    const { limit = 20, offset = 0, podcast_id } = req.query;
    let query = supabase
      .from('episodes')
      .select('*, podcasts!inner(title, author, image_url)', { count: 'exact' });

    query = query.eq('status', 'published');
    if (podcast_id) query = query.eq('podcast_id', podcast_id);

    const { data, count, error } = await query
      .order('published_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (error) throw error;
    res.json({ data, total: count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/episodes/recent
app.get('/api/episodes/recent', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('episodes')
      .select('*, podcasts!inner(title, author, image_url)')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(10);

    if (error) throw error;
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/categories
app.get('/api/categories', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');

    if (error) throw error;
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/categories/:name/podcasts
app.get('/api/categories/:name/podcasts', async (req, res) => {
  try {
    const { data: feeds, error: feedError } = await supabase
      .from('feeds')
      .select('id')
      .eq('category', req.params.name)
      .eq('status', 'active');

    if (feedError) throw feedError;
    if (!feeds.length) return res.json({ data: [] });

    const feedIds = feeds.map(f => f.id);
    const { data, error } = await supabase
      .from('podcasts')
      .select('*')
      .in('feed_id', feedIds)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/search?q=...
app.get('/api/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    const term = q.trim();
    const [podcastsRes, episodesRes] = await Promise.all([
      supabase.from('podcasts')
        .select('*')
        .or(`title.ilike.%${term}%,description.ilike.%${term}%,author.ilike.%${term}%`)
        .limit(10),
      supabase.from('episodes')
        .select('*, podcasts!inner(title, author, image_url)')
        .eq('status', 'published')
        .or(`title.ilike.%${term}%,description.ilike.%${term}%`)
        .limit(10),
    ]);

    res.json({
      podcasts: podcastsRes.data || [],
      episodes: episodesRes.data || [],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Debug Route — helps diagnose token issues
// ---------------------------------------------------------------------------
app.get('/api/debug/me', authMiddleware, (req, res) => {
  res.json({
    sub: req.user.sub,
    supabase_uid: req.user.supabase_uid || null,
    has_supabase_uid: !!req.user.supabase_uid,
    email: req.user.email,
  });
});

// ---------------------------------------------------------------------------
// Protected User Routes (auth required)
// ---------------------------------------------------------------------------

// POST /api/ratings - submit/update a rating
app.post('/api/ratings', authMiddleware,
  body('podcast_id').notEmpty().withMessage('podcast_id is required'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  validate,
  async (req, res) => {
  try {
    const { podcast_id, rating } = req.body;
    const user_id = req.user.supabase_uid || req.user.sub;
    if (!user_id) {
      return res.status(400).json({ error: 'Account not fully linked. Please log out and log back in.' });
    }
    if (!podcast_id || !rating) {
      return res.status(400).json({ error: 'podcast_id and rating are required' });
    }

    // Try Supabase first, fall back to local store
    try {
      const { error } = await supabase
        .from('ratings')
        .upsert({ user_id, podcast_id, rating }, { onConflict: 'user_id, podcast_id' });
    } catch {}

    // Always write to local store as fallback / primary
    localStore.setRating(user_id, podcast_id, rating);

    res.json({ data: { user_id, podcast_id, rating } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ratings/:podcast_id - get user's rating for a podcast
app.get('/api/ratings/:podcast_id', authMiddleware, async (req, res) => {
  try {
    const user_id = req.user.supabase_uid || req.user.sub;
    if (!user_id) {
      return res.status(400).json({ error: 'Account not fully linked. Please log out and log back in.' });
    }

    // Get from local store
    const rating = localStore.getRating(user_id, req.params.podcast_id);

    res.json({ data: rating ? { rating } : null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/follows - follow/unfollow
app.post('/api/follows', authMiddleware,
  body('podcast_id').notEmpty().withMessage('podcast_id is required'),
  body('follow').isBoolean().withMessage('follow must be true or false'),
  validate,
  async (req, res) => {
  try {
    const { podcast_id, follow, title, image_url } = req.body;
    const user_id = req.user.supabase_uid || req.user.sub;
    if (!user_id) {
      return res.status(400).json({ error: 'Account not fully linked. Please log out and log back in.' });
    }
    if (!podcast_id) {
      return res.status(400).json({ error: 'podcast_id is required' });
    }

    // Try Supabase first, fall back to local store
    let supabaseSuccess = false;
    try {
      if (follow) {
        const { error } = await supabase
          .from('user_follows')
          .upsert({ user_id, podcast_id }, { onConflict: 'user_id, podcast_id' });
        if (!error) supabaseSuccess = true;
      } else {
        const { error } = await supabase
          .from('user_follows')
          .delete()
          .eq('user_id', user_id)
          .eq('podcast_id', podcast_id);
        if (!error) supabaseSuccess = true;
      }
    } catch {}

    // Always write to local store as fallback / primary
    localStore.setFollow(user_id, podcast_id, follow, { title, image_url });

    res.json({ success: true, following: follow });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/follows - get user's followed podcasts
app.get('/api/follows', authMiddleware, async (req, res) => {
  try {
    const user_id = req.user.supabase_uid || req.user.sub;
    if (!user_id) {
      return res.status(400).json({ error: 'Account not fully linked. Please log out and log back in.' });
    }

    // Get from local store (already has title/image_url fallbacks)
    let podcasts = localStore.getFollows(user_id);

    if (podcasts.length > 0) {
      // Best-effort enrichment from Supabase
      try {
        const ids = podcasts.map(p => p.id);
        const { data } = await supabase
          .from('podcasts')
          .select('*')
          .in('id', ids);
        if (data && data.length > 0) {
          const supabaseMap = {};
          data.forEach(p => { supabaseMap[p.id] = p; });
          podcasts = podcasts.map(p => supabaseMap[p.id] || p);
        }
      } catch {}
    }

    res.json({ data: podcasts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/activity - log user activity
app.post('/api/activity', authMiddleware,
  body('action').isIn(['played', 'paused', 'completed', 'skipped']).withMessage('Invalid action'),
  body('episode_id').optional({ values: 'falsy' }).notEmpty().withMessage('episode_id cannot be empty'),
  body('podcast_id').optional({ values: 'falsy' }).notEmpty().withMessage('podcast_id cannot be empty'),
  body('listened_seconds').optional({ values: 'falsy' }).isInt({ min: 0 }).withMessage('listened_seconds must be a positive number'),
  validate,
  async (req, res) => {
  try {
    const { episode_id, podcast_id, action, listened_seconds, episode_title, podcast_title, audio_url, duration } = req.body;
    const user_id = req.user.supabase_uid || req.user.sub;
    if (!action) {
      return res.status(400).json({ error: 'action is required' });
    }

    // Best-effort Supabase write
    try {
      if (req.user.supabase_uid) {
        const normalizedAction = action === 'played' ? 'play' : action;
        const { error } = await supabase.from('user_activity').insert({
          user_id, episode_id, podcast_id, action: normalizedAction, listened_seconds: listened_seconds || 0,
        });
        if (error) console.warn('[ACTIVITY] Supabase insert warning:', error.message);
      }
    } catch {}

    // Always write to local store as primary persistence
    localStore.addActivity(user_id, {
      episode_id, podcast_id, action, listened_seconds: listened_seconds || 0,
      episode_title, podcast_title, audio_url, duration,
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/activity - get user's listening history
app.get('/api/activity', authMiddleware, async (req, res) => {
  try {
    const user_id = req.user.supabase_uid || req.user.sub;
    // Read from local store as primary source
    const local = localStore.getActivity(user_id);
    res.json({ data: local });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/activity - clear user's listening history
app.delete('/api/activity', authMiddleware, async (req, res) => {
  try {
    const user_id = req.user.supabase_uid || req.user.sub;
    // Best-effort Supabase clear
    try {
      if (req.user.supabase_uid) {
        const { error } = await supabase
          .from('user_activity')
          .delete()
          .eq('user_id', user_id);
        if (error) console.warn('[ACTIVITY] Delete warning:', error.message);
      }
    } catch {}
    // Always clear local store
    localStore.clearActivity(user_id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/profile - update user profile
app.put('/api/profile', authMiddleware,
  body('display_name').optional().trim().isLength({ min: 1, max: 100 }).withMessage('display_name must be 1-100 characters'),
  body('avatar_url').optional({ values: 'falsy' }).isURL().withMessage('avatar_url must be a valid URL'),
  validate,
  async (req, res) => {
  try {
    const user_id = req.user.sub;
    const { display_name, avatar_url } = req.body;

    // We can't update auth.users metadata with anon key,
    // so we store profile data in user_roles or a profiles table
    // For now, just return success — profile updates
    // will be synced via client-side Supabase auth updateUser() call
    res.json({ success: true, user: { id: user_id, display_name, avatar_url } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Clean URL routes — must come BEFORE static middleware so /auth loads
// auth.html and not auth.js via the extensions fallback
// ---------------------------------------------------------------------------
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'auth.html')));
app.get('/auth', (req, res) => res.sendFile(path.join(__dirname, 'auth.html')));
app.get('/home', (req, res) => res.sendFile(path.join(__dirname, 'home.html')));
app.get('/browse', (req, res) => res.sendFile(path.join(__dirname, 'browse.html')));
app.get('/podcast', (req, res) => res.sendFile(path.join(__dirname, 'podcast.html')));
app.get('/category', (req, res) => res.sendFile(path.join(__dirname, 'category.html')));
app.get('/profile', (req, res) => res.sendFile(path.join(__dirname, 'profile.html')));

app.get('/library', (req, res) => res.sendFile(path.join(__dirname, 'library.html')));
app.get('/history', (req, res) => res.sendFile(path.join(__dirname, 'history.html')));

// Static files (CSS, JS, images) — fallback after all route handlers
app.use(express.static(__dirname, { extensions: ['css', 'png', 'jpg', 'svg', 'ico'] }));

// ---------------------------------------------------------------------------
// Global error handler
// ---------------------------------------------------------------------------
app.use((err, _req, res, _next) => {
  console.error('[SERVER ERROR]', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
const server = app.listen(PORT, () => {
  console.log('=============================================');
  console.log('  SoundWave - Public User Portal (Express)');
  console.log(`  http://localhost:${PORT}`);
  console.log('  Supabase Auth + JWT Session');
  console.log('  Press CTRL+C to stop.');
  console.log('=============================================');
});

// Graceful shutdown on Ctrl+C — prevents EADDRINUSE on restart
process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  server.close(() => {
    process.exit(0);
  });
});
