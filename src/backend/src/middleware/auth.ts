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

    // Attach the decoded user data to the request object so the next route can use it
    req.user = decoded;
    
    next(); // Pass control to the next route handler
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized: Token expired or invalid' });
  }
};
export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: any, next: any) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient role' });
    }
    next();
  };
};
