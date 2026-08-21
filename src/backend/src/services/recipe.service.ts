import { prisma } from '../lib/prisma';

interface CreateRecipeInput {
  userId: string;
  recipeName: string;
  instructions: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  ingredients: { ingredientName: string; quantity: string }[];
  status?: 'PRIVATE' | 'PENDING';
}

interface UpdateRecipeInput {
  recipeName?: string;
  instructions?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  ingredients?: { ingredientName: string; quantity: string }[];
}

export const RecipeService = {
  /**
   * Create a new recipe with its ingredients in a single transaction.
   * Defaults to PRIVATE status (only visible to the creator).
   */
  async createRecipe(input: CreateRecipeInput) {
    const { ingredients, ...recipeData } = input;

    return prisma.recipe.create({
      data: {
        ...recipeData,
        status: input.status || 'PRIVATE',
        ingredients: {
          create: ingredients.map((ing) => ({
            ingredientName: ing.ingredientName,
            quantity: ing.quantity,
          })),
        },
      },
      include: { ingredients: true },
    });
  },

  /**
   * Get all approved community recipes (public browse).
   */
  async getApprovedRecipes() {
    return prisma.recipe.findMany({
      where: { status: 'APPROVED' },
      include: { ingredients: true, user: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  },

  /**
   * Get the current user's own recipes (any status).
   */
  async getMyRecipes(userId: string) {
    return prisma.recipe.findMany({
      where: { userId },
      include: { ingredients: true },
      orderBy: { createdAt: 'desc' },
    });
  },

  /**
   * Get a single recipe by ID (includes ingredients).
   */
  async getRecipeById(id: string) {
    return prisma.recipe.findUnique({
      where: { id },
      include: {
        ingredients: true,
        user: { select: { id: true, name: true } },
      },
    });
  },

  /**
   * Update a recipe. Only the owner can update.
   * If ingredients are provided, the old ones are deleted and replaced.
   */
  async updateRecipe(id: string, userId: string, input: UpdateRecipeInput) {
    // Verify ownership
    const existing = await prisma.recipe.findUnique({ where: { id } });
    if (!existing) throw new Error('Recipe not found');
    if (existing.userId !== userId) throw new Error('Forbidden');

    const { ingredients, ...recipeData } = input;

    // If ingredients are being updated, delete old ones and create new ones
    if (ingredients) {
      await prisma.recipeIngredient.deleteMany({ where: { recipeId: id } });
    }

    return prisma.recipe.update({
      where: { id },
      data: {
        ...recipeData,
        ...(ingredients && {
          ingredients: {
            create: ingredients.map((ing) => ({
              ingredientName: ing.ingredientName,
              quantity: ing.quantity,
            })),
          },
        }),
      },
      include: { ingredients: true },
    });
  },

  /**
   * Delete a recipe. Only the owner can delete.
   */
  async deleteRecipe(id: string, userId: string) {
    const existing = await prisma.recipe.findUnique({ where: { id } });
    if (!existing) throw new Error('Recipe not found');
    if (existing.userId !== userId) throw new Error('Forbidden');

    return prisma.recipe.delete({ where: { id } });
  },

  /**
   * Get all recipes in PENDING review status (Admin view).
   */
  async getPendingRecipes() {
    return prisma.recipe.findMany({
      where: { status: 'PENDING' },
      include: { ingredients: true, user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
  },

  /**
   * Approve or decline a pending recipe (UC-23).
   */
  async moderateRecipe(id: string, approve: boolean) {
    const existing = await prisma.recipe.findUnique({ where: { id } });
    if (!existing) throw new Error('Recipe not found');

    if (approve) {
      return prisma.recipe.update({
        where: { id },
        data: { status: 'APPROVED' },
        include: { ingredients: true },
      });
    } else {
      // Revert to PRIVATE status so it's hidden from community but owner still has it
      return prisma.recipe.update({
        where: { id },
        data: { status: 'PRIVATE' },
        include: { ingredients: true },
      });
    }
  },
};
