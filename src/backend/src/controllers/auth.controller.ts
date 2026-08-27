import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { prisma } from '../lib/prisma';

export class AuthController {
  
  static async register(req: Request, res: Response) {
    try {
      const { email, password, name } = req.body;
      if (!email || !password || !name) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }
      
      const result = await AuthService.register(email, password, name);
      res.status(201).json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        res.status(400).json({ error: 'Missing email or password' });
        return;
      }
      
      const user = await prisma.user.findUnique({ where: { email } });

      if (!user) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
      }

      if (user.isBanned) {
        res.status(403).json({ error: 'Your account has been banned by an administrator.' });
        return;
      }

      const result = await AuthService.login(email, password);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(401).json({ error: error.message });
    }
  }

  static async googleCallback(req: Request, res: Response) {
    try {
      // req.user is populated by Passport Google Strategy
      const user = req.user as any;
      if (!user) {
        throw new Error('OAuth authentication failed');
      }

      // Generate the same tokens as standard login
      const result = await AuthService.generateTokens(user);
      
      // Redirect to the frontend dashboard with tokens in URL parameters
      // In a real production app, we'd use httpOnly cookies, but for this project we'll pass via URL
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4321';
      res.redirect(`${frontendUrl}/dashboard?token=${result.accessToken}&refreshToken=${result.refreshToken}`);
    } catch (error: any) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4321';
      res.redirect(`${frontendUrl}/login?error=oauth_failed`);
    }
  }
}