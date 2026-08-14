import { Request, Response } from 'express';
import { CoachService } from '../services/coach.service';
import { CoachingService } from '../services/coaching.service';

export const CoachController = {
  // ── Marketplace ──────────────────────────────────────────────────────────────

  async searchCoaches(req: Request, res: Response) {
    try {
      const coaches = await CoachService.searchCoaches({
        specialty: req.query.specialty as string,
        maxHourlyRate: req.query.maxRate ? Number(req.query.maxRate) : undefined,
      });
      res.json(coaches);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async getRecommendations(req: Request, res: Response) {
    try {
      // @ts-ignore
      const userId = req.user?.id;
      const goal = req.query.goal as string;

      if (!goal) {
        // Fallback: just return all verified coaches
        const coaches = await CoachService.searchCoaches({});
        return res.json(coaches);
      }

      const coaches = await CoachService.getRecommendations(goal);
      res.json(coaches);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async getProfile(req: Request, res: Response) {
    try {
      const profile = await CoachService.getCoachProfile(req.params.id as string);
      res.json(profile);
    } catch (err: any) {
      res.status(404).json({ error: err.message });
    }
  },

  // ── Reviews ──────────────────────────────────────────────────────────────────

  async reviewCoach(req: Request, res: Response) {
    try {
      // @ts-ignore - added by auth middleware
      const userId = req.user.id;
      const { rating, text } = req.body;
      const review = await CoachService.createReview(
        userId,
        req.params.id as string,
        rating,
        text
      );
      res.status(201).json(review);
    } catch (err: any) {
      res.status(403).json({ error: err.message });
    }
  },

  // ── Consultations ─────────────────────────────────────────────────────────────

  async bookConsultation(req: Request, res: Response) {
    try {
      // @ts-ignore
      const userId = req.user.id;
      const { scheduledAt } = req.body;
      const consultation = await CoachService.bookConsultation(
        userId,
        req.params.id as string,
        new Date(scheduledAt)
      );
      res.status(201).json(consultation);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async getMyConsultations(req: Request, res: Response) {
    try {
      // @ts-ignore
      const userId = req.user.id;
      const consultations = await CoachService.getMyConsultations(userId);
      res.json(consultations);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async respondConsultation(req: Request, res: Response) {
    try {
      // @ts-ignore
      const coachId = req.user.id;
      const { accept } = req.body;
      const result = await CoachService.respondToConsultation(
        coachId,
        req.params.id as string,
        accept
      );
      res.json(result);
    } catch (err: any) {
      res.status(403).json({ error: err.message });
    }
  },

  // ── Coach Profile Management ──────────────────────────────────────────────────

  async getMyProfile(req: Request, res: Response) {
    try {
      // @ts-ignore
      const userId = req.user.id;
      const profile = await CoachService.getMyProfile(userId);
      res.json(profile);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async upsertMyProfile(req: Request, res: Response) {
    try {
      // @ts-ignore
      const userId = req.user.id;
      const { specialty, hourlyRate, bio } = req.body;
      const profile = await CoachService.upsertCoachProfile(userId, {
        specialty,
        hourlyRate: Number(hourlyRate),
        bio,
      });
      res.status(201).json(profile);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  // ── Portal ────────────────────────────────────────────────────────────────────

  async getClients(req: Request, res: Response) {
    try {
      // @ts-ignore
      const coachId = req.user.id;
      const clients = await CoachingService.getClients(coachId);
      res.json(clients);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async getClientLogs(req: Request, res: Response) {
    try {
      // @ts-ignore
      const coachId = req.user.id;
      const logs = await CoachingService.getClientLogs(
        coachId,
        req.params.clientId as string
      );
      res.json(logs);
    } catch (err: any) {
      res.status(403).json({ error: err.message });
    }
  },

  async assignPlan(req: Request, res: Response) {
    try {
      // @ts-ignore
      const coachId = req.user.id;
      const { recipeId, date, mealType } = req.body;
      const entry = await CoachingService.assignPlan(
        coachId,
        req.params.clientId as string,
        recipeId,
        new Date(date),
        mealType
      );
      res.status(201).json(entry);
    } catch (err: any) {
      res.status(403).json({ error: err.message });
    }
  },
};
