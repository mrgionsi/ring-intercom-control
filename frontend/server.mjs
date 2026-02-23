import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

const port = Number(process.env.PORT || 5173);
const distDir = normalize(join(process.cwd(), 'dist'));
const indexFilePath = normalize(join(distDir, 'index.html'));
const assetsDir = normalize(join(distDir, 'assets'));
const backendUrl = (process.env.BACKEND_URL || '').replace(/\/+$/, '');
const proxyTimeoutMs = Number(process.env.PROXY_TIMEOUT_MS || 15000);

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.map': 'application/json; charset=utf-8'
};

function sanitizePath(pathname) {
  const safe = normalize(pathname).replace(/^(\.\.(\/|\\|$))+/, '');
  return join(distDir, safe);
}

async function proxyApi(req, res) {
  if (!backendUrl) {
    res.writeHead(502, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'BACKEND_URL is not configured' }));
    return;
  }

  const url = new URL(req.url || '/', backendUrl);
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (!value) continue;
    if (key.toLowerCase() === 'host') continue;
    headers.set(key, Array.isArray(value) ? value.join(',') : value);
  }

  let body;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    body = Buffer.concat(chunks);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), proxyTimeoutMs);
  let upstream;
  try {
    upstream = await fetch(url, {
      method: req.method,
      headers,
      body,
      signal: controller.signal
    });
  } catch (error) {
    clearTimeout(timeout);
    if (error && error.name === 'AbortError') {
      res.writeHead(504, { 'content-type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Upstream timeout' }));
      return;
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  const responseHeaders = {};
  upstream.headers.forEach((value, key) => {
    responseHeaders[key] = value;
  });
  if (typeof upstream.headers.getSetCookie === 'function') {
    const setCookies = upstream.headers.getSetCookie();
    if (setCookies.length > 0) {
      responseHeaders['set-cookie'] = setCookies;
    }
  }
  res.writeHead(upstream.status, responseHeaders);
  if (!upstream.body) {
    res.end();
    return;
  }
  for await (const chunk of upstream.body) {
    res.write(chunk);
  }
  res.end();
}

async function handleStatic(req, res) {
  const reqUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  let pathname = decodeURIComponent(reqUrl.pathname);

  if (pathname.startsWith('/api/')) {
    await proxyApi(req, res);
    return;
  }
  if (pathname === '/health') {
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (pathname === '/') {
    pathname = '/index.html';
  }

  const filePath = sanitizePath(pathname);
  const inDist = filePath.startsWith(distDir);
  if (!inDist) {
    res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  const serveFile = (targetPath) => {
    const ext = extname(targetPath).toLowerCase();
    const contentType = contentTypes[ext] || 'application/octet-stream';
    const headers = { 'content-type': contentType };
    if (normalize(targetPath) === indexFilePath) {
      headers['cache-control'] = 'no-cache';
    } else if (normalize(targetPath).startsWith(assetsDir)) {
      headers['cache-control'] = 'public, max-age=31536000, immutable';
    }
    res.writeHead(200, headers);
    createReadStream(targetPath).pipe(res);
  };

  if (existsSync(filePath) && statSync(filePath).isFile()) {
    serveFile(filePath);
    return;
  }

  const indexPath = join(distDir, 'index.html');
  try {
    const indexHtml = await readFile(indexPath, 'utf8');
    res.writeHead(200, {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-cache'
    });
    res.end(indexHtml);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  }
}

createServer((req, res) => {
  handleStatic(req, res).catch((error) => {
    console.error('Frontend server error', error);
    res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Internal Server Error');
  });
}).listen(port, () => {
  console.log(`Frontend listening on http://localhost:${port}`);
});
