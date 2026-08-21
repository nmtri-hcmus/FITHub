import { Router } from 'express';
import { CoachController } from '../controllers/coach.controller';
import { CoachingApplicationController } from '../controllers/coaching-application.controller';
import { requireAuth, requireRole } from '../middleware/auth';
import { prisma } from '../lib/prisma';

const router = Router();

// Middleware that checks the user's LIVE role from the DB (not the JWT which can be stale)
// Use this instead of requireRole for coach-only routes so role upgrades take effect immediately.
const requireFreshCoachRole = async (req: any, res: any, next: any) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (!user || (user.role !== 'COACH' && user.role !== 'ADMIN')) {
      return res.status(403).json({ error: 'Forbidden: Coach role required' });
    }
    // Patch the decoded JWT user with the fresh role so downstream controllers see the right role
    req.user.role = user.role;
    next();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// ── Static routes first (must be before /:id) ────────────────────────────────

// Marketplace: recommendations based on user goal
router.get('/recommendations', CoachController.getRecommendations);

// Trainee: consultations
router.get('/consultations/mine', requireAuth, CoachController.getMyConsultations);

// Trainee: subscribed coaches
router.get('/my-coaches', requireAuth, CoachController.getMySubscribedCoaches);

// Trainee: their assigned plans
router.get('/my-plans', requireAuth, CoachController.getMyPlans);

// Trainee: Apply to become a coach (UC-21)
router.post('/apply', requireAuth, CoachingApplicationController.submitApplication);
router.get('/apply/my-status', requireAuth, CoachingApplicationController.getMyApplication);

// Admin / Moderator: Verification Queue (UC-22)
router.get('/applications', requireAuth, requireRole(['ADMIN']), CoachingApplicationController.listApplications);
router.post('/applications/:id/resolve', requireAuth, requireRole(['ADMIN']), CoachingApplicationController.resolveApplication);

// Mock subscribe (dev/testing — no Stripe needed)
router.post('/mock-subscribe', requireAuth, CoachController.mockSubscribe);
router.post('/mock-add-client', requireAuth, requireFreshCoachRole, CoachController.mockAddClient);

// Coach profile self-management (COACH role required)
router.get('/me', requireAuth, requireFreshCoachRole, CoachController.getMyProfile);
router.post('/me', requireAuth, requireFreshCoachRole, CoachController.upsertMyProfile);
router.put('/me', requireAuth, requireFreshCoachRole, CoachController.upsertMyProfile);

// Coach: respond to consultation requests
router.put('/consultations/:id/respond', requireAuth, requireFreshCoachRole, CoachController.respondConsultation);

// Coach: client management
router.get('/clients', requireAuth, requireFreshCoachRole, CoachController.getClients);
router.get('/clients/:clientId/logs', requireAuth, requireFreshCoachRole, CoachController.getClientLogs);
router.get('/clients/:clientId/plans', requireAuth, requireFreshCoachRole, CoachController.getClientPlans);
router.post('/clients/:clientId/plan', requireAuth, requireFreshCoachRole, CoachController.assignPlan);
router.put('/clients/:clientId/calories', requireAuth, requireFreshCoachRole, CoachController.updateClientCalories);

// ── Dynamic routes last ───────────────────────────────────────────────────────

// Public marketplace
router.get('/', CoachController.searchCoaches);
router.get('/:id', CoachController.getProfile);

// Authenticated marketplace actions
router.post('/:id/reviews', requireAuth, CoachController.reviewCoach);
router.post('/:id/consultations', requireAuth, CoachController.bookConsultation);

export default router;
