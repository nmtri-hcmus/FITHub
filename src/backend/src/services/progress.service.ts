import { prisma } from '../lib/prisma';
import { calculateMacros } from '../utils/macros';

export class ProgressService {
  
  static async logProgress(userId: string, data: { bodyWeight: number; bodyFatPercent?: number; photoUrl?: string }) {
    const log = await prisma.progressLog.create({
      data: {
        userId,
        bodyWeight: data.bodyWeight,
        bodyFatPercent: data.bodyFatPercent,
        photoUrl: data.photoUrl
      }
    });

    const bio = await prisma.userBiometrics.findUnique({ where: { userId } });
    if (bio) {
      const macros = calculateMacros(data.bodyWeight, bio.height, bio.age, bio.gender, bio.activityLevel, bio.goal);
      
      await prisma.userBiometrics.update({
        where: { userId },
        data: { 
          weight: data.bodyWeight,
          dailyCalories: macros.dailyCalories,
          protein: macros.protein,
          carbs: macros.carbs,
          fat: macros.fat
        }
      });
    }

    return log;
  }

  static async getProgressHistory(userId: string) {
    // Return all logs for this user, sorted from newest to oldest
    return await prisma.progressLog.findMany({
      where: { userId },
      orderBy: { date: 'desc' }
    });
  }
}