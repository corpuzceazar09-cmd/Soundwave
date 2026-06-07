require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { supabase, testConnection } = require('./db');

const app = express();
const PORT = process.env.PORT || 3002;
const JWT_SECRET = process.env.JWT_SECRET || 'soundwave-admin-secret-key-2026';

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@soundwave.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

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
// Auth Routes
// ---------------------------------------------------------------------------

// POST /api/admin/login
app.post('/api/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(email);
    return res.json({ token, email, role: 'admin' });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

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
    // Try Supabase first
    if (supabase) {
      const { data: podcasts, error: pErr } = await supabase
        .from('podcasts').select('id', { count: 'exact', head: true });
      const { data: episodes, error: eErr } = await supabase
        .from('episodes').select('id', { count: 'exact', head: true });

      if (!pErr && !eErr) {
        return res.json({
          totalPodcasts: podcasts?.length ?? 0,
          totalEpisodes: episodes?.length ?? 0,
          failedJobs: 0,
          activeFeeds: 0,
          pendingFeeds: 0
        });
      }
    }

    // Fallback mock
    return res.json({
      totalPodcasts: 156,
      totalEpisodes: 3421,
      failedJobs: 23,
      activeFeeds: 45,
      pendingFeeds: 12
    });
  } catch (err) {
    return res.json({
      totalPodcasts: 156,
      totalEpisodes: 3421,
      failedJobs: 23,
      activeFeeds: 45,
      pendingFeeds: 12
    });
  }
});

// ---------------------------------------------------------------------------
// Recent Jobs
// ---------------------------------------------------------------------------

// GET /api/admin/recent-jobs
app.get('/api/admin/recent-jobs', authMiddleware, (req, res) => {
  const jobs = [
    { id: 1, podcast_name: 'Tech Frontier', status: 'success', episodes_count: 3, duration_sec: 45, started_at: '2026-06-07T09:15:00Z', completed_at: '2026-06-07T09:15:45Z' },
    { id: 2, podcast_name: 'Deep Dives', status: 'success', episodes_count: 2, duration_sec: 32, started_at: '2026-06-07T09:00:00Z', completed_at: '2026-06-07T09:00:32Z' },
    { id: 3, podcast_name: 'Code & Coffee', status: 'error', episodes_count: 0, duration_sec: 12, started_at: '2026-06-07T08:45:00Z', completed_at: null },
    { id: 4, podcast_name: 'AI Revolution', status: 'running', episodes_count: 1, duration_sec: 0, started_at: '2026-06-07T10:00:00Z', completed_at: null },
    { id: 5, podcast_name: 'Data Driven Weekly', status: 'success', episodes_count: 5, duration_sec: 78, started_at: '2026-06-07T08:00:00Z', completed_at: '2026-06-07T08:01:18Z' },
    { id: 6, podcast_name: 'Laugh Track', status: 'success', episodes_count: 4, duration_sec: 55, started_at: '2026-06-07T07:30:00Z', completed_at: '2026-06-07T07:30:55Z' },
    { id: 7, podcast_name: 'Soundwave Sessions', status: 'error', episodes_count: 0, duration_sec: 300, started_at: '2026-06-07T06:00:00Z', completed_at: null },
    { id: 8, podcast_name: 'EduCast', status: 'success', episodes_count: 1, duration_sec: 22, started_at: '2026-06-07T05:30:00Z', completed_at: '2026-06-07T05:30:22Z' },
    { id: 9, podcast_name: 'Game On', status: 'running', episodes_count: 0, duration_sec: 0, started_at: '2026-06-07T10:15:00Z', completed_at: null },
    { id: 10, podcast_name: 'Tech Frontier', status: 'success', episodes_count: 2, duration_sec: 38, started_at: '2026-06-07T04:00:00Z', completed_at: '2026-06-07T04:00:38Z' }
  ];
  return res.json(jobs);
});

// ---------------------------------------------------------------------------
// Feeds
// ---------------------------------------------------------------------------

