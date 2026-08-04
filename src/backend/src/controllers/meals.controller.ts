import { Request, Response } from 'express';
import { MealsService } from '../services/meals.service';
import { MealType } from '../generated/prisma/enums';

export const MealsController = {
  async logMeal(req: Request, res: Response) {
    const userId = (req as any).user?.id;
    const { date, mealType, foodItemName, calories, protein, carbs, fat } = req.body;

    if (!date || !mealType || !foodItemName || calories == null) {
      return res.status(400).json({ error: 'date, mealType, foodItemName and calories are required' });
    }

    const validMealTypes = Object.values(MealType);
    if (!validMealTypes.includes(mealType)) {
      return res.status(400).json({ error: `mealType must be one of: ${validMealTypes.join(', ')}` });
    }

    try {
      const entry = await MealsService.logMeal({
        userId,
        date,
        mealType,
        foodItemName,
        calories: Number(calories),
        protein: Number(protein || 0),
        carbs: Number(carbs || 0),
        fat: Number(fat || 0),
      });
      return res.status(201).json(entry);
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Failed to log meal' });
    }
  },

  async getDailyMeals(req: Request, res: Response) {
    const userId = (req as any).user?.id;
    const date = (req.query.date as string) || new Date().toISOString().split('T')[0];

    try {
      const meals = await MealsService.getDailyMeals(userId, date);
      return res.json(meals);
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Failed to fetch meals' });
    }
  },

  async getDailyDashboard(req: Request, res: Response) {
    const userId = (req as any).user?.id;
    const date = (req.query.date as string) || new Date().toISOString().split('T')[0];

    try {
      const dashboard = await MealsService.getDailyDashboard(userId, date);
      return res.json(dashboard);
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Failed to fetch dashboard' });
    }
  },

  async deleteMeal(req: Request, res: Response) {
    const userId = (req as any).user?.id;
    const id = req.params.id as string;

    try {
      await MealsService.deleteMeal(id, userId);
      return res.status(204).send();
    } catch (error: any) {
      if (error.message === 'Forbidden') return res.status(403).json({ error: 'Forbidden' });
      if (error.message === 'Meal not found') return res.status(404).json({ error: 'Meal not found' });
      return res.status(500).json({ error: error.message || 'Failed to delete meal' });
    }
  },
};
