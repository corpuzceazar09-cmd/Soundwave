const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = 8082;

// ── Supabase Client (server-side, uses service_role for full read access) ──
const supabaseUrl = 'https://ardlvylyrocjjokcpesj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyZGx2eWx5cm9jampva2NwZXNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0Mzk4OTUsImV4cCI6MjA5NjAxNTg5NX0.2nhrXHra8mx2I9c4ygUktaRrj0DwKLC-xgPWQjBxGsI';
const supabase = createClient(supabaseUrl, supabaseKey);

// Firebase configuration
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDuYOLbC8GAaiToJkgZ7fslkOE9T9zSROg",
  authDomain: "podcast-publicuser.firebaseapp.com",
  projectId: "podcast-publicuser",
  storageBucket: "podcast-publicuser.firebasestorage.app",
  messagingSenderId: "67028124807",
  appId: "1:67028124807:web:90e62f8eafd0770e2be422"
};

app.use(express.json());

// ── API Routes ──

// Firebase config
app.get('/api/config', (req, res) => {
  res.json(FIREBASE_CONFIG);
});

// ── Podcasts ──

// GET /api/podcasts - list all podcasts
app.get('/api/podcasts', async (req, res) => {
  try {
    const { search, category, featured, limit = 20, offset = 0 } = req.query;
    let query = supabase.from('podcasts').select('*', { count: 'exact' });

    if (search) query = query.ilike('title', `%${search}%`);
    if (category) query = query.eq('feed_id.category', category); // Filter by feed category
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

// GET /api/podcasts/featured - get featured podcasts
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

// GET /api/podcasts/:id - get podcast detail
app.get('/api/podcasts/:id', async (req, res) => {
  try {
    const { data: podcast, error } = await supabase
      .from('podcasts')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    if (!podcast) return res.status(404).json({ error: 'Podcast not found' });

    // Get episodes for this podcast
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

// ── Episodes ──

// GET /api/episodes - list all published episodes
app.get('/api/episodes', async (req, res) => {
  try {
    const { limit = 20, offset = 0, podcast_id } = req.query;
    let query = supabase.from('episodes').select('*, podcasts!inner(title, author, image_url)', { count: 'exact' });

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

// GET /api/episodes/recent - get recent episodes for homepage
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

// ── Categories ──

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

// GET /api/categories/:name/podcasts - get podcasts by category
app.get('/api/categories/:name/podcasts', async (req, res) => {
  try {
    // Get feeds with matching category, then their podcasts
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

// ── Search ──

// GET /api/search?q=... - search podcasts and episodes
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

// ── User Activity (ratings, follows, history) ──

// POST /api/ratings - submit or update a rating
app.post('/api/ratings', async (req, res) => {
  try {
    const { user_id, podcast_id, rating } = req.body;
    if (!user_id || !podcast_id || !rating) {
      return res.status(400).json({ error: 'user_id, podcast_id, and rating are required' });
    }

    // Upsert rating
    const { data, error } = await supabase
      .from('ratings')
      .upsert({ user_id, podcast_id, rating }, { onConflict: 'user_id, podcast_id' })
      .select()
      .single();

    if (error) throw error;
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ratings/:user_id/:podcast_id - get user's rating for a podcast
app.get('/api/ratings/:user_id/:podcast_id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('ratings')
      .select('rating')
      .eq('user_id', req.params.user_id)
      .eq('podcast_id', req.params.podcast_id)
      .maybeSingle();

    if (error) throw error;
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/follows - follow/unfollow a podcast
app.post('/api/follows', async (req, res) => {
  try {
    const { user_id, podcast_id, follow } = req.body;
    if (!user_id || !podcast_id) {
      return res.status(400).json({ error: 'user_id and podcast_id are required' });
    }

    if (follow) {
      const { error } = await supabase
        .from('user_follows')
        .upsert({ user_id, podcast_id }, { onConflict: 'user_id, podcast_id' });
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('user_follows')
        .delete()
        .eq('user_id', user_id)
        .eq('podcast_id', podcast_id);
      if (error) throw error;
    }

    res.json({ success: true, following: follow });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/follows/:user_id - get user's followed podcasts
app.get('/api/follows/:user_id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('user_follows')
      .select('podcast_id, podcasts!inner(*)')
      .eq('user_id', req.params.user_id);

    if (error) throw error;
    res.json({ data: data.map(f => f.podcasts) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/activity - log user activity
app.post('/api/activity', async (req, res) => {
  try {
    const { user_id, episode_id, podcast_id, action, listened_seconds } = req.body;
    if (!user_id || !action) {
      return res.status(400).json({ error: 'user_id and action are required' });
    }

    const { error } = await supabase.from('user_activity').insert({
      user_id, episode_id, podcast_id, action, listened_seconds: listened_seconds || 0,
    });

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/activity/:user_id - get user's listening history
app.get('/api/activity/:user_id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('user_activity')
      .select('*, episodes!inner(title, audio_url, duration), podcasts!inner(title, image_url)')
      .eq('user_id', req.params.user_id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Static Files ──
app.use(express.static(__dirname, { extensions: ['js', 'css', 'png', 'jpg', 'svg', 'ico'] }));

// ── Clean URL Routes ──
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'auth.html')));
app.get('/auth', (req, res) => res.sendFile(path.join(__dirname, 'auth.html')));
app.get('/home', (req, res) => res.sendFile(path.join(__dirname, 'home.html')));
app.get('/browse', (req, res) => res.sendFile(path.join(__dirname, 'browse.html')));
app.get('/podcast', (req, res) => res.sendFile(path.join(__dirname, 'podcast.html')));
app.get('/category', (req, res) => res.sendFile(path.join(__dirname, 'category.html')));
app.get('/profile', (req, res) => res.sendFile(path.join(__dirname, 'profile.html')));

// ── Start Server ──
app.listen(PORT, () => {
  console.log('=============================================');
  console.log(' SoundWave - Public User Portal (Express)');
  console.log(` http://localhost:${PORT}`);
  console.log(' Firebase Auth + Supabase Data API');
  console.log(' Press CTRL+C to stop.');
  console.log('=============================================');
});
