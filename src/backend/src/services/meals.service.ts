import { prisma } from '../lib/prisma';
import { MealType } from '../generated/prisma/enums';

interface LogMealInput {
  userId: string;
  date: string; // YYYY-MM-DD
  mealType: MealType;
  foodItemName: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export const MealsService = {
  /**
   * Log a new meal entry for the user
   */
  async logMeal(input: LogMealInput) {
    const date = new Date(input.date);

    return prisma.mealLog.create({
      data: {
        userId: input.userId,
        date,
        mealType: input.mealType,
        foodItemName: input.foodItemName,
        calories: input.calories,
        protein: input.protein,
        carbs: input.carbs,
        fat: input.fat,
      },
    });
  },

  /**
   * Get all meals for a user on a specific date
   */
  async getDailyMeals(userId: string, dateStr: string) {
    // dateStr is 'YYYY-MM-DD'
    const startOfDay = new Date(`${dateStr}T00:00:00Z`);
    const endOfDay = new Date(`${dateStr}T23:59:59.999Z`);

    return prisma.mealLog.findMany({
      where: {
        userId,
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  },

  /**
   * Get today's macro dashboard — consumed vs. targets
   */
  async getDailyDashboard(userId: string, dateStr: string) {
    const [meals, biometrics] = await Promise.all([
      MealsService.getDailyMeals(userId, dateStr),
      prisma.userBiometrics.findUnique({ where: { userId } }),
    ]);

    const consumed = meals.reduce(
      (acc: { calories: number; protein: number; carbs: number; fat: number }, meal) => ({
        calories: acc.calories + meal.calories,
        protein: acc.protein + meal.protein,
        carbs: acc.carbs + meal.carbs,
        fat: acc.fat + meal.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    return {
      date: dateStr,
      consumed,
      targets: biometrics
        ? {
            calories: biometrics.dailyCalories,
            protein: biometrics.protein,
            carbs: biometrics.carbs,
            fat: biometrics.fat,
          }
        : null,
      meals,
    };
  },

  /**
   * Delete a specific meal log entry (only if it belongs to the requesting user)
   */
  async deleteMeal(mealId: string, userId: string) {
    const meal = await prisma.mealLog.findUnique({ where: { id: mealId } });

    if (!meal) {
      throw new Error('Meal not found');
    }
    if (meal.userId !== userId) {
      throw new Error('Forbidden');
    }

    return prisma.mealLog.delete({ where: { id: mealId } });
  },
};
