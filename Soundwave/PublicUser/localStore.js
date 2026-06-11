const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const FOLLOWS_FILE = path.join(DATA_DIR, 'follows.json');
const RATINGS_FILE = path.join(DATA_DIR, 'ratings.json');
const ACTIVITY_FILE = path.join(DATA_DIR, 'activity.json');

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJSON(file) {
  ensureDir();
  try {
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {}
  return {};
}

function writeJSON(file, data) {
  ensureDir();
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

// ---------------------------------------------------------------------------
// Follows
// ---------------------------------------------------------------------------
function getFollows(userId) {
  const all = readJSON(FOLLOWS_FILE);
  const list = all[userId] || [];
  return list.map(item => typeof item === 'string' ? { id: item, title: 'Podcast', image_url: '' } : item);
}

function setFollow(userId, podcastId, following, meta = {}) {
  const all = readJSON(FOLLOWS_FILE);
  const list = all[userId] || [];
  if (following) {
    const exists = list.some(item => (typeof item === 'string' ? item : item.id) === podcastId);
    if (!exists) {
      list.push({ id: podcastId, title: meta.title || 'Podcast', image_url: meta.image_url || '' });
    }
    all[userId] = list;
  } else {
    all[userId] = list.filter(item => (typeof item === 'string' ? item : item.id) !== podcastId);
  }
  writeJSON(FOLLOWS_FILE, all);
}

// ---------------------------------------------------------------------------
// Ratings
// ---------------------------------------------------------------------------
function getRating(userId, podcastId) {
  const all = readJSON(RATINGS_FILE);
  return all[userId]?.[podcastId] || null;
}

function setRating(userId, podcastId, rating) {
  const all = readJSON(RATINGS_FILE);
  if (!all[userId]) all[userId] = {};
  if (rating > 0) {
    all[userId][podcastId] = rating;
  } else {
    delete all[userId][podcastId];
  }
  writeJSON(RATINGS_FILE, all);
}

// ---------------------------------------------------------------------------
// Activity / History
// ---------------------------------------------------------------------------
function getActivity(userId) {
  const all = readJSON(ACTIVITY_FILE);
  return all[userId] || [];
}

function addActivity(userId, entry) {
  const all = readJSON(ACTIVITY_FILE);
  if (!all[userId]) all[userId] = [];
  all[userId].unshift({
    episode_id: entry.episode_id,
    podcast_id: entry.podcast_id,
    episode_title: entry.episode_title || '',
    podcast_title: entry.podcast_title || '',
    audio_url: entry.audio_url || '',
    duration: entry.duration || null,
    action: entry.action || 'played',
    listened_seconds: entry.listened_seconds || 0,
    created_at: new Date().toISOString(),
  });
  // Keep max 100 entries per user
  if (all[userId].length > 100) all[userId] = all[userId].slice(0, 100);
  writeJSON(ACTIVITY_FILE, all);
}

function clearActivity(userId) {
  const all = readJSON(ACTIVITY_FILE);
  delete all[userId];
  writeJSON(ACTIVITY_FILE, all);
}

module.exports = { getFollows, setFollow, getRating, setRating, getActivity, addActivity, clearActivity };
