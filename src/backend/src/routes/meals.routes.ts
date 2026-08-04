import { Router } from 'express';
import { MealsController } from '../controllers/meals.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

// All meal routes are protected — must be logged in
router.post('/log', requireAuth, MealsController.logMeal);
router.get('/daily', requireAuth, MealsController.getDailyMeals);
router.get('/dashboard', requireAuth, MealsController.getDailyDashboard);
router.delete('/:id', requireAuth, MealsController.deleteMeal);

export default router;
