import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

const PORT = parseInt(process.env.PORT || '8000', 10);
const HOST = '127.0.0.1';

// Load api/ai handler
let aiHandler = null;
let agoraTokenHandler = null;
try {
  aiHandler = require('./api/ai.js');
} catch (err) {
  console.warn('[Server] Notice: api/ai.js not loaded:', err.message);
}
try {
  agoraTokenHandler = require('./api/agora-token.js');
} catch (err) {
  console.warn('[Server] Notice: api/agora-token.js not loaded:', err.message);
}
let firebaseConfigHandler = null;
try {
  firebaseConfigHandler = require('./api/firebase-config.js');
} catch (err) {
  console.warn('[Server] Notice: api/firebase-config.js not loaded:', err.message);
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json'
};

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || HOST}`);
  let pathname = decodeURIComponent(parsedUrl.pathname);

  // Handle Backend API: /api/ai
  if (pathname === '/api/ai' || pathname === '/api/ai/') {
    if (aiHandler) {
      // Decorate res for Vercel/Express compatibility
      res.status = function (statusCode) {
        this.statusCode = statusCode;
        return this;
      };
      res.json = function (data) {
        this.setHeader('Content-Type', 'application/json; charset=utf-8');
        this.end(JSON.stringify(data));
      };
      try {
        await aiHandler(req, res);
      } catch (err) {
        console.error('[Server API Error]', err);
        if (!res.headersSent) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Internal server error in AI proxy' }));
        }
      }
      return;
    } else {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ available: false, reason: 'ai_handler_missing' }));
      return;
    }
  }

  if (pathname === '/api/agora-token' || pathname === '/api/agora-token/') {
    if (agoraTokenHandler) {
      res.status = function (statusCode) {
        this.statusCode = statusCode;
        return this;
      };
      res.json = function (data) {
        this.setHeader('Content-Type', 'application/json; charset=utf-8');
        this.end(JSON.stringify(data));
      };
      try {
        await agoraTokenHandler(req, res);
      } catch (err) {
        console.error('[Server Agora Error]', err);
        if (!res.headersSent) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Internal server error in Agora token service.' }));
        }
      }
      return;
    }
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Agora token service is unavailable.' }));
    return;
  }

  if (pathname === '/api/firebase-config' || pathname === '/api/firebase-config/') {
    if (firebaseConfigHandler) {
      try {
        firebaseConfigHandler(req, res);
      } catch (err) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: err.message }));
      }
      return;
    }
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({}));
    return;
  }

  // Static File Serving
  if (pathname === '/' || pathname === '') {
    pathname = '/index.html';
  }

  let filePath = path.resolve(__dirname, `.${pathname}`);
  const relativePath = path.relative(__dirname, filePath);

  if (relativePath === '..' || relativePath.startsWith(`..${path.sep}`) || path.isAbsolute(relativePath)) {
    res.statusCode = 403;
    res.end('Access denied');
    return;
  }

  try {
    let stat = null;
    try {
      stat = fs.statSync(filePath);
    } catch { }

    if (stat && stat.isDirectory()) {
      const indexFile = path.join(filePath, 'index.html');
      if (fs.existsSync(indexFile)) {
        filePath = indexFile;
        stat = fs.statSync(filePath);
      }
    }

    if (!stat || !stat.isFile()) {
      // Try appending .html
      if (fs.existsSync(filePath + '.html')) {
        filePath = filePath + '.html';
        stat = fs.statSync(filePath);
      } else {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end(`404 Not Found: ${pathname}`);
        return;
      }
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Accept-Ranges', 'bytes');

    // Range support for videos (reels, streams)
    const range = req.headers.range;
    if (range && stat.size > 0) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
      const chunksize = end - start + 1;
      const stream = fs.createReadStream(filePath, { start, end });
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
        'Content-Length': chunksize,
        'Content-Type': contentType,
      });
      stream.pipe(res);
      return;
    }

    res.writeHead(200, {
      'Content-Length': stat.size,
      'Content-Type': contentType,
      'Cache-Control': ext === '.js' || ext === '.html' ? 'no-cache' : 'public, max-age=3600'
    });
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    console.error(`[Server File Error] ${pathname}:`, err);
    res.statusCode = 500;
    res.end('Internal server error');
  }
});

let currentPort = PORT;

function startServer(port) {
  currentPort = port;
  server.listen(port, HOST, () => {
    console.log(`========================================`);
    console.log(`StreamCart Fullstack Server Running at:`);
    console.log(`👉 http://${HOST}:${port}`);
    console.log(`👉 http://localhost:${port}`);
    console.log(`Static Files + Supabase + /api/ai Ready`);
    console.log(`========================================`);
  });
}

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    const nextPort = currentPort + 1;
    console.warn(`[Server] Notice: Port ${currentPort} is currently in use. Falling back to port ${nextPort}...`);
    setTimeout(() => startServer(nextPort), 300);
  } else {
    console.error('[Server Error]', err);
    process.exit(1);
  }
});

startServer(PORT);
