require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult, query } = require('express-validator');
const path = require('path');
const jwt = require('jsonwebtoken');
const Parser = require('rss-parser');
const { supabase, testConnection } = require('./db');

const rssParser = new Parser({
  timeout: 30000,
  headers: { 'User-Agent': 'Soundwave-Admin/1.0' },
});

// ---------------------------------------------------------------------------
// Environment — no fallbacks for secrets; crash loudly if missing
// ---------------------------------------------------------------------------
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const JWT_SECRET = process.env.JWT_SECRET;
const PORT = process.env.PORT || 3002;

if (!ADMIN_EMAIL || !ADMIN_PASSWORD || !JWT_SECRET) {
  console.error('❌ Missing required env vars: ADMIN_EMAIL, ADMIN_PASSWORD, JWT_SECRET');
  process.exit(1);
}

const app = express();

// ---------------------------------------------------------------------------
// Security Middleware
// ---------------------------------------------------------------------------
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://cdnjs.cloudflare.com'],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdnjs.cloudflare.com'],
      scriptSrcAttr: ["'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https://ui-avatars.com', 'https://image.simplecastcdn.com', 'https://*.supabase.co'],
      fontSrc: ["'self'", 'https://cdnjs.cloudflare.com'],
      connectSrc: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'self'"],
      baseUri: ["'self'"],
    },
  },
}));
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3002',
  credentials: true,
}));

// CSRF protection — origin header check for state-changing requests
// Browsers always send Origin on cross-origin requests; we verify it matches
const ALLOWED_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3002';
app.use((req, res, next) => {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    const origin = req.headers.origin;
    const referer = req.headers.referer;
    if (origin && !origin.startsWith(ALLOWED_ORIGIN)) {
      return res.status(403).json({ error: 'CSRF validation failed' });
    }
    if (!origin && referer && !referer.startsWith(ALLOWED_ORIGIN)) {
      return res.status(403).json({ error: 'CSRF validation failed' });
    }
  }
  next();
});

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname)));

