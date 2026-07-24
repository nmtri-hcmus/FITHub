import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';

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

  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        res.status(400).json({ error: 'Missing email or password' });
        return;
      }
      
      const result = await AuthService.login(email, password);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(401).json({ error: error.message });
    }
  }
}