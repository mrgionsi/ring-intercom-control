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
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

/**
 * Create a guest unlock link.
 * @api POST /api/guest-links
 * @access Authenticated
 * @body label?,intercomId,startsAt,expiresAt,maxUses?,ringAccountId
 * @success 200 { link }
 */
router.post('/guest-links', requireAuth, asyncHandler(async (req, res) => {
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
}));

/**
 * List guest links for current user.
 * @api GET /api/guest-links
 * @access Authenticated
 * @success 200 { links[] }
 */
router.get('/guest-links', requireAuth, asyncHandler(async (req, res) => {
  const links = await listGuestLinksForUser(req.session.auth!.id);
  res.json({ links });
}));

/**
 * List guest link templates for current user.
 * @api GET /api/guest-link-templates
 * @access Authenticated
 * @success 200 { templates[] }
 */
router.get('/guest-link-templates', requireAuth, asyncHandler(async (req, res) => {
  const templates = await listGuestLinkTemplatesForUser(req.session.auth!.id);
  res.json({ templates });
}));

/**
 * Create a guest link template.
 * @api POST /api/guest-link-templates
 * @access Authenticated
 * @body name,durationHours,maxUses?
 * @success 200 { template }
 */
router.post('/guest-link-templates', requireAuth, asyncHandler(async (req, res) => {
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
}));

/**
 * Delete a guest link template.
 * @api DELETE /api/guest-link-templates/:id
 * @access Authenticated
 * @success 200 { ok: true }
 */
router.delete('/guest-link-templates/:id', requireAuth, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (!id) {
    return res.status(400).json({ error: 'Invalid id' });
  }
  await deleteGuestLinkTemplate(id, req.session.auth!.id);
  res.json({ ok: true });
}));

/**
 * Disable a guest link.
 * @api DELETE /api/guest-links/:id
 * @access Authenticated
 * @success 200 { ok: true }
 */
router.delete('/guest-links/:id', requireAuth, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (!id) {
    return res.status(400).json({ error: 'Invalid id' });
  }
  await disableGuestLink(id, req.session.auth!.id);
  res.json({ ok: true });
}));

const updateExpiresAtHandler = asyncHandler(async (
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
});

// Keep compatibility across clients/proxies that may not forward PATCH consistently
/**
 * Update guest link expiration time.
 * @api PATCH /api/guest-links/:id/expires-at
 * @access Authenticated
 * @body expiresAt
 * @success 200 { ok: true, expiresAt }
 */
router.patch('/guest-links/:id/expires-at', requireAuth, updateExpiresAtHandler);
/**
 * Update guest link expiration time (PUT compatibility route).
 * @api PUT /api/guest-links/:id/expires-at
 * @access Authenticated
 * @body expiresAt
 * @success 200 { ok: true, expiresAt }
 */
router.put('/guest-links/:id/expires-at', requireAuth, updateExpiresAtHandler);

/**
 * Resolve a public guest link and return current validity state.
 * @api GET /api/guest/:token
 * @access Public
 * @success 200 { token, label, startsAt, expiresAt, valid, state }
 * @error 404 Link not found
 */
router.get('/guest/:token', asyncHandler(async (req, res) => {
  const link = await getGuestLinkByToken(req.params.token);
  if (!link || link.disabled) {
    return res.status(404).json({ error: 'Link not found' });
  }
  const now = Date.now();
  const starts = Date.parse(link.startsAt);
  const expires = Date.parse(link.expiresAt);
  const invalidDates =
    !Number.isFinite(starts) || !Number.isFinite(expires);
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
}));

/**
 * Unlock via public guest token if link is currently valid.
 * @api POST /api/guest/:token/unlock
 * @access Public
 * @success 200 { ok: true }
 * @error 403 Link not active yet
 * @error 404 Link not found
 * @error 410 Link expired/used up
 */
router.post('/guest/:token/unlock', asyncHandler(async (req, res) => {
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
    try {
      await recordUnlockEvent({
        userId: link.userId,
        intercomId: link.intercomId,
        source: 'guest',
        guestLinkId: link.id,
        success: false,
        errorMessage: err.message ?? 'Unlock failed'
      });
    } catch (recordErr) {
      console.error('Failed to record guest unlock event', recordErr);
    }
    res.status(500).json({ error: err.message ?? 'Unlock failed' });
  }
}));

export default router;
