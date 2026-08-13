import { prisma } from '../lib/prisma';
import { MealType } from '../generated/prisma/enums';

export const CoachingService = {
  async getClients(coachId: string) {
    // Get all active subscriptions for this coach
    const subs = await prisma.subscription.findMany({
      where: {
        coachId,
        status: 'active'
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            biometrics: true
          }
        }
      }
    });

    return subs.map((s: any) => s.user);
  },

  async validateCoachClientRelationship(coachId: string, traineeId: string) {
    const sub = await prisma.subscription.findFirst({
      where: {
        coachId,
        userId: traineeId,
        status: 'active'
      }
    });
    if (!sub) throw new Error('Unauthorized: Client does not have an active subscription with you');
    return true;
  },

  async getClientLogs(coachId: string, traineeId: string) {
    await this.validateCoachClientRelationship(coachId, traineeId);

    // Fetch the client's meal logs for the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const mealLogs = await prisma.mealLog.findMany({
      where: {
        userId: traineeId,
        date: { gte: sevenDaysAgo }
      },
      orderBy: { date: 'desc' }
    });

    const progressLogs = await prisma.progressLog.findMany({
      where: {
        userId: traineeId,
        date: { gte: sevenDaysAgo }
      },
      orderBy: { date: 'desc' }
    });

    return { mealLogs, progressLogs };
  },

  async assignPlan(coachId: string, traineeId: string, recipeId: string, date: Date, mealType: MealType) {
    await this.validateCoachClientRelationship(coachId, traineeId);

    // Ensure the recipe exists
    const recipe = await prisma.recipe.findUnique({ where: { id: recipeId } });
    if (!recipe) throw new Error('Recipe not found');

    return prisma.dietCalendarEntry.create({
      data: {
        userId: traineeId,
        recipeId,
        date,
        mealType
      }
    });
  }
};
