import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getRingSummaryForUser,
  hasUserRefreshToken,
  setUserRefreshToken,
  unlockIntercomForUser
} from '../ring.js';
import { startRingAuth, verifyRingAuth } from '../ringAuth.js';
import { RingApi } from 'ring-client-api';
import { recordUnlockEvent } from '../db.js';
import { listDeviceHealthHistory } from '../db.js';

const router = Router();

router.get('/status', requireAuth, async (req, res) => {
  const configured = await hasUserRefreshToken(req.session.auth!.id);
  res.json({ configured });
});

router.post('/refresh-token', requireAuth, async (req, res) => {
  const { refreshToken } = req.body ?? {};
  if (!refreshToken || typeof refreshToken !== 'string') {
    return res.status(400).json({ error: 'refreshToken is required' });
  }
  await setUserRefreshToken(req.session.auth!.id, refreshToken.trim());
  res.json({ ok: true });
});

router.post('/refresh-token/test', requireAuth, async (req, res) => {
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
});

router.post('/auth/start', requireAuth, async (req, res) => {
  const { email, password } = req.body ?? {};
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
      return res.json({ refreshToken: result.refreshToken });
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
});

router.post('/auth/verify', requireAuth, async (req, res) => {
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
});

router.get('/summary', requireAuth, async (req, res) => {
  try {
    const summary = await getRingSummaryForUser(req.session.auth!.id);
    res.json({ summary });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? 'Failed to load Ring data' });
  }
});

router.post('/unlock', requireAuth, async (req, res) => {
  const { intercomId } = req.body ?? {};
  if (!intercomId) {
    return res.status(400).json({ error: 'intercomId is required' });
  }
  try {
    await unlockIntercomForUser(req.session.auth!.id, String(intercomId));
    await recordUnlockEvent({
      userId: req.session.auth!.id,
      intercomId: String(intercomId),
      source: 'user',
      success: true
    });
    res.json({ ok: true });
  } catch (err: any) {
    await recordUnlockEvent({
      userId: req.session.auth!.id,
      intercomId: String(intercomId),
      source: 'user',
      success: false,
      errorMessage: err.message ?? 'Unlock failed'
    });
    res.status(500).json({ error: err.message ?? 'Unlock failed' });
  }
});

router.get('/health/history', requireAuth, async (req, res) => {
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
});

export default router;
