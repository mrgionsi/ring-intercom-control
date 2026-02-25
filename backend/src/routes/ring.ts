import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  clearRingAccountCache,
  getRingSummaryForUser,
  setRingAccountRefreshToken,
  unlockIntercomForUser
} from '../ring.js';
import { startRingAuth, verifyRingAuth } from '../ringAuth.js';
import { RingApi } from 'ring-client-api';
import {
  createRingAccount,
  disableRingAccount,
  getDefaultRingAccountForUser,
  getRingAccountByIdForUser,
  getUserTokenStatus,
  listDeviceHealthHistory,
  listRingAccountsForUser,
  recordUnlockEvent,
  setRingAccountDefault,
  updateRingAccountLabel
} from '../db.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

function sanitizeAccount(account: any) {
  return {
    id: account.id,
    userId: account.user_id,
    label: account.label,
    isDefault: Boolean(account.is_default),
    configured: Boolean(account.refresh_token),
    updatedAt: account.updated_at,
    createdAt: account.created_at
  };
}

/**
 * Return Ring integration status and configured accounts.
 * @api GET /api/ring/status
 * @access Authenticated
 * @success 200 { configured, accounts[] }
 */
router.get('/status', requireAuth, asyncHandler(async (req, res) => {
  const status = await getUserTokenStatus(req.session.auth!.id);
  const accounts = await listRingAccountsForUser(req.session.auth!.id);
  res.json({ ...status, accounts: accounts.map(sanitizeAccount) });
}));

/**
 * Save/update a refresh token for a Ring account.
 * @api POST /api/ring/refresh-token
 * @access Authenticated
 * @body refreshToken,ringAccountId?,accountLabel?
 * @success 200 { ok: true, ringAccountId }
 */
router.post('/refresh-token', requireAuth, asyncHandler(async (req, res) => {
  const { refreshToken, ringAccountId, accountLabel } = req.body ?? {};
  if (!refreshToken || typeof refreshToken !== 'string') {
    return res.status(400).json({ error: 'refreshToken is required' });
  }
  const parsedRingAccountId = Number(ringAccountId);
  let targetAccountId: number | null = null;
  if (Number.isFinite(parsedRingAccountId) && parsedRingAccountId > 0) {
    const account = await getRingAccountByIdForUser(
      req.session.auth!.id,
      parsedRingAccountId
    );
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }
    targetAccountId = account.id;
  }
  if (!targetAccountId) {
    const fallback = await getDefaultRingAccountForUser(req.session.auth!.id);
    if (fallback) {
      targetAccountId = fallback.id;
    } else {
      const created = await createRingAccount(
        req.session.auth!.id,
        typeof accountLabel === 'string' && accountLabel.trim()
          ? accountLabel.trim()
          : 'Primary Ring Account'
      );
      targetAccountId = created.id;
    }
  }
  await setRingAccountRefreshToken(
    req.session.auth!.id,
    targetAccountId,
    refreshToken.trim()
  );
  res.json({ ok: true, ringAccountId: targetAccountId });
}));

/**
 * Validate a Ring refresh token by attempting a lightweight API call.
 * @api POST /api/ring/refresh-token/test
 * @access Authenticated
 * @body refreshToken
 * @success 200 { ok: true, locations }
 * @error 400 Refresh token is invalid
 */
router.post('/refresh-token/test', requireAuth, asyncHandler(async (req, res) => {
  const { refreshToken } = req.body ?? {};
  if (!refreshToken || typeof refreshToken !== 'string') {
    return res.status(400).json({ error: 'refreshToken is required' });
  }
  try {
    const api = new RingApi({ refreshToken: refreshToken.trim() });
    const locations = await api.getLocations();
    res.json({ ok: true, locations: locations.length });
  } catch (err: any) {
    res
      .status(400)
      .json({ error: err.message ?? 'Refresh token is invalid' });
  }
}));

/**
 * Start Ring credential login flow (may require 2FA).
 * @api POST /api/ring/auth/start
 * @access Authenticated
 * @body email,password,ringAccountId?,accountLabel?
 * @success 200 { requires2fa, authSessionId, prompt, expiresAt } or { refreshToken }
 */
router.post('/auth/start', requireAuth, asyncHandler(async (req, res) => {
  const { email, password, ringAccountId, accountLabel } = req.body ?? {};
  if (
    typeof email !== 'string' ||
    typeof password !== 'string' ||
    !email.trim() ||
    !password.trim()
  ) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  try {
    const result = await startRingAuth(
      req.session.auth!.id,
      email.trim(),
      password
    );
    if ('refreshToken' in result) {
      return res.json({
        refreshToken: result.refreshToken,
        ringAccountId: Number(ringAccountId) || undefined,
        accountLabel:
          typeof accountLabel === 'string' ? accountLabel.trim() : undefined
      });
    }
    return res.json({
      requires2fa: true,
      authSessionId: result.authSessionId,
      prompt: result.prompt,
      expiresAt: result.expiresAt
    });
  } catch (err: any) {
    res
      .status(err.status ?? 500)
      .json({ error: err.message ?? 'Failed to start Ring auth' });
  }
}));

/**
 * Verify Ring 2FA code and return refresh token.
 * @api POST /api/ring/auth/verify
 * @access Authenticated
 * @body authSessionId,code
 * @success 200 { refreshToken }
 */
