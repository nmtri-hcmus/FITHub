import { Router } from 'express';
import { ProgressController } from '../controllers/progress.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Apply JWT auth middleware to both routes
router.post('/log', requireAuth, ProgressController.log);
router.get('/history', requireAuth, ProgressController.getHistory);

export default router;