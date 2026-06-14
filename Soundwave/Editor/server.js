const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const mongoose = require('mongoose');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const EditorialAction = require('./models/EditorialAction');
const PodcastEdit = require('./models/PodcastEdit');

// ---------------------------------------------------------------------------
// Configuration — all from env, no fallbacks that leak secrets
// ---------------------------------------------------------------------------
const requiredVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'JWT_SECRET', 'EDITOR_EMAIL', 'EDITOR_PASSWORD'];
for (const v of requiredVars) {
  if (!process.env[v]) {
    console.error(`❌ Missing required env variable: ${v}`);
    process.exit(1);
  }
}

const PORT = parseInt(process.env.PORT, 10) || 8080;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const jwtSecret = process.env.JWT_SECRET;
const EDITOR_EMAIL = process.env.EDITOR_EMAIL;
const EDITOR_PASSWORD = process.env.EDITOR_PASSWORD;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
});

// Direct REST helper for operations needing explicit anon key auth
async function restQuery(method, path, body) {
  const url = supabaseUrl + '/rest/v1/' + path.replace(/^\//, '');
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': 'Bearer ' + supabaseKey,
      'Prefer': 'return=representation',
    },
  };
  if (body && method !== 'GET') opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || errData.error || 'Supabase REST error (' + res.status + ')');
  }
  if (method === 'DELETE') return { success: true };
  return res.json();
}

// ---------------------------------------------------------------------------
// JWT Token Blacklist (in-memory, for server-side logout)
// ---------------------------------------------------------------------------
const tokenBlacklist = new Set();
const BLACKLIST_CLEANUP_INTERVAL = 15 * 60 * 1000;
setInterval(() => { tokenBlacklist.clear(); }, BLACKLIST_CLEANUP_INTERVAL);

function tokenHash(token) {
  return crypto.createHash('sha256').update(token).digest('hex').slice(0, 16);
}
function isTokenBlacklisted(t) { return tokenBlacklist.has(tokenHash(t)); }
function blacklistToken(t) { tokenBlacklist.add(tokenHash(t)); }

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
      styleSrc: ["'self'", "'unsafe-inline'", 'https://cdnjs.cloudflare.com', 'https://fonts.googleapis.com', 'https://fonts.gstatic.com'],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      scriptSrcAttr: ["'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https://ui-avatars.com', 'https://image.simplecastcdn.com', 'https://*.supabase.co'],
      fontSrc: ["'self'", 'https://cdnjs.cloudflare.com', 'https://fonts.gstatic.com'],
      connectSrc: ["'self'", `https://${supabaseUrl.replace('https://', '')}`],
    },
  },
}));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, try again later.' },
});
app.use('/api/', apiLimiter);

// Login rate limiter — 10 attempts per 15 minutes
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Try again in 15 minutes.' },
});

const ALLOWED_ORIGINS = ['http://localhost:8080', 'http://localhost:8081'];
app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));

// CSRF protection — origin header exact-match check for state-changing requests
app.use((req, res, next) => {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    const origin = req.headers.origin;
    const referer = req.headers.referer;
    const isAllowed = function(url) {
      if (!url) return false;
      try {
        const parsed = new URL(url);
        return ALLOWED_ORIGINS.some(function(o) { return parsed.origin === o; });
      } catch {
        return false;
      }
    };
    if (origin && !isAllowed(origin)) {
      return res.status(403).json({ error: 'CSRF validation failed' });
    }
    if (!origin && referer && !isAllowed(referer)) {
      return res.status(403).json({ error: 'CSRF validation failed' });
    }
  }
  next();
});

app.use(express.json());

