import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { config } from '../config.js';
import {
  clearLoginFailures,
  createAdminUserIfMissing,
  getLoginAttempt,
  getUserByUsername,
  recordLoginFailure,
  recordLoginAudit
} from '../db.js';

const router = Router();

const MAX_FAILED_LOGINS = 5;
const LOCKOUT_MINUTES = 15;

router.post('/login', async (req, res) => {
  const { username, password } = req.body ?? {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Missing credentials' });
  }

  const attempt = await getLoginAttempt(username);
  if (attempt?.locked_until) {
    const lockedUntil = Date.parse(attempt.locked_until);
    if (Number.isFinite(lockedUntil) && lockedUntil > Date.now()) {
      await recordLoginAudit({
        username,
        success: false,
        ip: req.ip,
        userAgent: req.headers['user-agent'] ?? null
      });
      return res.status(423).json({
        error: 'Account locked. Try again later.',
        lockedUntil: attempt.locked_until
      });
    }
  }

  if (username === config.ADMIN_USERNAME) {
    const valid = await bcrypt.compare(password, config.ADMIN_PASSWORD_HASH);
    if (!valid) {
      const nextCount = (attempt?.failed_count ?? 0) + 1;
      const lockedUntil =
        nextCount >= MAX_FAILED_LOGINS
          ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000).toISOString()
          : null;
      await recordLoginFailure(username, nextCount, lockedUntil);
      await recordLoginAudit({
        username,
        success: false,
        ip: req.ip,
        userAgent: req.headers['user-agent'] ?? null
      });
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const admin = await createAdminUserIfMissing(username);
    if (admin.disabled) {
      await recordLoginAudit({
        username,
        success: false,
        ip: req.ip,
        userAgent: req.headers['user-agent'] ?? null
      });
      return res.status(403).json({ error: 'User is disabled' });
    }
    await clearLoginFailures(username);
    await regenerateSession(req);
    req.session.auth = {
      id: admin.id,
      username: admin.username,
      role: 'admin',
      loginAt: new Date().toISOString()
    };
    await recordLoginAudit({
      username,
      success: true,
      ip: req.ip,
      userAgent: req.headers['user-agent'] ?? null
    });
    return res.json({ ok: true, username: admin.username, role: 'admin' });
  }

  const user = await getUserByUsername(username);
  if (!user) {
    const nextCount = (attempt?.failed_count ?? 0) + 1;
    const lockedUntil =
      nextCount >= MAX_FAILED_LOGINS
        ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000).toISOString()
        : null;
    await recordLoginFailure(username, nextCount, lockedUntil);
    await recordLoginAudit({
      username,
      success: false,
      ip: req.ip,
      userAgent: req.headers['user-agent'] ?? null
    });
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  if (user.disabled) {
    await recordLoginAudit({
      username,
      success: false,
      ip: req.ip,
      userAgent: req.headers['user-agent'] ?? null
    });
    return res.status(403).json({ error: 'User is disabled' });
  }
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    const nextCount = (attempt?.failed_count ?? 0) + 1;
    const lockedUntil =
      nextCount >= MAX_FAILED_LOGINS
        ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000).toISOString()
        : null;
    await recordLoginFailure(username, nextCount, lockedUntil);
    await recordLoginAudit({
      username,
      success: false,
      ip: req.ip,
      userAgent: req.headers['user-agent'] ?? null
    });
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  await clearLoginFailures(username);
  await regenerateSession(req);
  req.session.auth = {
    id: user.id,
    username: user.username,
    role: 'user',
    loginAt: new Date().toISOString()
  };
  await recordLoginAudit({
    username,
    success: true,
    ip: req.ip,
    userAgent: req.headers['user-agent'] ?? null
  });

  return res.json({ ok: true, username: user.username, role: 'user' });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

router.get('/me', (req, res) => {
  if (!req.session.auth) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  return res.json({
    username: req.session.auth.username,
    role: req.session.auth.role
  });
});

export default router;

function regenerateSession(req: any): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err: any) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}
