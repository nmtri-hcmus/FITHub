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
      const goal = req.query.goal as string;
      if (!goal) {
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
      // @ts-ignore
      const userId = req.user.id;
      const { rating, text } = req.body;
      const review = await CoachService.createReview(userId, req.params.id as string, rating, text);
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
      const consultation = await CoachService.bookConsultation(userId, req.params.id as string, new Date(scheduledAt));
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
      const result = await CoachService.respondToConsultation(coachId, req.params.id as string, accept);
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

  // ── 5.6 Portal: Coach-side ────────────────────────────────────────────────────

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
      const logs = await CoachingService.getClientLogs(coachId, req.params.clientId as string);
      res.json(logs);
    } catch (err: any) {
      res.status(403).json({ error: err.message });
    }
  },

  async assignPlan(req: Request, res: Response) {
    try {
      // @ts-ignore
      const coachId = req.user.id;
      const { date, workout, mealInstructions, append } = req.body;
      let entry;
      if (append) {
        entry = await CoachingService.appendPlan(coachId, req.params.clientId as string, date, workout ?? '', mealInstructions ?? '');
      } else {
        entry = await CoachingService.assignPlan(coachId, req.params.clientId as string, date, workout ?? '', mealInstructions ?? '');
      }
      res.status(201).json(entry);
    } catch (err: any) {
      res.status(403).json({ error: err.message });
    }
  },

  async getClientPlans(req: Request, res: Response) {
    try {
      // @ts-ignore
      const coachId = req.user.id;
      const plans = await CoachingService.getPlansForTrainee(req.params.clientId as string, coachId);
      res.json(plans);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async updateClientCalories(req: Request, res: Response) {
    try {
      // @ts-ignore
      const coachId = req.user.id;
      const { calories } = req.body;
      const result = await CoachingService.updateCalorieTarget(coachId, req.params.clientId as string, Number(calories));
      res.json(result);
    } catch (err: any) {
      res.status(403).json({ error: err.message });
    }
  },

  // ── 5.6 Portal: Trainee-side ──────────────────────────────────────────────────

  async getMySubscribedCoaches(req: Request, res: Response) {
    try {
      // @ts-ignore
      const traineeId = req.user.id;
      const coaches = await CoachingService.getSubscribedCoaches(traineeId);
      res.json(coaches);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async getMyPlans(req: Request, res: Response) {
    try {
      // @ts-ignore
      const traineeId = req.user.id;
      const plans = await CoachingService.getPlansForTrainee(traineeId);
      res.json(plans);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  // ── Mock Subscription (dev/testing only) ─────────────────────────────────────

  async mockSubscribe(req: Request, res: Response) {
    try {
      // @ts-ignore
      const traineeId = req.user.id;
      const { coachId } = req.body;
      if (!coachId) {
        res.status(400).json({ error: 'coachId is required' });
        return;
      }
      const sub = await CoachingService.createMockSubscription(traineeId, coachId);
      res.status(201).json(sub);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async mockAddClient(req: Request, res: Response) {
    try {
      // @ts-ignore
      const coachId = req.user.id;
      const sub = await CoachingService.createMockClientForCoach(coachId);
      res.status(201).json(sub);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
};