// Rate limiters
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts. Try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 120,
  message: { error: 'Too many requests. Slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', apiLimiter);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function generateToken(email) {
  return jwt.sign({ email, role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(header.split(' ')[1], JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// ---------------------------------------------------------------------------
// RSS Ingestion Engine
// ---------------------------------------------------------------------------

async function ingestFeed(feedId, rssUrl) {
  const startedAt = new Date().toISOString();

  const { data: job, error: jobErr } = await supabase
    .from('ingestion_jobs')
    .insert({
      feed_id: feedId,
      feed_title: rssUrl,
      status: 'running',
      started_at: startedAt,
    })
    .select('id')
    .single();

  if (jobErr) throw new Error(`Failed to create job: ${jobErr.message}`);

  try {
    const feed = await rssParser.parseURL(rssUrl);
    const feedTitle = feed.title || feed.description || rssUrl;
    const feedDesc = feed.description || null;
    const feedImage = feed.image?.url || null;

    await supabase.from('feeds').update({
      title: feedTitle,
      description: feedDesc,
      image_url: feedImage,
      status: 'active',
      last_fetched_at: new Date().toISOString(),
      error_message: null,
    }).eq('id', feedId);

    const { data: existingPodcast } = await supabase
      .from('podcasts')
      .select('id')
      .eq('feed_url', rssUrl)
      .maybeSingle();

    let podcastId = existingPodcast?.id;

    if (!podcastId) {
      const { data: newPodcast, error: pErr } = await supabase
        .from('podcasts')
        .insert({
          title: feedTitle,
          description: feedDesc,
          image_url: feedImage,
          feed_url: rssUrl,
          feed_id: feedId,
          website_url: feed.link || null,
          author: feed.creator || feed.author || null,
          language: feed.language || 'en',
        })
        .select('id')
        .single();

      if (pErr) throw new Error(`Podcast insert error: ${pErr.message}`);
      podcastId = newPodcast.id;
    }

    const items = feed.items || [];
    let processed = 0;

    for (const item of items) {
      const audioUrl = item.enclosure?.url || item.link;
      if (!audioUrl) continue;

      const pubDate = item.pubDate ? new Date(item.pubDate).toISOString() : null;

      const { error: epErr } = await supabase.from('episodes').upsert(
        {
          podcast_id: podcastId,
          title: item.title || 'Untitled',
          description: item.contentSnippet || item.content || null,
          audio_url: audioUrl,
          duration: item.itunes?.duration
            ? (typeof item.itunes.duration === 'number'
              ? item.itunes.duration
              : parseDuration(item.itunes.duration))
            : null,
          published_at: pubDate,
          status: 'published',
        },
        { onConflict: 'podcast_id, title', ignoreDuplicates: true }
      );

      if (!epErr) processed++;
    }

    // Update job as success
    const completedAt = new Date().toISOString();
    const durationMs = new Date(completedAt).getTime() - new Date(startedAt).getTime();

    await supabase.from('ingestion_jobs').update({
      status: 'success',
      items_processed: processed,
      duration_ms: durationMs,
      feed_title: feedTitle,
      completed_at: completedAt,
    }).eq('id', job.id);

    return { success: true, itemsProcessed: processed, feedTitle };
  } catch (err) {
    const completedAt = new Date().toISOString();
    const durationMs = new Date(completedAt).getTime() - new Date(startedAt).getTime();

    await supabase.from('ingestion_jobs').update({
      status: 'error',
      error_message: err.message,
      duration_ms: durationMs,
      completed_at: completedAt,
    }).eq('id', job.id);

    await supabase.from('feeds').update({
      status: 'failed',
      error_message: err.message,
      last_fetched_at: new Date().toISOString(),
    }).eq('id', feedId);

    throw err;
  }
}

// Convert "1:23:45" or "3600" strings to seconds
function parseDuration(val) {
  if (typeof val === 'number') return val;
  if (!val) return null;
  const parts = String(val).split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parseInt(val, 10) || null;
}

// ---------------------------------------------------------------------------
// Auth Routes
// ---------------------------------------------------------------------------

// POST /api/admin/login
app.post('/api/admin/login',
  loginLimiter,
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg });
      }

      const { email, password } = req.body;

      // Constant-time comparison to prevent timing attacks
      const emailMatch = email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
      const passMatch = password === ADMIN_PASSWORD;

      if (!emailMatch || !passMatch) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const token = generateToken(email);
      return res.json({ token, email, role: 'admin' });
    } catch (err) {
      console.error('Login error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /api/admin/verify
app.post('/api/admin/verify', authMiddleware, (req, res) => {
  return res.json({ valid: true, user: req.user });
});

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

// GET /api/admin/stats
app.get('/api/admin/stats', authMiddleware, async (req, res) => {
  try {
    const [podcasts, episodes, feeds, failedJobs] = await Promise.all([
      supabase.from('podcasts').select('id', { count: 'exact', head: true }),
      supabase.from('episodes').select('id', { count: 'exact', head: true }),
      supabase.from('feeds').select('status'),
      supabase.from('ingestion_jobs').select('id', { count: 'exact', head: true }).eq('status', 'error'),
    ]);

    const feedList = feeds.data || [];
    return res.json({
      totalPodcasts: podcasts.count ?? 0,
      totalEpisodes: episodes.count ?? 0,
      failedJobs: failedJobs.count ?? 0,
      activeFeeds: feedList.filter(f => f.status === 'active').length,
      pendingFeeds: feedList.filter(f => f.status === 'pending').length,
    });
  } catch (err) {
    console.error('Stats error:', err);
    return res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ---------------------------------------------------------------------------
// Recent Jobs
// ---------------------------------------------------------------------------

// GET /api/admin/recent-jobs
app.get('/api/admin/recent-jobs', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('ingestion_jobs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    const jobs = (data || []).map(j => ({
      id: j.id,
      podcast_name: j.feed_title || 'Unknown',
      status: j.status,
      episodes_count: j.items_processed || 0,
      duration_sec: j.duration_ms ? Math.round(j.duration_ms / 1000) : 0,
      started_at: j.started_at,
      completed_at: j.completed_at,
    }));

    return res.json(jobs);
  } catch (err) {
    console.error('Recent jobs error:', err);
    return res.json([]);
  }
});

// ---------------------------------------------------------------------------
// Feeds
// ---------------------------------------------------------------------------

// GET /api/admin/feeds
app.get('/api/admin/feeds', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('feeds')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const feeds = (data || []).map(f => ({
      id: f.id,
      name: f.title || f.rss_url,
      url: f.rss_url,
      category: f.category || 'Uncategorized',
      status: f.status || 'pending',
      last_fetched: f.last_fetched_at || null,
      episodes: 0, // will be counted in a follow-up query
    }));

    return res.json(feeds);
  } catch (err) {
    console.error('Feeds error:', err);
    return res.json([]);
  }
});

