import { Router } from 'express';
import { AiController } from '../controllers/ai.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

// AI recipe generation — protected by JWT
router.post('/generate-recipe', requireAuth, AiController.generateRecipe);

export default router;
