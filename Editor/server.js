const http = require('http');
const fs = require('fs');
const path = require('path');
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

const server = http.createServer(async (req, res) => {
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
        if (db) {
          const editorsCol = db.collection('editors');
          // Dummy check against MongoDB, replace with actual bcrypt comparison in prod
          const editor = await editorsCol.findOne({ editorId: editorId, password: password });
          
          if (editor) {
            console.log(`[LOGIN SUCCESS] ${editorId}`);
            res.writeHead(302, { 'Location': '/dashboard.html' });
            return res.end();
          } else {
            console.log(`[LOGIN FAILED] Invalid credentials for ${editorId}`);
            res.writeHead(302, { 'Location': '/login.html?error=invalid_credentials' });
            return res.end();
          }
        } else {
          // If DB is not connected, fallback to mock success for demo
          console.log(`[LOGIN FALLBACK] DB not connected, allowing login for ${editorId}`);
          res.writeHead(302, { 'Location': '/dashboard.html' });
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
  
  // Static file serving logic
  // Default to login.html if root is requested
  let filePath = req.url === '/' || req.url.startsWith('/login.html') ? '/login.html' : req.url;
  // Remove query params for file path
  filePath = filePath.split('?')[0];
  filePath = path.join(__dirname, filePath);

  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = MIME_TYPES[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 Not Found</h1>', 'utf-8');
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${error.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

async function startServer() {
  try {
    db = await connectToDatabase();
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
