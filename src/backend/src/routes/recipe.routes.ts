import { Router } from 'express';
import { RecipeController } from '../controllers/recipe.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

// All recipe routes require authentication
router.post('/', requireAuth, RecipeController.create);
router.get('/approved', requireAuth, RecipeController.getApproved);
router.get('/mine', requireAuth, RecipeController.getMine);
router.get('/:id', requireAuth, RecipeController.getById);
router.put('/:id', requireAuth, RecipeController.update);
router.delete('/:id', requireAuth, RecipeController.delete);

export default router;
