import { Response } from 'express';
import { UserService } from '../services/user.service';
import { AuthRequest } from '../middleware/auth'; // Our JWT middleware type

export class UserController {
  
  static async getMe(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id; // Guaranteed to exist by JWT middleware
      const profile = await UserService.getProfile(userId);
      res.status(200).json(profile);
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  }

  static async onboard(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { height, weight, age, gender, activityLevel, goal } = req.body;

      if (!height || !weight || !age || !gender || !activityLevel || !goal) {
        res.status(400).json({ error: 'Missing required biometric fields' });
        return;
      }

      const biometrics = await UserService.onboardUser(userId, {
        height, weight, age, gender, activityLevel, goal
      });

      res.status(200).json(biometrics);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}