router.post('/auth/verify', requireAuth, asyncHandler(async (req, res) => {
  const { authSessionId, code } = req.body ?? {};
  if (
    typeof authSessionId !== 'string' ||
    typeof code !== 'string' ||
    !authSessionId.trim() ||
    !code.trim()
  ) {
    return res
      .status(400)
      .json({ error: 'authSessionId and code are required' });
  }

  try {
    const result = await verifyRingAuth(
      req.session.auth!.id,
      authSessionId.trim(),
      code.trim()
    );
    return res.json({ refreshToken: result.refreshToken });
  } catch (err: any) {
    res
      .status(err.status ?? 500)
      .json({ error: err.message ?? 'Failed to verify 2fa code' });
  }
}));

/**
 * List Ring accounts for current user.
 * @api GET /api/ring/accounts
 * @access Authenticated
 * @success 200 { accounts[] }
 */
router.get('/accounts', requireAuth, asyncHandler(async (req, res) => {
  const accounts = await listRingAccountsForUser(req.session.auth!.id);
  res.json({ accounts: accounts.map(sanitizeAccount) });
}));

/**
 * Create a Ring account entry for current user.
 * @api POST /api/ring/accounts
 * @access Authenticated
 * @body label
 * @success 200 { account }
 */
router.post('/accounts', requireAuth, asyncHandler(async (req, res) => {
  const { label } = req.body ?? {};
  if (typeof label !== 'string' || !label.trim()) {
    return res.status(400).json({ error: 'label is required' });
  }
  const account = await createRingAccount(req.session.auth!.id, label.trim());
  res.json({ account: sanitizeAccount(account) });
}));

/**
 * Update account label/default flag for a Ring account.
 * @api PATCH /api/ring/accounts/:id
 * @access Authenticated
 * @body label?,isDefault?
 * @success 200 { account }
 */
router.patch('/accounts/:id', requireAuth, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (!id) {
    return res.status(400).json({ error: 'Invalid account id' });
  }
  const account = await getRingAccountByIdForUser(req.session.auth!.id, id);
  if (!account) {
    return res.status(404).json({ error: 'Account not found' });
  }
  const { label, isDefault } = req.body ?? {};
  if (typeof label === 'string' && label.trim()) {
    await updateRingAccountLabel(req.session.auth!.id, id, label.trim());
  }
  if (isDefault === true || isDefault === 1) {
    await setRingAccountDefault(req.session.auth!.id, id);
  }
  const updated = await getRingAccountByIdForUser(req.session.auth!.id, id);
  res.json({ account: updated ? sanitizeAccount(updated) : null });
}));

/**
 * Disable (soft delete) a Ring account.
 * @api DELETE /api/ring/accounts/:id
 * @access Authenticated
 * @success 200 { ok: true }
 */
router.delete('/accounts/:id', requireAuth, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (!id) {
    return res.status(400).json({ error: 'Invalid account id' });
  }
  const account = await getRingAccountByIdForUser(req.session.auth!.id, id);
  if (!account) {
    return res.status(404).json({ error: 'Account not found' });
  }
  await disableRingAccount(req.session.auth!.id, id);
  clearRingAccountCache(req.session.auth!.id, id);
  res.json({ ok: true });
}));

/**
 * Return Ring intercom summary for current user.
 * @api GET /api/ring/summary
 * @access Authenticated
 * @success 200 { summary }
 */
router.get('/summary', requireAuth, asyncHandler(async (req, res) => {
  try {
    const summary = await getRingSummaryForUser(req.session.auth!.id);
    res.json({ summary });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? 'Failed to load Ring data' });
  }
}));

/**
 * Trigger unlock on an intercom.
 * @api POST /api/ring/unlock
 * @access Authenticated
 * @body intercomId,ringAccountId?
 * @success 200 { ok: true }
 */
router.post('/unlock', requireAuth, asyncHandler(async (req, res) => {
  const { intercomId, ringAccountId } = req.body ?? {};
  if (!intercomId) {
    return res.status(400).json({ error: 'intercomId is required' });
  }
  try {
    await unlockIntercomForUser(
      req.session.auth!.id,
      String(intercomId),
      Number.isFinite(Number(ringAccountId)) && Number(ringAccountId) > 0
        ? Number(ringAccountId)
        : undefined
    );
    await recordUnlockEvent({
      userId: req.session.auth!.id,
      intercomId: String(intercomId),
      source: 'user',
      success: true
    });
    res.json({ ok: true });
  } catch (err: any) {
    try {
      await recordUnlockEvent({
        userId: req.session.auth!.id,
        intercomId: String(intercomId),
        source: 'user',
        success: false,
        errorMessage: err.message ?? 'Unlock failed'
      });
    } catch (recordErr) {
      console.error('Failed to record unlock event', recordErr);
    }
    res.status(500).json({ error: err.message ?? 'Unlock failed' });
  }
}));

/**
 * Get device health history for a specific intercom.
 * @api GET /api/ring/health/history
 * @access Authenticated
 * @query intercomId
 * @success 200 { history[] }
 */
router.get('/health/history', requireAuth, asyncHandler(async (req, res) => {
  const intercomId = req.query.intercomId ? String(req.query.intercomId) : '';
  if (!intercomId) {
    return res.status(400).json({ error: 'intercomId is required' });
  }
  const history = await listDeviceHealthHistory(
    req.session.auth!.id,
    intercomId,
    20
  );
  res.json({ history });
}));

export default router;
