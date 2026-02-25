import { Router } from 'express';
import bcrypt from 'bcryptjs';
import {
  countUnlockEventsAll,
  countUnlockEventsForUser,
  createUser,
  deleteUser,
  hardDeleteUser,
  getUserById,
  listUsers,
  listUsersWithTokens,
  listLoginAttempts,
  listLoginAudit,
  listUnlockEventsAll,
  listUnlockEventsForUser,
  updateUser
} from '../db.js';
import { getRingSummaryForUser } from '../ring.js';
import { requireAdmin } from '../middleware/auth.js';
import crypto from 'crypto';
import { getRateLimits, updateRateLimits } from '../rateLimits.js';

const router = Router();

/**
 * List users and lockout status.
 * @api GET /api/admin/users
 * @access Admin
 * @success 200 { users[] }
 */
router.get('/users', requireAdmin, async (_req, res) => {
  const users = await listUsers();
  const attempts = await listLoginAttempts();
  const attemptMap = new Map(attempts.map((a) => [a.username, a]));
  res.json({
    users: users.map((u) => ({
      id: u.id,
      username: u.username,
      createdAt: u.created_at,
      role: u.role,
      firstName: u.first_name ?? null,
      lastName: u.last_name ?? null,
      structure: u.structure ?? null,
      disabled: u.disabled ?? 0,
      lockoutUntil: attemptMap.get(u.username)?.locked_until ?? null
    }))
  });
});

/**
 * Create a new application user.
 * @api POST /api/admin/users
 * @access Admin
 * @body username,password,role?,firstName?,lastName?,structure?
 * @success 200 { ok, user }
 * @error 400 Validation or duplicate user error
 */
router.post('/users', requireAdmin, async (req, res) => {
  const { username, password, role, firstName, lastName, structure } = req.body ?? {};
  if (!username || !password) {
    return res.status(400).json({ error: 'username and password are required' });
  }
  if (role !== undefined && role !== 'user' && role !== 'admin') {
    return res.status(400).json({ error: 'Invalid role' });
  }
  const hash = await bcrypt.hash(password, 12);
  try {
    const user = await createUser({
      username,
      passwordHash: hash,
      role: role === 'admin' ? 'admin' : 'user',
      firstName,
      lastName,
      structure
    });
    res.json({
      ok: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        firstName: user.first_name ?? null,
        lastName: user.last_name ?? null,
        structure: user.structure ?? null
      }
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message ?? 'Failed to create user' });
  }
});

/**
 * Update user profile, password, and disabled flag.
 * @api PUT /api/admin/users/:id
 * @access Admin
 * @body username?,password?,firstName?,lastName?,structure?,disabled?
 * @success 200 { ok: true }
 * @error 400 Invalid id or self-disable attempt
 */
router.put('/users/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!id) {
    return res.status(400).json({ error: 'Invalid id' });
  }
  const { username, password, firstName, lastName, structure, disabled } = req.body ?? {};
  if (disabled && req.session.auth?.id === id) {
    return res.status(400).json({ error: 'Cannot disable your own admin account' });
  }
  const passwordHash = password ? await bcrypt.hash(password, 12) : undefined;
  await updateUser(id, {
    username,
    passwordHash,
    firstName,
    lastName,
    structure,
    disabled: typeof disabled === 'number' ? disabled : undefined
  });
  res.json({ ok: true });
});

/**
 * Soft delete (disable) a user account.
 * @api DELETE /api/admin/users/:id
 * @access Admin
 * @success 200 { ok: true }
 */
router.delete('/users/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!id) {
    return res.status(400).json({ error: 'Invalid id' });
  }
  await deleteUser(id);
  res.json({ ok: true });
});

/**
 * Permanently delete a non-admin user and related data.
 * @api DELETE /api/admin/users/:id/permanent
 * @access Admin
 * @success 200 { ok: true }
 * @error 400 Invalid/self/admin delete
 * @error 404 User not found
 */