// GET /api/admin/feeds
app.get('/api/admin/feeds', authMiddleware, (req, res) => {
  const feeds = [
    { id: 1, name: 'Tech Frontier Daily', url: 'https://techfrontier.com/rss', category: 'Technology', status: 'active', last_fetched: '2026-06-07 09:15', episodes: 342 },
    { id: 2, name: 'Deep Dives Podcast', url: 'https://deepdives.fm/feed.xml', category: 'Science', status: 'active', last_fetched: '2026-06-07 08:45', episodes: 156 },
    { id: 3, name: 'Code & Coffee', url: 'https://codeandcoffee.dev/rss', category: 'Technology', status: 'active', last_fetched: '2026-06-07 09:00', episodes: 210 },
    { id: 4, name: 'Startup Stories', url: 'https://startupstories.co/feed', category: 'Business', status: 'failed', last_fetched: '2026-06-06 14:30', episodes: 89 },
    { id: 5, name: 'Data Driven Weekly', url: 'https://datadriven.io/episodes/rss', category: 'Science', status: 'active', last_fetched: '2026-06-07 07:30', episodes: 278 },
    { id: 6, name: 'AI Revolution', url: 'https://airevolution.ai/rss.xml', category: 'Technology', status: 'active', last_fetched: '2026-06-07 09:10', episodes: 195 },
    { id: 7, name: 'The Creative Block', url: 'https://creativeblock.show/rss', category: 'Arts', status: 'pending', last_fetched: null, episodes: 0 },
    { id: 8, name: 'Laugh Track', url: 'https://laughtrackpod.com/feed', category: 'Comedy', status: 'active', last_fetched: '2026-06-07 06:00', episodes: 412 },
    { id: 9, name: 'EduCast', url: 'https://educast.org/rss', category: 'Education', status: 'failed', last_fetched: '2026-06-05 22:00', episodes: 67 },
    { id: 10, name: 'Soundwave Sessions', url: 'https://soundwave.fm/feed', category: 'Music', status: 'active', last_fetched: '2026-06-07 08:00', episodes: 520 },
    { id: 11, name: 'Health & Wellness Hub', url: 'https://hwhub.com/podcast.xml', category: 'Science', status: 'pending', last_fetched: null, episodes: 0 },
    { id: 12, name: 'Game On Podcast', url: 'https://gameon.gg/feed', category: 'Technology', status: 'active', last_fetched: '2026-06-07 05:30', episodes: 634 }
  ];
  return res.json(feeds);
});

// POST /api/admin/feeds/fetch/:id
app.post('/api/admin/feeds/fetch/:id', authMiddleware, (req, res) => {
  return res.json({ success: true, message: `Feed fetch triggered for ID ${req.params.id}` });
});

// POST /api/admin/feeds/delete/:id
app.post('/api/admin/feeds/delete/:id', authMiddleware, (req, res) => {
  return res.json({ success: true, message: `Feed ID ${req.params.id} deleted` });
});

// POST /api/admin/feeds/add
app.post('/api/admin/feeds/add', authMiddleware, (req, res) => {
  const { url, name, category, interval } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }
  const newId = Math.floor(Math.random() * 10000) + 100;
  return res.json({ success: true, message: 'Feed added successfully', id: newId, name: name || url });
});

// ---------------------------------------------------------------------------
// Failed Jobs
// ---------------------------------------------------------------------------

// GET /api/admin/failed-feeds
app.get('/api/admin/failed-feeds', authMiddleware, (req, res) => {
  const feeds = [
    { id: 1, name: 'Startup Stories', url: 'https://startupstories.co/feed', error_message: 'Connection timeout after 30s', last_attempt: '2026-06-07 08:30:00', retries: 3 },
    { id: 2, name: 'EduCast', url: 'https://educast.org/rss', error_message: 'HTTP 404 - Feed not found', last_attempt: '2026-06-06 22:00:00', retries: 5 },
    { id: 3, name: 'DevOps Decoded', url: 'https://devopsdecoded.io/feed.xml', error_message: 'Invalid RSS XML - missing channel title', last_attempt: '2026-06-06 18:15:00', retries: 2 },
    { id: 4, name: 'The Crypto Corner', url: 'https://cryptocorner.xyz/rss', error_message: 'SSL certificate expired', last_attempt: '2026-06-05 14:00:00', retries: 7 },
    { id: 5, name: 'History Uncovered', url: 'https://historyuncovered.com/feed', error_message: 'DNS resolution failed', last_attempt: '2026-06-04 09:45:00', retries: 1 },
    { id: 6, name: 'Gadget Reviews Daily', url: 'https://gadgetdaily.com/rss.xml', error_message: 'Empty feed - no items found', last_attempt: '2026-06-07 06:00:00', retries: 4 },
    { id: 7, name: 'Philosophy Now', url: 'https://philosophynow.org/podcast/feed', error_message: 'Rate limited by host (429)', last_attempt: '2026-06-03 12:30:00', retries: 9 }
  ];
  return res.json(feeds);
});

