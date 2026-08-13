import { Router } from 'express';
import { CoachController } from '../controllers/coach.controller';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// Public marketplace
router.get('/', CoachController.searchCoaches);
router.get('/:id', CoachController.getProfile);

// Authenticated marketplace actions
router.post('/:id/reviews', requireAuth, CoachController.reviewCoach);
router.post('/:id/consultations', requireAuth, CoachController.bookConsultation);

// Coach portal actions
router.put('/consultations/:id/respond', requireAuth, requireRole(['COACH']), CoachController.respondConsultation);
router.get('/clients', requireAuth, requireRole(['COACH']), CoachController.getClients);
router.get('/clients/:clientId/logs', requireAuth, requireRole(['COACH']), CoachController.getClientLogs);
router.post('/clients/:clientId/plan', requireAuth, requireRole(['COACH']), CoachController.assignPlan);

export default router;
