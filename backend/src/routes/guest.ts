import { Router } from 'express';
import crypto from 'crypto';
import {
  createGuestLink,
  createGuestLinkTemplate,
  disableGuestLink,
  deleteGuestLinkTemplate,
  getGuestLinkByToken,
  incrementGuestLinkUses,
  listGuestLinksForUser,
  listGuestLinkTemplatesForUser,
  recordUnlockEvent
} from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { unlockIntercomForUser } from '../ring.js';

const router = Router();

router.post('/guest-links', requireAuth, async (req, res) => {
  const { label, intercomId, expiresAt, maxUses } = req.body ?? {};
  if (!intercomId || !expiresAt) {
    return res.status(400).json({ error: 'intercomId and expiresAt are required' });
  }

  const token = crypto.randomBytes(24).toString('hex');
  const link = await createGuestLink({
    token,
    userId: req.session.auth!.id,
    label,
    intercomId: String(intercomId),
    expiresAt,
    maxUses: typeof maxUses === 'number' ? maxUses : null
  });

  res.json({ link });
});

router.get('/guest-links', requireAuth, async (req, res) => {
  const links = await listGuestLinksForUser(req.session.auth!.id);
  res.json({ links });
});

router.get('/guest-link-templates', requireAuth, async (req, res) => {
  const templates = await listGuestLinkTemplatesForUser(req.session.auth!.id);
  res.json({ templates });
});

router.post('/guest-link-templates', requireAuth, async (req, res) => {
  const { name, durationHours, maxUses } = req.body ?? {};
  if (!name || !durationHours) {
    return res.status(400).json({ error: 'name and durationHours are required' });
  }
  const template = await createGuestLinkTemplate({
    userId: req.session.auth!.id,
    name,
    durationHours: Number(durationHours),
    maxUses: typeof maxUses === 'number' ? maxUses : null
  });
  res.json({ template });
});

router.delete('/guest-link-templates/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!id) {
    return res.status(400).json({ error: 'Invalid id' });
  }
  await deleteGuestLinkTemplate(id, req.session.auth!.id);
  res.json({ ok: true });
});

router.delete('/guest-links/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!id) {
    return res.status(400).json({ error: 'Invalid id' });
  }
  await disableGuestLink(id, req.session.auth!.id);
  res.json({ ok: true });
});

router.get('/guest/:token', async (req, res) => {
  const link = await getGuestLinkByToken(req.params.token);
  if (!link || link.disabled) {
    return res.status(404).json({ error: 'Link not found' });
  }
  const now = Date.now();
  const expires = Date.parse(link.expiresAt);
  const expired = Number.isFinite(expires) && expires <= now;
  const maxedOut =
    link.maxUses !== null && link.uses >= (link.maxUses ?? 0);

  res.json({
    token: link.token,
    label: link.label,
    expiresAt: link.expiresAt,
    maxUses: link.maxUses,
    uses: link.uses,
    disabled: link.disabled,
    valid: !expired && !maxedOut
  });
});

router.post('/guest/:token/unlock', async (req, res) => {
  const link = await getGuestLinkByToken(req.params.token);
  if (!link || link.disabled) {
    return res.status(404).json({ error: 'Link not found' });
  }

  const now = Date.now();
  const expires = Date.parse(link.expiresAt);
  if (Number.isFinite(expires) && expires <= now) {
    return res.status(410).json({ error: 'Link expired' });
  }
  if (link.maxUses !== null && link.uses >= link.maxUses) {
    return res.status(410).json({ error: 'Link used up' });
  }

  try {
    await unlockIntercomForUser(link.userId, link.intercomId);
    await incrementGuestLinkUses(link.id);
    await recordUnlockEvent({
      userId: link.userId,
      intercomId: link.intercomId,
      source: 'guest',
      guestLinkId: link.id,
      success: true
    });
    res.json({ ok: true });
  } catch (err: any) {
    await recordUnlockEvent({
      userId: link.userId,
      intercomId: link.intercomId,
      source: 'guest',
      guestLinkId: link.id,
      success: false,
      errorMessage: err.message ?? 'Unlock failed'
    });
    res.status(500).json({ error: err.message ?? 'Unlock failed' });
  }
});

export default router;