router.delete('/users/:id/permanent', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!id) {
    return res.status(400).json({ error: 'Invalid id' });
  }
  if (req.session.auth?.id === id) {
    return res.status(400).json({ error: 'Cannot delete your own admin account' });
  }
  const user = await getUserById(id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  if (user.role === 'admin') {
    return res.status(400).json({ error: 'Cannot delete admin account here' });
  }
  await hardDeleteUser(id);
  res.json({ ok: true });
});

/**
 * Reset password for a non-admin user and return a temporary password.
 * @api POST /api/admin/users/:id/reset-password
 * @access Admin
 * @success 200 { ok: true, tempPassword }
 */
router.post('/users/:id/reset-password', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!id) {
    return res.status(400).json({ error: 'Invalid id' });
  }
  const user = await getUserById(id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  if (user.role === 'admin') {
    return res.status(400).json({ error: 'Cannot reset admin password here' });
  }
  const tempPassword = crypto.randomBytes(8).toString('base64url');
  const passwordHash = await bcrypt.hash(tempPassword, 12);
  await updateUser(id, { passwordHash });
  res.json({ ok: true, tempPassword });
});

/**
 * List each user and their Ring device summary (admin view).
 * @api GET /api/admin/devices
 * @access Admin
 * @success 200 { users[] }
 */
router.get('/devices', requireAdmin, async (_req, res) => {
  const users = await listUsersWithTokens();
  const results = await Promise.all(
    users.map(async (user) => {
      const base = {
        userId: user.id,
        username: user.username,
        firstName: user.first_name ?? null,
        lastName: user.last_name ?? null,
        structure: user.structure ?? null
      };
      if (!user.refresh_token) {
        return {
          ...base,
          summary: null,
          error: 'No refresh token'
        };
      }
      try {
        const summary = await getRingSummaryForUser(user.id);
        return {
          ...base,
          summary
        };
      } catch (err: any) {
        return {
          ...base,
          summary: null,
          error: err.message ?? 'Failed to load devices'
        };
      }
    })
  );

  res.json({ users: results });
});

/**
 * List unlock audit events globally or by user.
 * @api GET /api/admin/audit
 * @access Admin
 * @query userId?,page?,pageSize?
 * @success 200 { events, total, page, pageSize }
 */
router.get('/audit', requireAdmin, async (req, res) => {
  const userId = req.query.userId ? Number(req.query.userId) : null;
  const page = Math.max(1, Number(req.query.page ?? 1) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? 10) || 10));
  const offset = (page - 1) * pageSize;
  if (userId) {
    const [events, total] = await Promise.all([
      listUnlockEventsForUser(userId, pageSize, offset),
      countUnlockEventsForUser(userId)
    ]);
    return res.json({ events, total, page, pageSize });
  }
  const [events, total] = await Promise.all([
    listUnlockEventsAll(pageSize, offset),
    countUnlockEventsAll()
  ]);
  return res.json({ events, total, page, pageSize });
});

/**
 * List login audit events.
 * @api GET /api/admin/login-audit
 * @access Admin
 * @success 200 { events[] }
 */
router.get('/login-audit', requireAdmin, async (_req, res) => {
  const events = await listLoginAudit(200);
  res.json({ events });
});

/**
 * Read runtime rate limits.
 * @api GET /api/admin/limits
 * @access Admin
 * @success 200 { guestPerMinute, authPerMinute }
 */
router.get('/limits', requireAdmin, async (_req, res) => {
  res.json(getRateLimits());
});

/**
 * Update runtime rate limits.
 * @api POST /api/admin/limits
 * @access Admin
 * @body guestPerMinute?,authPerMinute?
 * @success 200 { guestPerMinute, authPerMinute }
 */
router.post('/limits', requireAdmin, async (req, res) => {
  const { guestPerMinute, authPerMinute } = req.body ?? {};
  const updated = await updateRateLimits({
    guestPerMinute: typeof guestPerMinute === 'number' ? guestPerMinute : undefined,
    authPerMinute: typeof authPerMinute === 'number' ? authPerMinute : undefined
  });
  res.json(updated);
});

export default router;
