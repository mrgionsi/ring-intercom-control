import { Router, type Request, type Response } from 'express';
import crypto from 'crypto';
import {
  createGuestLink,
  createGuestLinkTemplate,
  disableGuestLink,
  deleteGuestLinkTemplate,
  getGuestLinkByIdForUser,
  getGuestLinkByToken,
  getRingAccountByIdForUser,
  hasActiveGuestLinkWithLabel,
  incrementGuestLinkUses,
  listGuestLinksForUser,
  listGuestLinkTemplatesForUser,
  recordUnlockEvent,
  updateGuestLinkExpiresAt
} from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { unlockIntercomForUser } from '../ring.js';
import { validateGuestLinkCreateInput } from '../guestLinkValidation.js';
import { validateGuestLinkExpiresAtUpdate } from '../guestLinkEditValidation.js';

const router = Router();

router.post('/guest-links', requireAuth, async (req, res) => {
  const { label, intercomId, startsAt, expiresAt, maxUses, ringAccountId } = req.body ?? {};
  const validated = validateGuestLinkCreateInput({
    intercomId,
    startsAt,
    expiresAt,
    maxUses
  });
  if (!validated.ok) {
    return res.status(validated.status).json({ error: validated.error });
  }

  const parsedRingAccountId = Number(ringAccountId);
  if (!Number.isFinite(parsedRingAccountId) || parsedRingAccountId <= 0) {
    return res.status(400).json({ error: 'ringAccountId is required' });
  }
  const ringAccount = await getRingAccountByIdForUser(
    req.session.auth!.id,
    parsedRingAccountId
  );
  if (!ringAccount) {
    return res.status(404).json({ error: 'Ring account not found' });
  }

  const normalizedLabel =
    typeof label === 'string' ? label.trim() : '';
  if (normalizedLabel) {
    const duplicateActive = await hasActiveGuestLinkWithLabel(
      req.session.auth!.id,
      normalizedLabel,
      new Date().toISOString(),
      parsedRingAccountId
    );
    if (duplicateActive) {
      return res.status(409).json({
        error: 'An active guest link with the same label already exists'
      });
    }
  }

  const token = crypto.randomBytes(24).toString('hex');
  const link = await createGuestLink({
    token,
    userId: req.session.auth!.id,
    ringAccountId: parsedRingAccountId,
    label: normalizedLabel || undefined,
    intercomId: validated.intercomId,
    startsAt: validated.startsAtIso,
    expiresAt: validated.expiresAtIso,
    maxUses: validated.maxUses
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

const updateExpiresAtHandler = async (
  req: Request,
  res: Response
) => {
  const id = Number(req.params.id);
  const { expiresAt } = req.body ?? {};
  if (!id) {
    return res.status(400).json({ error: 'id is required' });
  }

  const link = await getGuestLinkByIdForUser(id, req.session.auth!.id);
  if (!link) {
    return res.status(404).json({ error: 'Link not found' });
  }

  const validation = validateGuestLinkExpiresAtUpdate({
    expiresAt,
    startsAtIso: link.startsAt,
    disabled: Boolean(link.disabled)
  });
  if (!validation.ok) {
    return res.status(validation.status).json({ error: validation.error });
  }

  const updated = await updateGuestLinkExpiresAt(
    id,
    req.session.auth!.id,
    validation.expiresAtIso
  );
  if (!updated) {
    return res.status(404).json({ error: 'Link not found' });
  }
  res.json({ ok: true, expiresAt: updated.expiresAt });
};

// Keep compatibility across clients/proxies that may not forward PATCH consistently
router.patch('/guest-links/:id/expires-at', requireAuth, updateExpiresAtHandler);
router.put('/guest-links/:id/expires-at', requireAuth, updateExpiresAtHandler);

router.get('/guest/:token', async (req, res) => {
  const link = await getGuestLinkByToken(req.params.token);
  if (!link || link.disabled) {
    return res.status(404).json({ error: 'Link not found' });
  }
  const now = Date.now();
  const starts = Date.parse(link.startsAt);
  const expires = Date.parse(link.expiresAt);
  const invalidDates =
    !Number.isFinite(starts) && !Number.isFinite(expires);
  const notActiveYet = Number.isFinite(starts) && starts > now;
  const expired = Number.isFinite(expires) && expires <= now;
  const maxedOut =
    link.maxUses !== null && link.uses >= (link.maxUses ?? 0);
  const state = invalidDates
    ? 'invalid_date'
    : notActiveYet
      ? 'scheduled'
      : expired
        ? 'expired'
        : maxedOut
          ? 'used_up'
          : 'valid';

  res.json({
    token: link.token,
    label: link.label,
    startsAt: link.startsAt,
    expiresAt: link.expiresAt,
    maxUses: link.maxUses,
    uses: link.uses,
    disabled: link.disabled,
    valid: !invalidDates && !notActiveYet && !expired && !maxedOut,
    state
  });
});

router.post('/guest/:token/unlock', async (req, res) => {
  const link = await getGuestLinkByToken(req.params.token);
  if (!link || link.disabled) {
    return res.status(404).json({ error: 'Link not found' });
  }

  const now = Date.now();
  const starts = Date.parse(link.startsAt);
  if (Number.isFinite(starts) && starts > now) {
    return res.status(403).json({ error: 'Link not active yet' });
  }
  const expires = Date.parse(link.expiresAt);
  if (Number.isFinite(expires) && expires <= now) {
    return res.status(410).json({ error: 'Link expired' });
  }
  if (link.maxUses !== null && link.uses >= link.maxUses) {
    return res.status(410).json({ error: 'Link used up' });
  }

  try {
    await unlockIntercomForUser(link.userId, link.intercomId, link.ringAccountId);
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
