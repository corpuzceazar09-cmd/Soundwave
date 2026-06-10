const express = require('express');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const cors = require('cors');
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

const supabase = createClient(supabaseUrl, supabaseKey);

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

app.use(cors());
app.use(express.json());

// ---------------------------------------------------------------------------
// JWT helpers
// ---------------------------------------------------------------------------
function generateToken(payload) {
  return jwt.sign(payload, jwtSecret, { expiresIn: '12h' });
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], jwtSecret);
    req.editor = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

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

// GET /api/review-queue — pending highlights with episode/podcast info
app.get('/api/review-queue', authMiddleware, async (req, res) => {
  try {
    const status = req.query.status || 'pending';
    const { data, error } = await supabase
      .from('highlights')
      .select(`
        id, title, description, start_time, end_time, tags, status, created_at,
        episode_id!inner (
          id, title, duration, published_at,
          podcast_id!inner (
            id, title, image_url, author
          )
        )
      `)
      .eq('status', status)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) return res.status(500).json({ error: error.message });

    const { count: totalPending } = await supabase
      .from('highlights')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending');

    const { count: inReview } = await supabase
      .from('highlights')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'accepted');

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

// PUT /api/review-queue/:id — approve or reject a highlight
app.put('/api/review-queue/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['accepted', 'rejected', 'pending'].includes(status)) {
    return res.status(400).json({ error: 'Status must be: accepted, rejected, or pending' });
  }

  try {
    const { data, error } = await supabase
      .from('highlights')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'Highlight not found' });

    res.json(data);
  } catch (err) {
    console.error('[REVIEW UPDATE ERROR]', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/episodes — all episodes with podcast info
app.get('/api/episodes', authMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const offset = (page - 1) * limit;

    const { data, error, count } = await supabase
      .from('episodes')
      .select(`
        id, title, description, audio_url, duration, episode_number, season_number,
        status, published_at, created_at,
        podcast_id!inner (
          id, title, image_url, author
        )
      `, { count: 'exact' })
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
  const allowed = ['title', 'description', 'status', 'episode_number', 'season_number', 'duration'];
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

// DELETE /api/editor/drafts/:id
app.delete('/api/editor/drafts/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;

  try {
    const { data: episode } = await supabase
      .from('episodes')
      .select('id, title')
      .eq('id', id)
      .single();

    const { error: deleteError } = await supabase
      .from('episodes')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    if (episode) {
      await EditorialAction.create({
        episode_id: id,
        action: 'deleted',
        editor_id: req.editor.sub,
        editor_name: req.editor.email || 'Unknown',
        episode_title: episode.title,
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[DELETE DRAFT ERROR]', err);
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
  '/content-browser': '/content-browser.html',
  '/admin-settings': '/admin-settings.html',
};

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

  app.listen(PORT, () => {
    console.log('=============================================');
    console.log('  Soundwave Editor Server');
    console.log(`  Running on: http://localhost:${PORT}`);
    console.log('  Login: editor@soundwave.com / editor123');
    console.log('  Press CTRL+C to stop');
    console.log('=============================================');
  });
}

startServer();
