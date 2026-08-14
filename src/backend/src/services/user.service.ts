import { prisma } from '../lib/prisma';
import { calculateMacros } from '../utils/macros';
import { ActivityLevel, Gender, Goal } from '../generated/prisma/client';

export class UserService {
  
  static async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        biometrics: true,
        subscriptionsAsClient: {
          where: { status: 'active' },
          select: {
            coachId: true,
            status: true,
            currentPeriodEnd: true,
          },
        },
      },
    });
    
    if (!user) throw new Error('User not found');
    
    // Don't send the password hash back to the frontend!
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  static async onboardUser(
    userId: string, 
    data: { height: number, weight: number, age: number, gender: Gender, activityLevel: ActivityLevel, goal: Goal }
  ) {
    // 1. Calculate macros automatically using our utility function
    const macros = calculateMacros(data.weight, data.height, data.age, data.gender, data.activityLevel, data.goal);

    // 2. Save it all to the database
    const biometrics = await prisma.userBiometrics.create({
      data: {
        userId,
        height: data.height,
        weight: data.weight,
        age: data.age,
        gender: data.gender,
        activityLevel: data.activityLevel,
        goal: data.goal,
        dailyCalories: macros.dailyCalories,
        protein: macros.protein,
        carbs: macros.carbs,
        fat: macros.fat
      }
    });

    return biometrics;
  }
}