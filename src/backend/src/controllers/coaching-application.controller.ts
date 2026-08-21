import { Request, Response } from 'express';
import { CoachingApplicationService } from '../services/coaching-application.service';

export const CoachingApplicationController = {
  async submitApplication(req: Request, res: Response) {
    try {
      // @ts-ignore
      const userId = req.user.id;
      const { specialty, hourlyRate, bio, idDocumentUrl, certDocumentUrl } = req.body;

      if (!specialty || !hourlyRate || !idDocumentUrl || !certDocumentUrl) {
        res.status(400).json({ error: 'Missing required application fields' });
        return;
      }

      const application = await CoachingApplicationService.applyToBecomeCoach(userId, {
        specialty,
        hourlyRate: Number(hourlyRate),
        bio,
        idDocumentUrl,
        certDocumentUrl,
      });

      res.status(201).json(application);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async getMyApplication(req: Request, res: Response) {
    try {
      // @ts-ignore
      const userId = req.user.id;
      const application = await CoachingApplicationService.getMyApplication(userId);
      res.json(application || null);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async listApplications(req: Request, res: Response) {
    try {
      const applications = await CoachingApplicationService.getPendingApplications();
      res.json(applications);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async resolveApplication(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const { approve } = req.body;

      if (approve === undefined) {
        res.status(400).json({ error: 'approve (boolean) is required in request body' });
        return;
      }

      const result = await CoachingApplicationService.resolveApplication(id, Boolean(approve));
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
};
