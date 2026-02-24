import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { extname, join, normalize, sep } from 'node:path';

const port = Number(process.env.PORT || 5173);
const distDir = normalize(join(process.cwd(), 'dist'));
const indexFilePath = normalize(join(distDir, 'index.html'));
const assetsDir = normalize(join(distDir, 'assets'));
const backendUrl = (process.env.BACKEND_URL || '').replace(/\/+$/, '');
const proxyTimeoutMs = Number(process.env.PROXY_TIMEOUT_MS || 15000);
const MAX_BODY_BYTES = Number(process.env.MAX_BODY_BYTES || 1_048_576);
const hopByHopHeaders = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade'
]);

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

  const reqUrl = new URL(req.url || '/', 'http://localhost');
  const url = new URL(`${reqUrl.pathname}${reqUrl.search}`, backendUrl);
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (!value) continue;
    const lower = key.toLowerCase();
    if (lower === 'host') continue;
    if (hopByHopHeaders.has(lower)) continue;
    headers.set(key, Array.isArray(value) ? value.join(',') : value);
  }

  let body;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const chunks = [];
    let total = 0;
    for await (const chunk of req) {
      total += chunk.length;
      if (total > MAX_BODY_BYTES) {
        res.writeHead(413, { 'content-type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'Request body too large' }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    }
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
    if (error && error.name === 'AbortError') {
      res.writeHead(504, { 'content-type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Upstream timeout' }));
      return;
    }
    res.writeHead(502, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'Bad gateway' }));
    return;
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
  let pathname;
  try {
    pathname = decodeURIComponent(reqUrl.pathname);
  } catch (error) {
    if (error instanceof URIError) {
      res.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Bad request');
      return;
    }
    throw error;
  }

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
  const inDist =
    filePath === distDir || filePath.startsWith(`${distDir}${sep}`);
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
    const stream = createReadStream(targetPath);
    stream.once('open', () => {
      res.writeHead(200, headers);
      stream.pipe(res);
    });
    stream.on('error', (error) => {
      console.error('Failed to read static asset', error);
      stream.destroy();
      if (!res.headersSent) {
        res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
        res.end('Internal Server Error');
      } else if (!res.writableEnded) {
        res.end();
      }
    });
  };

  try {
    const fileStat = await stat(filePath);
    if (fileStat.isFile()) {
      serveFile(filePath);
      return;
    }
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      throw error;
    }
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

const server = createServer((req, res) => {
  handleStatic(req, res).catch((error) => {
    console.error('Frontend server error', error);
    if (!res.headersSent) {
      res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Internal Server Error');
      return;
    }
    if (!res.writableEnded) {
      res.end();
      return;
    }
    console.error('Headers were already sent for failed request');
  });
});

server.listen(port, () => {
  console.log(`Frontend listening on http://localhost:${port}`);
});

process.on('SIGTERM', () => {
  const forceExit = setTimeout(() => process.exit(1), 5000);
  server.close(() => {
    clearTimeout(forceExit);
    process.exit(0);
  });
});
