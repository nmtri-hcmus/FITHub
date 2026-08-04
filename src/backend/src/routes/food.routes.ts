import { Router } from 'express';
import { FoodController } from '../controllers/food.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

// All food routes require authentication so we can rate-limit per user later
router.get('/search', requireAuth, FoodController.search);
router.get('/barcode/:code', requireAuth, FoodController.barcode);
router.post('/ocr', requireAuth, FoodController.ocr);

export default router;