// GET /api/admin/failed-ingestions
app.get('/api/admin/failed-ingestions', authMiddleware, (req, res) => {
  const jobs = [
    { id: 101, podcast_name: 'Tech Frontier', episode_title: 'The Future of Quantum Computing', error: 'Audio file download failed - 403 Forbidden', failed_at: '2026-06-07 09:15:00', duration_sec: 45, retries: 0 },
    { id: 102, podcast_name: 'Deep Dives', episode_title: 'Ocean Exploration in 2026', error: 'Transcript generation timeout', failed_at: '2026-06-07 08:45:00', duration_sec: 120, retries: 1 },
    { id: 103, podcast_name: 'Code & Coffee', episode_title: 'Rust vs Go in Production', error: 'Metadata parse error: missing duration tag', failed_at: '2026-06-07 07:30:00', duration_sec: 30, retries: 2 },
    { id: 104, podcast_name: 'Laugh Track', episode_title: 'Comedy in the Digital Age', error: 'Storage quota exceeded', failed_at: '2026-06-06 22:00:00', duration_sec: 300, retries: 0 },
    { id: 105, podcast_name: 'Soundwave Sessions', episode_title: 'Indie Artists Spotlight Vol. 3', error: 'Database connection lost during insert', failed_at: '2026-06-06 18:00:00', duration_sec: 15, retries: 3 },
    { id: 106, podcast_name: 'Game On Podcast', episode_title: 'E3 2026 Roundup', error: 'Invalid episode GUID - duplicate detected', failed_at: '2026-06-06 14:30:00', duration_sec: 22, retries: 1 },
    { id: 107, podcast_name: 'Data Driven Weekly', episode_title: 'Big Data Trends 2026', error: 'Audio format not supported (FLAC)', failed_at: '2026-06-05 10:00:00', duration_sec: 60, retries: 5 }
  ];
  return res.json(jobs);
});

// POST /api/admin/failed/retry/:id
app.post('/api/admin/failed/retry/:id', authMiddleware, (req, res) => {
  return res.json({ success: true, message: `Retry triggered for ID ${req.params.id}` });
});

// POST /api/admin/failed/retry-all
app.post('/api/admin/failed/retry-all', authMiddleware, (req, res) => {
  return res.json({ success: true, message: 'Retrying all failed items' });
});

// POST /api/admin/failed/dismiss/:id
app.post('/api/admin/failed/dismiss/:id', authMiddleware, (req, res) => {
  return res.json({ success: true, message: `Dismissed ID ${req.params.id}` });
});

// ---------------------------------------------------------------------------
// Ingestion Logs
// ---------------------------------------------------------------------------

