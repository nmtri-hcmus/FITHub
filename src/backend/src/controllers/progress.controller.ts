import { Response } from 'express';
import { ProgressService } from '../services/progress.service';
import { AuthRequest } from '../middleware/auth';

export class ProgressController {
  
  static async log(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { bodyWeight, bodyFatPercent, photoUrl } = req.body;

      if (!bodyWeight) {
        res.status(400).json({ error: 'Body weight is required to log progress' });
        return;
      }

      const log = await ProgressService.logProgress(userId, { bodyWeight, bodyFatPercent, photoUrl });
      res.status(201).json(log);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getHistory(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const history = await ProgressService.getProgressHistory(userId);
      res.status(200).json(history);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}