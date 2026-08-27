import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

import { prisma } from '../lib/prisma';

// Extend the Express Request type so we can attach the user's ID to it
export interface AuthRequest extends Request {
  user?: { id: string; role: string };
}

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret') as { id: string; role: string };
    
    // Check if user is banned
    const user = await prisma.user.findUnique({ where: { id: decoded.id }, select: { isBanned: true } });
    if (!user) {
      res.status(401).json({ error: 'Unauthorized: User not found' });
      return;
    }
    if (user.isBanned) {
      res.status(403).json({ error: 'Forbidden: Your account has been banned' });
      return;
    }

    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized: Token expired or invalid' });
  }
};

// Like requireAuth but does NOT reject unauthenticated requests — used for public
// endpoints that return personalised data when a token is present.
export const optionalAuth = async (req: AuthRequest, _res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret') as { id: string; role: string };
      req.user = decoded;
    } catch { /* invalid token — treat as guest */ }
  }
  next();
};
export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: any, next: any) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient role' });
    }
    next();
  };
};
