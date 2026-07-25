import { prisma } from '../lib/prisma';

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

    // Optionally update their current weight in their biometrics so their macros stay accurate
    await prisma.userBiometrics.updateMany({
      where: { userId },
      data: { weight: data.bodyWeight }
    });

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