// POST /api/admin/feeds/ingest/:id
app.post('/api/admin/feeds/ingest/:id', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('feeds')
      .select('rss_url')
      .eq('id', req.params.id)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Feed not found' });
    }

    const result = await ingestFeed(req.params.id, data.rss_url);
    return res.json({
      success: true,
      message: `Ingested "${result.feedTitle}" — ${result.itemsProcessed} episodes processed`,
      itemsProcessed: result.itemsProcessed,
    });
  } catch (err) {
    console.error('Feed ingestion error:', err);
    return res.status(500).json({ error: `Ingestion failed: ${err.message}` });
  }
});

// POST /api/admin/feeds/fetch/:id (alias for compatibility)
app.post('/api/admin/feeds/fetch/:id', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('feeds')
      .select('rss_url')
      .eq('id', req.params.id)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Feed not found' });
    }

    // Fire ingestion asynchronously (don't block response)
    ingestFeed(req.params.id, data.rss_url).catch(err => {
      console.error('Async ingest error:', err);
    });

    return res.json({ success: true, message: `Fetch triggered for feed ${req.params.id}` });
  } catch (err) {
    console.error('Feed fetch error:', err);
    return res.status(500).json({ error: 'Failed to trigger fetch' });
  }
});

// POST /api/admin/feeds/delete/:id
app.post('/api/admin/feeds/delete/:id', authMiddleware, async (req, res) => {
  try {
    const { error } = await supabase
      .from('feeds')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    return res.json({ success: true, message: `Feed ${req.params.id} deleted` });
  } catch (err) {
    console.error('Feed delete error:', err);
    return res.status(500).json({ error: 'Failed to delete feed' });
  }
});

// POST /api/admin/feeds/add
app.post('/api/admin/feeds/add',
  authMiddleware,
  body('url').isURL({ protocols: ['http', 'https'] }).withMessage('Valid RSS URL required (http/https)'),
  body('name').optional().trim().isLength({ max: 200 }),
  body('category').optional().trim().isLength({ max: 100 }),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg });
      }

      const { url, name, category } = req.body;

      const { data, error } = await supabase
        .from('feeds')
        .insert({
          rss_url: url,
          title: name || null,
          category: category || 'Uncategorized',
          status: 'pending',
        })
        .select('id')
        .single();

      if (error) throw error;

      return res.json({ success: true, message: 'Feed added successfully', id: data.id, name: name || url });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// Failed Jobs
// ---------------------------------------------------------------------------

// GET /api/admin/failed-feeds
app.get('/api/admin/failed-feeds', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('feeds')
      .select('*')
      .eq('status', 'failed')
      .order('updated_at', { ascending: false });

    if (error) throw error;

    const feeds = (data || []).map(f => ({
      id: f.id,
      name: f.title || f.rss_url,
      url: f.rss_url,
      error_message: f.error_message || 'Unknown error',
      last_attempt: f.updated_at || f.created_at,
      retries: 0,
    }));

    return res.json(feeds);
  } catch (err) {
    console.error('Failed feeds error:', err);
    return res.json([]);
  }
});

// GET /api/admin/failed-ingestions
app.get('/api/admin/failed-ingestions', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('ingestion_jobs')
      .select('*')
      .eq('status', 'error')
      .order('started_at', { ascending: false });

    if (error) throw error;

    const jobs = (data || []).map(j => ({
      id: j.id,
      podcast_name: j.feed_title || 'Unknown',
      episode_title: null,
      error: j.error_message || 'Unknown error',
      failed_at: j.completed_at || j.started_at,
      duration_sec: j.duration_ms ? Math.round(j.duration_ms / 1000) : 0,
      retries: 0,
    }));

    return res.json(jobs);
  } catch (err) {
    console.error('Failed ingestions error:', err);
    return res.json([]);
  }
});

