import { Request, Response } from 'express';
import { CalendarService } from '../services/calendar.service';
import { MealType } from '../generated/prisma/enums';

export const CalendarController = {
  async schedule(req: Request, res: Response) {
    const userId = (req as any).user?.id;
    const { recipeId, date, mealType } = req.body;

    if (!recipeId || !date || !mealType) {
      return res.status(400).json({ error: 'recipeId, date, and mealType are required' });
    }

    const validMealTypes = Object.values(MealType);
    if (!validMealTypes.includes(mealType)) {
      return res.status(400).json({ error: `mealType must be one of: ${validMealTypes.join(', ')}` });
    }

    try {
      const entry = await CalendarService.scheduleEntry({ userId, recipeId, date, mealType });
      return res.status(201).json(entry);
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Failed to schedule entry' });
    }
  },

  async getWeek(req: Request, res: Response) {
    const userId = (req as any).user?.id;
    const week = req.query.week as string;

    if (!week) {
      return res.status(400).json({ error: 'week query parameter is required (e.g., 2026-W32)' });
    }

    try {
      const entries = await CalendarService.getWeekEntries(userId, week);
      return res.json(entries);
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Failed to fetch calendar' });
    }
  },

  async deleteEntry(req: Request, res: Response) {
    const userId = (req as any).user?.id;
    const id = req.params.id as string;

    try {
      await CalendarService.deleteEntry(id, userId);
      return res.status(204).send();
    } catch (error: any) {
      if (error.message === 'Forbidden') return res.status(403).json({ error: 'Forbidden' });
      if (error.message === 'Entry not found') return res.status(404).json({ error: 'Entry not found' });
      return res.status(500).json({ error: error.message || 'Failed to delete entry' });
    }
  },

  async groceryList(req: Request, res: Response) {
    const userId = (req as any).user?.id;
    const week = req.query.week as string;

    if (!week) {
      return res.status(400).json({ error: 'week query parameter is required (e.g., 2026-W32)' });
    }

    try {
      const list = await CalendarService.getGroceryList(userId, week);
      return res.json(list);
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Failed to generate grocery list' });
    }
  },
};
