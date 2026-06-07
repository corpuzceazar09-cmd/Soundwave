const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const querystring = require('querystring');
const { connectToDatabase } = require('./db');

let db;

const PORT = 8080;

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
};

// Simple in-memory file cache with TTL
const fileCache = new Map();
const CACHE_TTL = 60000; // 60 seconds

function getCachedFile(filePath) {
  const cached = fileCache.get(filePath);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
}

function setCachedFile(filePath, data) {
  fileCache.set(filePath, { data, timestamp: Date.now() });
}

// Gzip a buffer (cached per file)
const gzipCache = new Map();
function getGzipped(data) {
  const key = data.length + ':' + data.slice(0, 100).toString('utf8').length;
  if (gzipCache.has(key)) return gzipCache.get(key);
  const gzipped = zlib.gzipSync(data, { level: 6 });
  if (gzipCache.size > 100) gzipCache.clear();
  gzipCache.set(key, gzipped);
  return gzipped;
}

function serveStaticFile(res, filePath) {
  // Try cache first
  let content = getCachedFile(filePath);
  if (!content) {
    try {
      content = fs.readFileSync(filePath);
      setCachedFile(filePath, content);
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end('<h1>404 Not Found</h1>', 'utf-8');
      return;
    }
  }

  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = MIME_TYPES[extname] || 'application/octet-stream';

  // Check if client accepts gzip
  const acceptEncoding = (req.headers['accept-encoding'] || '');
  if (acceptEncoding.includes('gzip')) {
    const compressed = getGzipped(content);
    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Encoding': 'gzip',
      'Cache-Control': 'public, max-age=300',
    });
    res.end(compressed);
  } else {
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=300',
    });
    res.end(content);
  }
}

// In-memory editor cache (avoids MongoDB hit on every login)
let editorsCache = [];
let editorsCacheTimestamp = 0;
const EDITORS_CACHE_TTL = 30000; // 30 seconds

async function getEditors() {
  if (Date.now() - editorsCacheTimestamp < EDITORS_CACHE_TTL && editorsCache.length > 0) {
    return editorsCache;
  }
  if (db) {
    try {
      editorsCache = await db.collection('editors').find({}).toArray();
      editorsCacheTimestamp = Date.now();
    } catch {
      // fall through to cache
    }
  }
  return editorsCache;
}

let req;
const server = http.createServer(async (incomingReq, res) => {
  req = incomingReq;
  console.log(`[REQUEST] ${req.method} ${req.url}`);

  if (req.method === 'POST' && req.url === '/login') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', async () => {
      const parsedBody = querystring.parse(body);
      const editorId = parsedBody.editorId;
      const password = parsedBody.password;

      console.log(`[LOGIN ATTEMPT] Editor ID: ${editorId}`);

      try {
        const editors = await getEditors();
        const editor = editors.find(e => e.editorId === editorId && e.password === password);

        if (editor) {
          console.log(`[LOGIN SUCCESS] ${editorId}`);
          res.writeHead(302, { 'Location': '/dashboard' });
          return res.end();
        } else {
          console.log(`[LOGIN FAILED] Invalid credentials for ${editorId}`);
          res.writeHead(302, { 'Location': '/login?error=invalid_credentials' });
          return res.end();
        }
      } catch (err) {
        console.error("Login Error:", err);
        res.writeHead(500);
        return res.end("Internal Server Error");
      }
    });
    return;
  }

  // Clean URL mapping — strip .html from addresses
  let urlPath = req.url.split('?')[0];

  // Map clean URLs to actual files
  const cleanUrlMap = {
    '/': '/login.html',
    '/login': '/login.html',
    '/dashboard': '/dashboard.html'
  };

  // Check if the path ends with .html already — if so, keep it as-is; otherwise apply mapping
  let filePath;
  if (urlPath.endsWith('.html')) {
    filePath = urlPath;
  } else if (cleanUrlMap[urlPath] !== undefined) {
    filePath = cleanUrlMap[urlPath];
  } else {
    filePath = urlPath;
  }

  filePath = path.join(__dirname, filePath);
  serveStaticFile(res, filePath);
});

async function startServer() {
  try {
    db = await connectToDatabase();
    // Prime the editors cache
    getEditors().catch(() => {});
  } catch (err) {
    console.log("⚠️ Starting server without DB connection for now. Check your MONGODB_URI.");
  }

  server.listen(PORT, () => {
    console.log('=============================================');
    console.log(' Podcast Editor Server Running!');
    console.log(` Access it at: http://localhost:${PORT}`);
    console.log(' Press CTRL+C to stop the server.');
    console.log('=============================================');
  });
}

startServer();
