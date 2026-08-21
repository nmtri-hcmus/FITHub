import { Request, Response } from 'express';
import { RecipeService } from '../services/recipe.service';

export const RecipeController = {
  async create(req: Request, res: Response) {
    const userId = (req as any).user?.id;
    const { recipeName, instructions, calories, protein, carbs, fat, ingredients, status } = req.body;

    if (!recipeName || !instructions || calories == null || !ingredients?.length) {
      return res.status(400).json({
        error: 'recipeName, instructions, calories, and at least one ingredient are required',
      });
    }

    try {
      const recipe = await RecipeService.createRecipe({
        userId,
        recipeName,
        instructions,
        calories: Number(calories),
        protein: Number(protein || 0),
        carbs: Number(carbs || 0),
        fat: Number(fat || 0),
        ingredients,
        status: status || 'PRIVATE',
      });
      return res.status(201).json(recipe);
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Failed to create recipe' });
    }
  },

  async getApproved(_req: Request, res: Response) {
    try {
      const recipes = await RecipeService.getApprovedRecipes();
      return res.json(recipes);
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Failed to fetch recipes' });
    }
  },

  async getMine(req: Request, res: Response) {
    const userId = (req as any).user?.id;
    try {
      const recipes = await RecipeService.getMyRecipes(userId);
      return res.json(recipes);
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Failed to fetch your recipes' });
    }
  },

  async getById(req: Request, res: Response) {
    const id = req.params.id as string;
    try {
      const recipe = await RecipeService.getRecipeById(id);
      if (!recipe) return res.status(404).json({ error: 'Recipe not found' });
      return res.json(recipe);
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Failed to fetch recipe' });
    }
  },

  async update(req: Request, res: Response) {
    const userId = (req as any).user?.id;
    const id = req.params.id as string;

    try {
      const recipe = await RecipeService.updateRecipe(id, userId, req.body);
      return res.json(recipe);
    } catch (error: any) {
      if (error.message === 'Forbidden') return res.status(403).json({ error: 'Forbidden' });
      if (error.message === 'Recipe not found') return res.status(404).json({ error: 'Recipe not found' });
      return res.status(500).json({ error: error.message || 'Failed to update recipe' });
    }
  },

  async delete(req: Request, res: Response) {
    const userId = (req as any).user?.id;
    const id = req.params.id as string;

    try {
      await RecipeService.deleteRecipe(id, userId);
      return res.status(204).send();
    } catch (error: any) {
      if (error.message === 'Forbidden') return res.status(403).json({ error: 'Forbidden' });
      if (error.message === 'Recipe not found') return res.status(404).json({ error: 'Recipe not found' });
      return res.status(500).json({ error: error.message || 'Failed to delete recipe' });
    }
  },

  async getPending(_req: Request, res: Response) {
    try {
      const recipes = await RecipeService.getPendingRecipes();
      return res.json(recipes);
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Failed to fetch pending recipes' });
    }
  },

  async moderate(req: Request, res: Response) {
    const id = req.params.id as string;
    const { approve } = req.body;

    if (approve === undefined) {
      return res.status(400).json({ error: 'approve (boolean) is required in request body' });
    }

    try {
      const recipe = await RecipeService.moderateRecipe(id, Boolean(approve));
      return res.json(recipe);
    } catch (error: any) {
      if (error.message === 'Recipe not found') return res.status(404).json({ error: 'Recipe not found' });
      return res.status(500).json({ error: error.message || 'Failed to moderate recipe' });
    }
  },
};
