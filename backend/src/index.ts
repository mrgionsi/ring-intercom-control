import express from 'express';
import session from 'express-session';
import SQLiteStoreFactory from 'connect-sqlite3';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import csrf from 'csurf';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';

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

await initDb();
await loadRateLimits();

const app = express();
const SQLiteStore = SQLiteStoreFactory(session);

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
      db: 'session.db',
      dir: path.resolve(__dirname, '..')
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

const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.NODE_ENV === 'production'
  }
});

app.get('/api/auth/csrf', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

app.use((req, res, next) => {
  if (req.path.startsWith('/api/guest/')) {
    return next();
  }
  return csrfProtection(req, res, next);
});

app.use(
  (
    err: any,
    _req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    if (err.code === 'EBADCSRFTOKEN') {
      return res.status(403).json({ error: 'Invalid CSRF token' });
    }
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

app.listen(config.PORT, () => {
  console.log(`Backend listening on http://localhost:${config.PORT}`);
});
