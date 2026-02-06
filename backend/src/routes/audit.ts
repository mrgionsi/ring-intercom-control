import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { listUnlockEventsForUser } from '../db.js';

const router = Router();

router.get('/audit', requireAuth, async (req, res) => {
  const events = await listUnlockEventsForUser(req.session.auth!.id, 50);
  res.json({ events });
});

export default router;