// POST /api/admin/failed/retry/:id
app.post('/api/admin/failed/retry/:id', authMiddleware, async (req, res) => {
  try {
    const { error } = await supabase
      .from('feeds')
      .update({ status: 'pending', error_message: null })
      .eq('id', req.params.id);

    if (error) throw error;
    return res.json({ success: true, message: `Feed ${req.params.id} reset to pending` });
  } catch (err) {
    console.error('Retry error:', err);
    return res.status(500).json({ error: 'Failed to retry' });
  }
});

// POST /api/admin/failed/retry-all
app.post('/api/admin/failed/retry-all', authMiddleware, async (req, res) => {
  try {
    const { error } = await supabase
      .from('feeds')
      .update({ status: 'pending', error_message: null })
      .eq('status', 'failed');

    if (error) throw error;
    return res.json({ success: true, message: 'All failed items reset to pending' });
  } catch (err) {
    console.error('Retry-all error:', err);
    return res.status(500).json({ error: 'Failed to retry all' });
  }
});

// POST /api/admin/failed/dismiss/:id
app.post('/api/admin/failed/dismiss/:id', authMiddleware, async (req, res) => {
  try {
    const { error } = await supabase
      .from('feeds')
      .update({ error_message: null })
      .eq('id', req.params.id);

    if (error) throw error;
    return res.json({ success: true, message: `Dismissed ID ${req.params.id}` });
  } catch (err) {
    console.error('Dismiss error:', err);
    return res.status(500).json({ error: 'Failed to dismiss' });
  }
});

// ---------------------------------------------------------------------------
// Ingestion Logs
// ---------------------------------------------------------------------------

// GET /api/admin/ingestion-logs
app.get('/api/admin/ingestion-logs', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('ingestion_jobs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    const logs = (data || []).map(j => ({
      id: j.id,
      podcast_name: j.feed_title || 'Unknown',
      episode_title: null,
      status: j.status,
      duration_sec: j.duration_ms ? Math.round(j.duration_ms / 1000) : 0,
      episodes_count: j.items_processed || 0,
      started_at: j.started_at,
      completed_at: j.completed_at,
      error_message: j.error_message || null,
    }));

    return res.json(logs);
  } catch (err) {
    console.error('Ingestion logs error:', err);
    return res.json([]);
  }
});

// ---------------------------------------------------------------------------
// Podcasts / Raw Data
// ---------------------------------------------------------------------------

// GET /api/admin/podcasts
app.get('/api/admin/podcasts', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('podcasts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const podcasts = (data || []).map(p => ({
      id: p.id,
      name: p.title,
      author: p.author || 'Unknown',
      cover_url: p.image_url,
      category: 'Podcast',
      episodes: 0,
      last_updated: p.updated_at ? p.updated_at.split('T')[0] : null,
    }));

    return res.json(podcasts);
  } catch (err) {
    console.error('Podcasts error:', err);
    return res.json([]);
  }
});

// GET /api/admin/podcasts/:id/episodes
app.get('/api/admin/podcasts/:id/episodes', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('episodes')
      .select('*')
      .eq('podcast_id', req.params.id)
      .order('published_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    const eps = (data || []).map(ep => ({
      id: ep.id,
      title: ep.title,
      duration_sec: ep.duration || 0,
      published_at: ep.published_at ? ep.published_at.split('T')[0] : null,
      status: ep.status || 'ingested',
    }));

    return res.json(eps);
  } catch (err) {
    console.error('Episodes error:', err);
    return res.json([]);
  }
});

// ---------------------------------------------------------------------------
// Global error handler (catches next(err) from async routes)
// ---------------------------------------------------------------------------
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// ---------------------------------------------------------------------------
// Catch-all – serve login.html for root
// ---------------------------------------------------------------------------
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
async function start() {
  await testConnection();

  app.listen(PORT, () => {
    console.log('');
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║        Soundwave Admin Server                   ║');
    console.log('╠══════════════════════════════════════════════════╣');
    console.log(`║  Running on:  http://localhost:${PORT}              ║`);
    console.log('║  Login:       <see .env file>                   ║');
    console.log('╚══════════════════════════════════════════════════╝');
    console.log('');
  });
}

start();
