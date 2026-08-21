import { Router } from 'express';
import { RecipeController } from '../controllers/recipe.controller';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// All recipe routes require authentication
router.post('/', requireAuth, RecipeController.create);
router.get('/approved', requireAuth, RecipeController.getApproved);
router.get('/mine', requireAuth, RecipeController.getMine);

// Admin moderation endpoints (defined before dynamic :id)
router.get('/pending', requireAuth, requireRole(['ADMIN']), RecipeController.getPending);
router.post('/:id/moderate', requireAuth, requireRole(['ADMIN']), RecipeController.moderate);

router.get('/:id', requireAuth, RecipeController.getById);
router.put('/:id', requireAuth, RecipeController.update);
router.delete('/:id', requireAuth, RecipeController.delete);

export default router;
