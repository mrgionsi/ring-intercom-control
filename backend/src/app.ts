import express from 'express';
import session from 'express-session';
import SQLiteStoreFactory from 'connect-sqlite3';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { mkdirSync } from 'fs';

import { config } from './config.js';
import { initDb } from './db.js';
import { getRateLimits, loadRateLimits } from './rateLimits.js';
import adminRoutes from './routes/admin.js';
import ringRoutes from './routes/ring.js';
import guestRoutes from './routes/guest.js';
import authRoutes from './routes/auth.js';
import auditRoutes from './routes/audit.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SQLiteStore = SQLiteStoreFactory(session);
const resolvedDbPath = path.resolve(config.DB_PATH);
const sessionDir = path.dirname(resolvedDbPath);
const sessionDbFile = process.env.SESSION_DB_FILE ?? 'session.db';

let initialized = false;

export async function createApp() {
  if (!initialized) {
    mkdirSync(sessionDir, { recursive: true });
    await initDb();
    await loadRateLimits();
    initialized = true;
  }

  const app = express();

  app.use(helmet());
  app.use(
    helmet.contentSecurityPolicy({
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        frameAncestors: ["'none'"]
      }
    })
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use(
    cors({
      origin: config.CLIENT_ORIGIN,
      credentials: true
    })
  );

  app.use(
    session({
      store: new SQLiteStore({
        db: sessionDbFile,
        dir: sessionDir
      }),
      secret: config.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: config.NODE_ENV === 'production'
      }
    })
  );

  app.get('/api/auth/csrf', (req, res) => {
    const token = generateCsrfToken();
    res.cookie('csrf_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: config.NODE_ENV === 'production'
    });
    res.json({ csrfToken: token });
  });

  app.use((req, res, next) => {
    if (req.path.startsWith('/api/guest/')) {
      return next();
    }
    if (
      req.method === 'GET' ||
      req.method === 'HEAD' ||
      req.method === 'OPTIONS'
    ) {
      return next();
    }

    const token = req.headers['x-csrf-token'];
    const cookieToken = req.cookies?.csrf_token;
    if (
      typeof token !== 'string' ||
      typeof cookieToken !== 'string' ||
      token !== cookieToken ||
      !verifyCsrfToken(token)
    ) {
      return res.status(403).json({ error: 'Invalid CSRF token' });
    }
    return next();
  });

  app.use(
    (
      err: any,
      _req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) => {
      return next(err);
    }
  );

  const guestLimiter = rateLimit({
    windowMs: 60_000,
    max: () => getRateLimits().guestPerMinute,
    message: { error: 'Too many guest requests, try again soon.' }
  });

  const authLimiter = rateLimit({
    windowMs: 60_000,
    max: () => getRateLimits().authPerMinute,
    message: { error: 'Too many requests, slow down.' }
  });

  app.use('/api/guest', guestLimiter);
  app.use('/api/ring', authLimiter);
  app.use('/api/guest-links', authLimiter);

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.use('/api/admin', adminRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/ring', ringRoutes);
  app.use('/api', guestRoutes);
  app.use('/api', auditRoutes);

  if (config.NODE_ENV === 'production') {
    const frontendPath = path.resolve(__dirname, '..', '..', 'frontend', 'dist');
    app.use(express.static(frontendPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(frontendPath, 'index.html'));
    });
  }

  return app;
}

function generateCsrfToken(): string {
  const nonce = crypto.randomBytes(16).toString('hex');
  const sig = crypto
    .createHmac('sha256', config.SESSION_SECRET)
    .update(nonce)
    .digest('hex');
  return `${nonce}.${sig}`;
}

function verifyCsrfToken(token: string): boolean {
  const [nonce, sig] = token.split('.');
  if (!nonce || !sig) return false;
  const expected = crypto
    .createHmac('sha256', config.SESSION_SECRET)
    .update(nonce)
    .digest('hex');
  return timingSafeEqual(sig, expected);
}

function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