// GET /api/admin/ingestion-logs
app.get('/api/admin/ingestion-logs', authMiddleware, (req, res) => {
  const logs = [
    { id: 1, podcast_name: 'Tech Frontier', episode_title: 'The Future of Quantum Computing', status: 'success', duration_sec: 45, episodes_count: 3, started_at: '2026-06-07T09:15:00Z', completed_at: '2026-06-07T09:15:45Z' },
    { id: 2, podcast_name: 'Deep Dives', episode_title: 'Ocean Exploration in 2026', status: 'success', duration_sec: 32, episodes_count: 2, started_at: '2026-06-07T09:00:00Z', completed_at: '2026-06-07T09:00:32Z' },
    { id: 3, podcast_name: 'Code & Coffee', episode_title: 'Rust vs Go in Production', status: 'error', duration_sec: 12, episodes_count: 0, started_at: '2026-06-07T08:45:00Z', completed_at: null, error_message: 'Metadata parse error: missing duration tag' },
    { id: 4, podcast_name: 'AI Revolution', episode_title: 'Neural Networks Explained', status: 'running', duration_sec: 0, episodes_count: 0, started_at: '2026-06-07T10:00:00Z', completed_at: null },
    { id: 5, podcast_name: 'Data Driven Weekly', episode_title: 'Big Data Trends 2026', status: 'success', duration_sec: 78, episodes_count: 5, started_at: '2026-06-07T08:00:00Z', completed_at: '2026-06-07T08:01:18Z' },
    { id: 6, podcast_name: 'Laugh Track', episode_title: 'Comedy in the Digital Age', status: 'success', duration_sec: 55, episodes_count: 4, started_at: '2026-06-07T07:30:00Z', completed_at: '2026-06-07T07:30:55Z' },
    { id: 7, podcast_name: 'Soundwave Sessions', episode_title: 'Indie Spotlight Vol. 3', status: 'error', duration_sec: 300, episodes_count: 0, started_at: '2026-06-07T06:00:00Z', completed_at: null, error_message: 'Audio processing timeout - file too large' },
    { id: 8, podcast_name: 'EduCast', episode_title: 'Learning at Scale', status: 'success', duration_sec: 22, episodes_count: 1, started_at: '2026-06-07T05:30:00Z', completed_at: '2026-06-07T05:30:22Z' },
    { id: 9, podcast_name: 'Game On', episode_title: 'E3 2026 Roundup', status: 'running', duration_sec: 0, episodes_count: 0, started_at: '2026-06-07T10:15:00Z', completed_at: null },
    { id: 10, podcast_name: 'Tech Frontier', episode_title: 'AI in Healthcare', status: 'success', duration_sec: 38, episodes_count: 2, started_at: '2026-06-07T04:00:00Z', completed_at: '2026-06-07T04:00:38Z' },
    { id: 11, podcast_name: 'Startup Stories', episode_title: 'From Garage to IPO', status: 'error', duration_sec: 5, episodes_count: 0, started_at: '2026-06-07T03:00:00Z', completed_at: null, error_message: 'Feed not reachable (connection timeout)' },
    { id: 12, podcast_name: 'Deep Dives', episode_title: 'Deep Sea Discoveries', status: 'success', duration_sec: 60, episodes_count: 4, started_at: '2026-06-06T22:00:00Z', completed_at: '2026-06-06T22:01:00Z' },
    { id: 13, podcast_name: 'The Creative Block', episode_title: 'Overcoming Creative Burnout', status: 'success', duration_sec: 18, episodes_count: 1, started_at: '2026-06-06T20:00:00Z', completed_at: '2026-06-06T20:00:18Z' },
    { id: 14, podcast_name: 'Data Driven Weekly', episode_title: 'Data Viz Best Practices', status: 'success', duration_sec: 42, episodes_count: 3, started_at: '2026-06-06T18:00:00Z', completed_at: '2026-06-06T18:00:42Z' },
    { id: 15, podcast_name: 'AI Revolution', episode_title: 'Ethics of Autonomous Systems', status: 'error', duration_sec: 8, episodes_count: 0, started_at: '2026-06-06T16:00:00Z', completed_at: null, error_message: 'Invalid episode GUID - duplicate' }
  ];
  return res.json(logs);
});

// ---------------------------------------------------------------------------
// Podcasts / Raw Data
// ---------------------------------------------------------------------------

