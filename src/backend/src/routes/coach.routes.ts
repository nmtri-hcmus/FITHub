import { Router } from 'express';
import { CoachController } from '../controllers/coach.controller';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// ── Static routes first (must be before /:id) ────────────────────────────────

// Marketplace: get coaches recommended for a user's goal (public, but benefits from auth)
router.get('/recommendations', CoachController.getRecommendations);

// Trainee: view their own consultation bookings and statuses
router.get('/consultations/mine', requireAuth, CoachController.getMyConsultations);

// Coach portal: manage their own profile (COACH role required)
router.get('/me', requireAuth, requireRole(['COACH']), CoachController.getMyProfile);
router.post('/me', requireAuth, requireRole(['COACH']), CoachController.upsertMyProfile);
router.put('/me', requireAuth, requireRole(['COACH']), CoachController.upsertMyProfile);

// Coach portal: manage their consultation responses
router.put('/consultations/:id/respond', requireAuth, requireRole(['COACH']), CoachController.respondConsultation);

// Coach portal: client management
router.get('/clients', requireAuth, requireRole(['COACH']), CoachController.getClients);
router.get('/clients/:clientId/logs', requireAuth, requireRole(['COACH']), CoachController.getClientLogs);
router.post('/clients/:clientId/plan', requireAuth, requireRole(['COACH']), CoachController.assignPlan);

// ── Dynamic routes last ───────────────────────────────────────────────────────

// Public marketplace
router.get('/', CoachController.searchCoaches);
router.get('/:id', CoachController.getProfile);

// Authenticated marketplace actions
router.post('/:id/reviews', requireAuth, CoachController.reviewCoach);
router.post('/:id/consultations', requireAuth, CoachController.bookConsultation);

export default router;
