import { Request, Response, NextFunction } from 'express';

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.auth?.id) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  if (req.session.auth.role === 'admin') {
    return next();
  }
  return res.status(403).json({ error: 'Forbidden' });
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.session?.auth?.id) {
    return next();
  }
  return res.status(401).json({ error: 'Not authenticated' });
}