// ---------------------------------------------------------------------------
// JWT helpers
// ---------------------------------------------------------------------------
function generateToken(payload) {
  return jwt.sign(payload, jwtSecret, { expiresIn: '2h' });
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const token = authHeader.split(' ')[1];
    // Check if token has been blacklisted (logged out)
    if (isTokenBlacklisted(token)) {
      return res.status(401).json({ error: 'Token has been revoked' });
    }
    const decoded = jwt.verify(token, jwtSecret);
    req.editor = decoded;
    req.token = token;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// POST /api/logout — blacklist the current token
app.post('/api/logout', authMiddleware, (req, res) => {
  if (req.token) blacklistToken(req.token);
  res.json({ success: true, message: 'Logged out successfully' });
});

// ---------------------------------------------------------------------------
// Route: POST /api/login
// ---------------------------------------------------------------------------
app.post('/api/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    // Authenticate against Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      console.log(`[LOGIN FAILED] ${email}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check that this user has the Editor role
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('id', authData.user.id)
      .single();

    if (roleError || !roleData || (roleData.role !== 'Editor' && roleData.role !== 'Admin')) {
      console.log(`[LOGIN REJECTED] ${email} — not an editor`);
      await supabase.auth.admin.signOut(authData.user.id);
      return res.status(403).json({ error: 'Access denied. Editor role required.' });
    }

    const token = generateToken({
      sub: authData.user.id,
      email: authData.user.email,
      role: roleData.role,
    });

    console.log(`[LOGIN SUCCESS] ${email} (${roleData.role})`);
    res.json({
      token,
      editor: {
        id: authData.user.id,
        email: authData.user.email,
        role: roleData.role,
      },
    });
  } catch (err) {
    console.error('[LOGIN ERROR]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// Route: GET /api/me — current editor info
// ---------------------------------------------------------------------------
app.get('/api/me', authMiddleware, async (req, res) => {
  const { data, error } = await supabase
    .from('user_roles')
    .select('id, role')
    .eq('id', req.editor.sub)
    .single();

  if (error) return res.status(500).json({ error: error.message });

  res.json({
    id: data.id,
    email: req.editor.email,
    role: data.role,
  });
});

// ---------------------------------------------------------------------------
// Protected API Routes — all require authMiddleware
// ---------------------------------------------------------------------------

// GET /api/stats — dashboard metrics
app.get('/api/stats', authMiddleware, async (req, res) => {
  try {
    const { count: pendingReviews } = await supabase
      .from('highlights')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending');

    const { count: draftEpisodes } = await supabase
      .from('episodes')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'draft');

    const { count: publishedThisYear } = await supabase
      .from('episodes')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'published')
      .gte('published_at', new Date(new Date().getFullYear(), 0, 1).toISOString());

    const { count: totalEpisodes } = await supabase
      .from('episodes')
      .select('id', { count: 'exact', head: true });

    const { count: totalPodcasts } = await supabase
      .from('podcasts')
      .select('id', { count: 'exact', head: true });

    const { count: totalCollections } = await supabase
      .from('collections')
      .select('id', { count: 'exact', head: true });

    res.json({
      pendingReviews: pendingReviews || 0,
      draftEpisodes: draftEpisodes || 0,
      publishedThisYear: publishedThisYear || 0,
      totalEpisodes: totalEpisodes || 0,
      totalPodcasts: totalPodcasts || 0,
      totalCollections: totalCollections || 0,
    });
  } catch (err) {
    console.error('[STATS ERROR]', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/review-queue — draft episodes awaiting review
app.get('/api/review-queue', authMiddleware, async (req, res) => {
  try {
    const { data, error, count } = await supabase
      .from('episodes')
      .select(`
        id, title, description, audio_url, duration, episode_number, season_number,
        status, published_at, created_at,
        podcast_id, podcasts!inner (
          id, title, image_url, author, feed_url
        )
      `, { count: 'exact' })
      .eq('status', 'draft')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) return res.status(500).json({ error: error.message });

    const { count: totalPending } = await supabase
      .from('episodes')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'draft');

    const { count: inReview } = await supabase
      .from('episodes')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'published');

    res.json({
      items: data || [],
      stats: {
        totalPending: totalPending || 0,
        inReview: inReview || 0,
      },
    });
  } catch (err) {
    console.error('[REVIEW QUEUE ERROR]', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/review-queue/:id — approve or reject a draft episode
app.put('/api/review-queue/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['accepted', 'rejected', 'pending'].includes(status)) {
    return res.status(400).json({ error: 'Status must be: accepted, rejected, or pending' });
  }

  try {
    const { data: episode, error: fetchError } = await supabase
      .from('episodes')
      .select('id, title, status, podcast_id')
      .eq('id', id)
      .single();

    if (fetchError || !episode) {
      return res.status(404).json({ error: 'Episode not found' });
    }

    const newStatus = status === 'accepted' ? 'published' : 'draft';

    const { error: updateError } = await supabase
      .from('episodes')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) throw updateError;

    await EditorialAction.create({
      episode_id: id,
      action: status === 'accepted' ? 'published' : 'rejected',
      editor_id: req.editor.sub,
      editor_name: req.editor.email || 'Unknown',
      notes: `Review queue: ${status}`,
      previous_status: episode.status,
      new_status: newStatus,
      episode_title: episode.title,
    });

    res.json({ success: true, message: `Episode ${status}` });
  } catch (err) {
    console.error('[REVIEW UPDATE ERROR]', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/episodes/:id — single episode with podcast info
app.get('/api/episodes/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('episodes')
      .select(`
        id, title, description, audio_url, duration, episode_number, season_number,
        status, published_at, created_at, updated_at,
        podcast_id, podcasts!inner (
          id, title, image_url, author, feed_url
        )
      `)
      .eq('id', id)
      .single();

    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'Episode not found' });

    res.json(data);
  } catch (err) {
    console.error('[GET EPISODE ERROR]', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/episodes — all episodes with podcast info
app.get('/api/episodes', authMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const offset = (page - 1) * limit;
    const { q, status } = req.query;

    let query = supabase
      .from('episodes')
      .select(`
        id, title, description, audio_url, duration, episode_number, season_number,
        status, published_at, created_at,
        podcast_id, podcasts!inner (
          id, title, image_url, author
        )
      `, { count: 'exact' });

    if (status) {
      query = query.eq('status', status);
    }

    if (q) {
      query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
    }

    const { data, error, count } = await query
      .order('published_at', { ascending: false, nullsFirst: false })
      .range(offset, offset + limit - 1);

    if (error) return res.status(500).json({ error: error.message });

    const { count: published } = await supabase
      .from('episodes')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'published');

    const { count: draft } = await supabase
      .from('episodes')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'draft');

    const { count: hidden } = await supabase
      .from('episodes')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'hidden');

    res.json({
      items: data || [],
      total: count || 0,
      page,
      stats: {
        total: count || 0,
        published: published || 0,
        draft: draft || 0,
        hidden: hidden || 0,
      },
    });
  } catch (err) {
    console.error('[EPISODES ERROR]', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/episodes/:id — update episode (title, status, etc.)
app.put('/api/episodes/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const allowed = ['title', 'description', 'status', 'episode_number', 'season_number', 'duration', 'image_url'];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  // Validate status if provided
  if (updates.status && !['published', 'hidden', 'draft'].includes(updates.status)) {
    return res.status(400).json({ error: 'Status must be: published, hidden, or draft' });
  }

  updates.updated_at = new Date().toISOString();

  try {
    const { data, error } = await supabase
      .from('episodes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'Episode not found' });

    res.json(data);
  } catch (err) {
    console.error('[EPISODE UPDATE ERROR]', err);
    res.status(500).json({ error: err.message });
  }
});

// ── Image upload ──
const UPLOADS_DIR = path.join(__dirname, 'uploads', 'covers');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// ── Image upload with content validation ──
const VALID_IMAGE_SIGNATURES = {
  'image/png': [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
  'image/jpeg': [0xFF, 0xD8, 0xFF],
  'image/gif': [0x47, 0x49, 0x46, 0x38, 0x37, 0x61],   // GIF87a
  'image/webp': [0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50], // RIFF....WEBP
};

function detectImageType(buffer) {
  for (const [mime, sig] of Object.entries(VALID_IMAGE_SIGNATURES)) {
    const matches = sig.every((byte, i) => buffer[i] === byte);
    if (matches) return mime;
  }
  return null;
}

app.post('/api/upload/image', authMiddleware, async (req, res) => {
  try {
    const { image } = req.body;
    if (!image || typeof image !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid image data' });
    }
    // Accept both 'data:image/...' URLs and raw base64
    const base64Data = image.includes('base64,') ? image.split('base64,')[1] : image;
    const buffer = Buffer.from(base64Data, 'base64');

    // Reject empty or tiny payloads
    if (buffer.length < 16) {
      return res.status(400).json({ error: 'Invalid image data — too small' });
    }

    // Reject oversized files (max 5MB)
    if (buffer.length > 5 * 1024 * 1024) {
      return res.status(400).json({ error: 'Image too large — max 5MB' });
    }

    // Validate actual file content via magic bytes
    const detectedMime = detectImageType(buffer);
    if (!detectedMime) {
      return res.status(400).json({ error: 'Invalid image type — only PNG, JPEG, GIF, and WebP are allowed' });
    }

    const ext = '.' + detectedMime.split('/')[1];
    const filename = crypto.randomUUID() + ext;
    const filePath = path.join(UPLOADS_DIR, filename);
    fs.writeFileSync(filePath, buffer);
    res.json({ url: '/uploads/covers/' + filename, mime: detectedMime });
  } catch (err) {
    console.error('[IMAGE UPLOAD ERROR]', err);
    res.status(500).json({ error: 'Image upload failed' });
  }
});

// ── Tags (shared file with PublicUser) ──
const TAGS_FILE = path.join(__dirname, '..', 'PublicUser', 'data', 'tags.json');

function loadTags() {
  try {
    const raw = fs.readFileSync(TAGS_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveTags(tags) {
  const dir = path.dirname(TAGS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(TAGS_FILE, JSON.stringify(tags, null, 2), 'utf8');
}

// GET /api/episodes/:id/tags — get tags for an episode
app.get('/api/episodes/:id/tags', authMiddleware, (req, res) => {
  try {
    const tags = loadTags();
    res.json({ tags: tags[req.params.id] || [] });
  } catch (err) {
    console.error('[TAGS GET ERROR]', err.message);
    res.json({ tags: [] });
  }
});

// POST /api/episodes/:id/tags — save tags for an episode
app.post('/api/episodes/:id/tags', authMiddleware, (req, res) => {
  try {
    if (!Array.isArray(req.body.tags)) {
      return res.status(400).json({ error: 'tags must be an array of strings' });
    }
    const tags = loadTags();
    tags[req.params.id] = req.body.tags.map(function(t) { return String(t).trim().toLowerCase(); }).filter(Boolean);
    saveTags(tags);
    res.json({ tags: tags[req.params.id] });
  } catch (err) {
    console.error('[TAGS POST ERROR]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/collections — all collections with podcast count
app.get('/api/collections', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('collections')
      .select(`
        id, name, description, cover_image_url, is_public, created_at, updated_at,
        podcast_count:collection_podcasts(count)
      `)
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });

    // Calculate total listening time from episodes in these collections
    const { count: totalEpisodes } = await supabase
      .from('episodes')
      .select('id', { count: 'exact', head: true });

    res.json({
      items: (data || []).map(c => ({
        ...c,
        podcast_count: c.podcast_count?.[0]?.count || 0,
      })),
      stats: {
        total: (data || []).length,
        totalEpisodes: totalEpisodes || 0,
      },
    });
  } catch (err) {
    console.error('[COLLECTIONS ERROR]', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/collections — create collection
app.post('/api/collections', authMiddleware, async (req, res) => {
  try {
    const { name, description, cover_image_url, is_public } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Collection name is required' });

    const { data, error } = await supabase
      .from('collections')
      .insert({ name: name.trim(), description: description || '', cover_image_url: cover_image_url || null, is_public: is_public !== false })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data);
  } catch (err) {
    console.error('[COLLECTION CREATE ERROR]', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/collections/:id — update collection
app.put('/api/collections/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const allowed = ['name', 'description', 'cover_image_url', 'is_public'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No valid fields to update' });

    const { data, error } = await supabase
      .from('collections')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'Collection not found' });
    res.json(data);
  } catch (err) {
    console.error('[COLLECTION UPDATE ERROR]', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/collections/:id — delete collection
app.delete('/api/collections/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    // Remove all podcast associations first
    await supabase.from('collection_podcasts').delete().eq('collection_id', id);

    const { error } = await supabase.from('collections').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  } catch (err) {
    console.error('[COLLECTION DELETE ERROR]', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/collections/:id/podcasts — podcasts in a collection
app.get('/api/collections/:id/podcasts', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('collection_podcasts')
      .select('podcast_id, podcasts!inner(id, title, author, image_url, description)')
      .eq('collection_id', id);

    if (error) return res.status(500).json({ error: error.message });
    res.json(data ? data.map(cp => cp.podcasts) : []);
  } catch (err) {
    console.error('[COLLECTION PODCASTS ERROR]', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/collections/:id/podcasts — add podcast to collection
app.post('/api/collections/:id/podcasts', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { podcast_id } = req.body;
    if (!podcast_id) return res.status(400).json({ error: 'podcast_id is required' });

    const { error } = await supabase
      .from('collection_podcasts')
      .insert({ collection_id: id, podcast_id });

    if (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'Podcast already in collection' });
      return res.status(500).json({ error: error.message });
    }
    res.status(201).json({ success: true });
  } catch (err) {
    console.error('[COLLECTION ADD PODCAST ERROR]', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/collections/:id/podcasts/:podcastId — remove podcast from collection
app.delete('/api/collections/:id/podcasts/:podcastId', authMiddleware, async (req, res) => {
  try {
    const { id, podcastId } = req.params;
    const { error } = await supabase
      .from('collection_podcasts')
      .delete()
      .eq('collection_id', id)
      .eq('podcast_id', podcastId);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  } catch (err) {
    console.error('[COLLECTION REMOVE PODCAST ERROR]', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/categories
app.get('/api/categories', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (err) {
    console.error('[CATEGORIES ERROR]', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/editors — list editor accounts (from user_roles)
app.get('/api/editors', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('id, role')
      .in('role', ['Editor', 'Admin'])
      .order('role', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });

    // Get emails from auth for each editor (we can't directly query auth.users via anon key)
    // Return what we have from user_roles
    res.json((data || []).map(e => ({
      id: e.id,
      role: e.role,
      // email is included in the JWT token on login, not exposed here
    })));
  } catch (err) {
    console.error('[EDITORS ERROR]', err);
    res.status(500).json({ error: err.message });
  }
});


// ---------------------------------------------------------------------------
// Editorial MongoDB Routes — requires authMiddleware
// ---------------------------------------------------------------------------

// GET /api/editor/stats — editorial dashboard metrics
app.get('/api/editor/stats', authMiddleware, async (req, res) => {
  try {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const [totalActions, publishedThisWeek, recentActions] = await Promise.all([
      EditorialAction.countDocuments(),
      EditorialAction.countDocuments({
        action: 'published',
        timestamp: { $gte: startOfWeek },
      }),
      EditorialAction.find()
        .sort({ timestamp: -1 })
        .limit(5)
        .lean(),
    ]);

    res.json({
      totalActions,
      publishedThisWeek,
      recentActions,
    });
  } catch (err) {
    console.error('[EDITOR STATS ERROR]', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/editor/episodes/:id/status
app.put('/api/editor/episodes/:id/status', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { status, notes } = req.body;

  if (!['published', 'draft', 'hidden'].includes(status)) {
    return res.status(400).json({ error: 'Status must be: published, draft, or hidden' });
  }

  try {
    // 1. Get current episode from Supabase
    const { data: episode, error: fetchError } = await supabase
      .from('episodes')
      .select('id, title, status, podcast_id')
      .eq('id', id)
      .single();

    if (fetchError || !episode) {
      return res.status(404).json({ error: 'Episode not found' });
    }

    const previousStatus = episode.status;

    // 2. Update Supabase
    const updateData = { status };
    if (status === 'published') updateData.published_at = new Date().toISOString();
    updateData.updated_at = new Date().toISOString();

    const { error: updateError } = await supabase
      .from('episodes')
      .update(updateData)
      .eq('id', id);

    if (updateError) throw updateError;

    // 3. Log to MongoDB
    const actionLabels = { published: 'published', draft: 'drafted', hidden: 'hidden' };
    await EditorialAction.create({
      episode_id: id,
      action: actionLabels[status],
      editor_id: req.editor.sub,
      editor_name: req.editor.email || 'Unknown',
      notes: notes || '',
      previous_status: previousStatus,
      new_status: status,
      episode_title: episode.title,
    });

    res.json({ success: true, status, previous_status: previousStatus });
  } catch (err) {
    console.error('[EPISODE STATUS ERROR]', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/editor/podcasts - list all podcasts with episode counts
app.get('/api/editor/podcasts', authMiddleware, async (req, res) => {
  try {
    const { search, featured, limit = 50, offset = 0 } = req.query;

    let query = supabase
      .from('podcasts')
      .select('*, episode_count:episodes(count)', { count: 'exact' });

    if (search) {
      query = query.or(`title.ilike.%${search}%,author.ilike.%${search}%,description.ilike.%${search}%`);
    }

    if (featured !== undefined) {
      query = query.eq('featured', featured === 'true');
    }

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (error) throw error;

    const items = (data || []).map(p => ({
      ...p,
      episode_count: p.episode_count?.[0]?.count || 0,
    }));

    res.json({ items, total: count || items.length });
  } catch (err) {
    console.error('[PODCASTS LIST ERROR]', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/editor/podcasts/:id
app.put('/api/editor/podcasts/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const allowed = ['title', 'author', 'description', 'language'];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  try {
    const { data: podcast, error: fetchError } = await supabase
      .from('podcasts')
      .select('id, title, author, description, language')
      .eq('id', id)
      .single();

    if (fetchError || !podcast) {
      return res.status(404).json({ error: 'Podcast not found' });
    }

    const { error: updateError } = await supabase
      .from('podcasts')
      .update(updates)
      .eq('id', id);

    if (updateError) throw updateError;

    await PodcastEdit.create({
      podcast_id: id,
      editor_id: req.editor.sub,
      editor_name: req.editor.email || 'Unknown',
      previous_values: {
        title: podcast.title,
        author: podcast.author,
        description: podcast.description,
        language: podcast.language,
      },
      new_values: updates,
    });

    res.json({ success: true, updated: updates });
  } catch (err) {
    console.error('[PODCAST EDIT ERROR]', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/editor/podcasts/:id/feature
app.post('/api/editor/podcasts/:id/feature', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { featured } = req.body;

  if (typeof featured !== 'boolean') {
    return res.status(400).json({ error: 'featured must be a boolean' });
  }

  try {
    const { data: podcast, error: fetchError } = await supabase
      .from('podcasts')
      .select('id, title, featured')
      .eq('id', id)
      .single();

    if (fetchError || !podcast) {
      return res.status(404).json({ error: 'Podcast not found' });
    }

    const { error: updateError } = await supabase
      .from('podcasts')
      .update({ featured })
      .eq('id', id);

    if (updateError) throw updateError;

    await EditorialAction.create({
      episode_id: id,
      action: featured ? 'featured' : 'unfeatured',
      editor_id: req.editor.sub,
      editor_name: req.editor.email || 'Unknown',
      podcast_title: podcast.title,
    });

    res.json({ success: true, featured });
  } catch (err) {
    console.error('[FEATURE ERROR]', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/editor/drafts/:id/publish
app.post('/api/editor/drafts/:id/publish', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { notes } = req.body;

  try {
    const { data: episode, error: fetchError } = await supabase
      .from('episodes')
      .select('id, title, status, podcast_id')
      .eq('id', id)
      .single();

    if (fetchError || !episode) {
      return res.status(404).json({ error: 'Episode not found' });
    }

    const { error: updateError } = await supabase
      .from('episodes')
      .update({
        status: 'published',
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) throw updateError;

    await EditorialAction.create({
      episode_id: id,
      action: 'published',
      editor_id: req.editor.sub,
      editor_name: req.editor.email || 'Unknown',
      notes: notes || '',
      previous_status: 'draft',
      new_status: 'published',
      episode_title: episode.title,
    });

    res.json({ success: true, message: `"${episode.title}" published` });
  } catch (err) {
    console.error('[PUBLISH DRAFT ERROR]', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/editor/episodes/:id/unpublish — revert a published episode back to draft
app.post('/api/editor/episodes/:id/unpublish', authMiddleware, async (req, res) => {
  const { id } = req.params;

  try {
    const { data: episode, error: fetchError } = await supabase
      .from('episodes')
      .select('id, title, status, podcast_id')
      .eq('id', id)
      .single();

    if (fetchError || !episode) {
      return res.status(404).json({ error: 'Episode not found' });
    }

    if (episode.status !== 'published') {
      return res.status(400).json({ error: 'Episode is not published' });
    }

    const { error: updateError } = await supabase
      .from('episodes')
      .update({
        status: 'draft',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) throw updateError;

    await EditorialAction.create({
      episode_id: id,
      action: 'drafted',
      editor_id: req.editor.sub,
      editor_name: req.editor.email || 'Unknown',
      notes: req.body.notes || '',
      previous_status: 'published',
      new_status: 'draft',
      episode_title: episode.title,
    });

    res.json({ success: true, message: `"${episode.title}" unpublished` });
  } catch (err) {
    console.error('[UNPUBLISH ERROR]', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/editor/episodes/:id — delete any episode by ID
app.delete('/api/editor/episodes/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;

  try {
    const { data: episode } = await supabase
      .from('episodes')
      .select('id, title')
      .eq('id', id)
      .single();

    if (!episode) {
      return res.status(404).json({ error: 'Episode not found' });
    }

    const { error: deleteError } = await supabase
      .from('episodes')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    await EditorialAction.create({
      episode_id: id,
      action: 'deleted',
      editor_id: req.editor.sub,
      editor_name: req.editor.email || 'Unknown',
      episode_title: episode.title,
    });

    res.json({ success: true });
  } catch (err) {
    console.error('[DELETE EPISODE ERROR]', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Static file serving
// ---------------------------------------------------------------------------
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
};

// Auth check middleware for HTML pages
function requireEditor(req, res, next) {
  // Allow login page and assets
  if (req.path === '/login.html' || req.path === '/login' || req.path.startsWith('/styles.css')) {
    return next();
  }
  // Check for token in query param, header, or cookie
  const token = req.query.token || req.headers['x-editor-token'];
  if (!token) {
    // Client-side will handle redirect — serve the page, JS will check auth
    return next();
  }
  try {
    jwt.verify(token, jwtSecret);
    req.editorAuthenticated = true;
  } catch {
    // Token invalid — still serve page, JS will handle
  }
  next();
}

app.use(requireEditor);
app.use(express.static(path.join(__dirname)));

// Clean URL mapping — strip .html from addresses
const cleanUrlMap = {
  '/': '/login.html',
  '/login': '/login.html',
  '/dashboard': '/dashboard.html',
  '/editorial-dashboard': '/editorial-dashboard.html',
  '/review-queue': '/review-queue.html',
  '/rich-editor': '/rich-editor.html',
  '/collections': '/collections.html',
  '/episodes': '/episodes.html',
  '/podcasts': '/podcasts.html',
  '/content-browser': '/content-browser.html',
  '/admin-settings': '/admin-settings.html',
};

// POST /api/editor/drafts/publish-all — bulk publish all drafts with optional podcast filter
app.post('/api/editor/drafts/publish-all', authMiddleware, async (req, res) => {
  try {
    const { podcast_id } = req.body;
    let query = supabase
      .from('episodes')
      .select('id, title')
      .eq('status', 'draft');

    if (podcast_id) query = query.eq('podcast_id', podcast_id);

    const { data: drafts, error: fetchError } = await query;

    if (fetchError) throw fetchError;
    if (!drafts || drafts.length === 0) {
      return res.json({ success: true, published: 0, message: 'No drafts to publish' });
    }

    const ids = drafts.map(d => d.id);

    const { error: updateError } = await supabase
      .from('episodes')
      .update({
        status: 'published',
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .in('id', ids);

    if (updateError) throw updateError;

    // Log to editorial history
    for (const ep of drafts) {
      try {
        await EditorialAction.create({
          episode_id: ep.id,
          action: 'published',
          editor_id: req.editor.sub,
          editor_name: req.editor.email || 'Unknown',
          notes: 'Bulk published (Publish All Drafts)',
          previous_status: 'draft',
          new_status: 'published',
          episode_title: ep.title,
        });
      } catch (_) { /* individual log failure non-fatal */ }
    }

    res.json({ success: true, published: drafts.length, message: `Published ${drafts.length} episode(s)` });
  } catch (err) {
    console.error('[PUBLISH ALL ERROR]', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Highlight Routes
// ---------------------------------------------------------------------------

// GET /api/episodes/:id/highlights — list highlights for an episode
app.get('/api/episodes/:id/highlights', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const data = await restQuery('GET', `highlights?episode_id=eq.${id}&order=start_time.asc`);
    res.json({ highlights: data || [] });
  } catch (err) {
    console.error('[HIGHLIGHTS LIST ERROR]', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/episodes/:id/highlights/detect — auto-detect 3 highlight clips
app.post('/api/episodes/:id/highlights/detect', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    // Get episode duration (use supabase JS client for reads)
    const { data: episode, error: epError } = await supabase
      .from('episodes')
      .select('duration, title')
      .eq('id', id)
      .single();
    if (epError) throw epError;
    if (!episode || !episode.duration) {
      return res.status(400).json({ error: 'Episode duration required. Set duration in episode settings.' });
    }

    // Check for existing pending highlights
    const existing = await restQuery('GET', `highlights?episode_id=eq.${id}&status=eq.pending&select=id`);
    if (existing && existing.length > 0) {
      return res.status(409).json({ error: 'Existing pending highlights. Handle them first.' });
    }

    const dur = episode.duration;
    const clips = [
      { start_time: Math.floor(dur * 0.10), end_time: Math.min(Math.floor(dur * 0.10) + 60, Math.floor(dur * 0.25)), title: 'Opening Moments' },
      { start_time: Math.floor(dur * 0.35), end_time: Math.min(Math.floor(dur * 0.35) + 60, Math.floor(dur * 0.55)), title: 'Key Discussion' },
      { start_time: Math.floor(dur * 0.70), end_time: Math.min(Math.floor(dur * 0.70) + 60, Math.floor(dur * 0.85)), title: 'Closing Thoughts' }
    ];

    const inserts = clips.map(c => ({
      episode_id: id,
      start_time: c.start_time,
      end_time: c.end_time,
      title: c.title,
      status: 'pending'
    }));

    const data = await restQuery('POST', 'highlights', inserts);
    res.status(201).json({ highlights: data, message: `3 highlights generated` });
  } catch (err) {
    console.error('[HIGHLIGHTS DETECT ERROR]', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/highlights/:id — update a highlight
app.put('/api/highlights/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, tags, start_time, end_time, status } = req.body;
    const updates = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (tags !== undefined) updates.tags = tags;
    if (start_time !== undefined) updates.start_time = start_time;
    if (end_time !== undefined) updates.end_time = end_time;
    if (status !== undefined) updates.status = status;
    updates.updated_at = new Date().toISOString();

    const data = await restQuery('PATCH', `highlights?id=eq.${id}`, updates);
    if (data && data.length > 0) {
      res.json({ highlight: data[0] });
    } else {
      res.json({ highlight: null });
    }
  } catch (err) {
    console.error('[HIGHLIGHTS UPDATE ERROR]', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/highlights/:id — delete a highlight
app.delete('/api/highlights/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    await restQuery('DELETE', `highlights?id=eq.${id}`);
    res.json({ success: true });
  } catch (err) {
    console.error('[HIGHLIGHTS DELETE ERROR]', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/highlights/:id/approve — approve a highlight
app.post('/api/highlights/:id/approve', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const data = await restQuery('PATCH', `highlights?id=eq.${id}`, { status: 'accepted', updated_at: new Date().toISOString() });
    if (data && data.length > 0) {
      res.json({ highlight: data[0] });
    } else {
      res.json({ highlight: null });
    }
  } catch (err) {
    console.error('[HIGHLIGHTS APPROVE ERROR]', err);
    res.status(500).json({ error: err.message });
  }
});

app.get(Object.keys(cleanUrlMap), (req, res) => {
  const filePath = path.join(__dirname, cleanUrlMap[req.path]);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send('<h1>404 Not Found</h1>');
  }
});

// ---------------------------------------------------------------------------
// Global error handler
// ---------------------------------------------------------------------------
app.use((err, req, res, _next) => {
  console.error('[SERVER ERROR]', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
async function startServer() {
  // Validate that the editor credentials can log in
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: EDITOR_EMAIL,
      password: EDITOR_PASSWORD,
    });

    if (error || !data.user) {
      console.log(`⚠️  Default editor login check failed: ${error?.message || 'unknown error'}`);
      console.log(`   Make sure '${EDITOR_EMAIL}' exists in Supabase Auth with role='Editor' in user_roles.`);
      console.log(`   Run: node seed.js`);
    } else {
      // Check role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      if (roleData && (roleData.role === 'Editor' || roleData.role === 'Admin')) {
        console.log(`✅ Editor auth validated: ${EDITOR_EMAIL} (${roleData.role})`);
      } else {
        console.log(`⚠️  ${EDITOR_EMAIL} exists but lacks Editor role in user_roles`);
      }

      // Sign out the startup check session
      await supabase.auth.signOut();
    }
  } catch (err) {
    console.log(`⚠️  Editor auth check skipped: ${err.message}`);
  }

  // Attempt MongoDB connection
  if (process.env.MONGODB_URI) {
    mongoose.connect(process.env.MONGODB_URI)
      .then(() => console.log('✅ Connected to MongoDB'))
      .catch(err => console.log(`⚠️  MongoDB connection failed: ${err.message} — editorial history features disabled`));
  } else {
    console.log('⚠️  MONGODB_URI not set — MongoDB features disabled');
  }

  app.listen(PORT, () => {
    console.log('=============================================');
    console.log('  Soundwave Editor Server');
    console.log(`  Running on: http://localhost:${PORT}`);
    console.log('  Press CTRL+C to stop');
    console.log('=============================================');
  });
}

startServer();