// GET /api/admin/podcasts
app.get('/api/admin/podcasts', authMiddleware, (req, res) => {
  const podcasts = [
    { id: 1, name: 'Tech Frontier', author: 'Sarah Chen', cover_url: null, category: 'Technology', episodes: 342, last_updated: '2026-06-07' },
    { id: 2, name: 'Deep Dives', author: 'Marcus Webb', cover_url: null, category: 'Science', episodes: 156, last_updated: '2026-06-07' },
    { id: 3, name: 'Code & Coffee', author: 'Alex Rivera', cover_url: null, category: 'Technology', episodes: 210, last_updated: '2026-06-07' },
    { id: 4, name: 'Startup Stories', author: 'Jessica Kim', cover_url: null, category: 'Business', episodes: 89, last_updated: '2026-06-06' },
    { id: 5, name: 'Data Driven Weekly', author: 'Dr. Nina Patel', cover_url: null, category: 'Science', episodes: 278, last_updated: '2026-06-07' },
    { id: 6, name: 'AI Revolution', author: 'Tom Nakamura', cover_url: null, category: 'Technology', episodes: 195, last_updated: '2026-06-07' },
    { id: 7, name: 'The Creative Block', author: 'Olivia Grant', cover_url: null, category: 'Arts', episodes: 67, last_updated: '2026-06-05' },
    { id: 8, name: 'Laugh Track', author: "Danny O'Brien", cover_url: null, category: 'Comedy', episodes: 412, last_updated: '2026-06-07' },
    { id: 9, name: 'EduCast', author: 'Prof. James Wright', cover_url: null, category: 'Education', episodes: 134, last_updated: '2026-06-06' },
    { id: 10, name: 'Soundwave Sessions', author: 'Luna Martinez', cover_url: null, category: 'Music', episodes: 520, last_updated: '2026-06-07' },
    { id: 11, name: 'Health & Wellness', author: 'Dr. Amara Singh', cover_url: null, category: 'Science', episodes: 98, last_updated: '2026-06-04' },
    { id: 12, name: 'Game On', author: 'Ryan Scott', cover_url: null, category: 'Technology', episodes: 634, last_updated: '2026-06-07' }
  ];
  return res.json(podcasts);
});

// GET /api/admin/podcasts/:id/episodes
app.get('/api/admin/podcasts/:id/episodes', authMiddleware, (req, res) => {
  const id = parseInt(req.params.id);
  const titles = {
    1: ['The Future of Quantum Computing', 'AI in Healthcare: Revolution or Risk?', 'Building Scalable Microservices', 'The Rise of Edge Computing', 'Cybersecurity in a Remote World'],
    2: ['Ocean Exploration in 2026', 'The Physics of Black Holes', 'Climate Change: Latest Research'],
    3: ['Rust vs Go in Production', 'TypeScript Secrets You Should Know', 'The State of WebAssembly'],
    4: ['From Garage to IPO', 'Finding Product-Market Fit', 'Scaling Your Team'],
    5: ['Big Data Trends 2026', 'Data Visualization Best Practices', 'Machine Learning in Production'],
    6: ['Neural Networks Explained', 'Ethics of Autonomous Systems', 'The Future of AGI'],
    7: ['Overcoming Creative Burnout', 'Finding Your Artistic Voice', 'Digital Art Revolution'],
    8: ['Comedy in the Digital Age', 'Stand-up Secrets', 'Writing Funny'],
    9: ['Learning at Scale', 'The Future of Education', 'Online vs Offline Learning'],
    10: ['Indie Artists Spotlight Vol. 3', 'Studio Sessions: Behind the Mix', 'Live at Soundwave'],
    11: ['Mindfulness in Modern Life', 'Nutrition Myths Debunked', 'Exercise Science Update'],
    12: ['E3 2026 Roundup', 'Indie Game Development', 'The Rise of VR Gaming']
  };

  const eps = (titles[id] || ['Episode 1', 'Episode 2', 'Episode 3']).map((title, i) => ({
    id: id * 100 + i + 1,
    title,
    duration_sec: Math.floor(Math.random() * 3600) + 1200,
    published_at: `2026-0${Math.floor(Math.random() * 5) + 1}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
    status: ['ingested', 'ingested', 'ingested', 'pending', 'failed'][Math.floor(Math.random() * 5)]
  }));

  return res.json(eps);
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
    console.log(`║  Login:       ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}     ║`);
    console.log('╚══════════════════════════════════════════════════╝');
    console.log('');
  });
}

start();
