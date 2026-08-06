import { Request, Response } from 'express';
import { AiService } from '../services/ai.service';

export const AiController = {
  async generateRecipe(req: Request, res: Response) {
    const userId = (req as any).user?.id;
    const { availableIngredients, date } = req.body;

    if (!availableIngredients || !Array.isArray(availableIngredients) || availableIngredients.length === 0) {
      return res.status(400).json({
        error: 'availableIngredients must be a non-empty array of strings',
      });
    }

    try {
      const recipe = await AiService.generateRecipe({
        userId,
        availableIngredients,
        date,
      });
      return res.json(recipe);
    } catch (error: any) {
      console.error('AI recipe generation error:', error);
      return res.status(500).json({
        error: error.message || 'Failed to generate recipe',
      });
    }
  },
};
