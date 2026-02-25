import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { listUnlockEventsForUser } from '../db.js';

const router = Router();

/**
 * List unlock audit events for current user.
 * @api GET /api/audit
 * @access Authenticated
 * @success 200 { events[] }
 */
router.get('/audit', requireAuth, async (req, res) => {
  const events = await listUnlockEventsForUser(req.session.auth!.id, 50);
  res.json({ events });
});

export default router;
