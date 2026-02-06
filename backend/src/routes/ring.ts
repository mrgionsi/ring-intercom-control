import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getRingSummaryForUser,
  hasUserRefreshToken,
  setUserRefreshToken,
  unlockIntercomForUser
} from '../ring.js';
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
