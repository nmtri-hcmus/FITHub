import { prisma } from '../lib/prisma';

export const CoachingService = {
  // ── Trainee: fetch subscribed coaches ────────────────────────────────────────
  async getSubscribedCoaches(traineeId: string) {
    const subs = await prisma.subscription.findMany({
      where: { userId: traineeId, status: 'active' },
      include: {
        coach: {
          select: {
            id: true,
            name: true,
            email: true,
            coachProfile: { select: { specialty: true, hourlyRate: true, isVerified: true, bio: true } },
          },
        },
      },
    });
    return subs.map((s: any) => ({
      coachId: s.coachId,
      coachName: s.coach.name,
      specialty: s.coach.coachProfile?.specialty ?? '',
      subscriptionId: s.id,
    }));
  },

  // ── Coach: fetch clients (active subs) ────────────────────────────────────────
  async getClients(coachId: string) {
    const subs = await prisma.subscription.findMany({
      where: { coachId, status: 'active' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            biometrics: true,
            progressLogs: { orderBy: { date: 'desc' }, take: 7 },
            mealLogs: { orderBy: { date: 'desc' }, take: 30 },
          },
        },
      },
    });

    return subs.map((s: any) => {
      const user = s.user;
      // Compute macro adherence: how often was at least 1 meal logged in the last 7 days
      const last7 = new Set(
        user.mealLogs
          .slice(0, 30)
          .map((m: any) => new Date(m.date).toLocaleDateString())
      );
      const adherenceScore = Math.round((last7.size / 7) * 100);

      return {
        userId: user.id,
        name: user.name,
        email: user.email,
        goal: user.biometrics?.goal ?? 'MAINTAIN',
        adherenceScore,
        biometrics: user.biometrics ?? null,
        weightLogs: user.progressLogs.map((p: any) => ({
          date: new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          weight: p.bodyWeight,
        })),
      };
    });
  },

  // ── Validate coach-client relationship ─────────────────────────────────────
  async validateCoachClientRelationship(coachId: string, traineeId: string) {
    const sub = await prisma.subscription.findFirst({
      where: { coachId, userId: traineeId, status: 'active' },
    });
    if (!sub) throw new Error('Unauthorized: Client does not have an active subscription with you');
    return true;
  },

  // ── Coach: get client food+progress logs ───────────────────────────────────
  async getClientLogs(coachId: string, traineeId: string) {
    await this.validateCoachClientRelationship(coachId, traineeId);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [mealLogs, progressLogs] = await Promise.all([
      prisma.mealLog.findMany({
        where: { userId: traineeId, date: { gte: sevenDaysAgo } },
        orderBy: { date: 'desc' },
      }),
      prisma.progressLog.findMany({
        where: { userId: traineeId, date: { gte: sevenDaysAgo } },
        orderBy: { date: 'desc' },
      }),
    ]);
    return { mealLogs, progressLogs };
  },

  // ── Coach: assign a coaching plan (UC-14) ──────────────────────────────────
  async assignPlan(coachId: string, traineeId: string, date: string, workout: string, mealInstructions: string) {
    await this.validateCoachClientRelationship(coachId, traineeId);
    const planDate = new Date(date);

    return prisma.coachingPlan.upsert({
      where: { coachId_traineeId_date: { coachId, traineeId, date: planDate } },
      create: { coachId, traineeId, date: planDate, workout, mealInstructions },
      update: { workout, mealInstructions },
    });
  },

  // ── Coach: append to existing plan (UC-14 A1 Append) ──────────────────────
  async appendPlan(coachId: string, traineeId: string, date: string, workout: string, mealInstructions: string) {
    await this.validateCoachClientRelationship(coachId, traineeId);
    const planDate = new Date(date);
    const existing = await prisma.coachingPlan.findUnique({
      where: { coachId_traineeId_date: { coachId, traineeId, date: planDate } },
    });

    return prisma.coachingPlan.upsert({
      where: { coachId_traineeId_date: { coachId, traineeId, date: planDate } },
      create: { coachId, traineeId, date: planDate, workout, mealInstructions },
      update: {
        workout: existing
          ? `${existing.workout ?? ''}\n---\n${workout}`
          : workout,
        mealInstructions: existing
          ? `${existing.mealInstructions ?? ''}\n---\n${mealInstructions}`
          : mealInstructions,
      },
    });
  },

  // ── Get plans for a specific trainee (used by both coach + trainee view) ───
  async getPlansForTrainee(traineeId: string, coachId?: string) {
    return prisma.coachingPlan.findMany({
      where: coachId ? { traineeId, coachId } : { traineeId },
      orderBy: { date: 'asc' },
    });
  },

  // ── Coach: update client calorie target ────────────────────────────────────
  async updateCalorieTarget(coachId: string, traineeId: string, calories: number) {
    await this.validateCoachClientRelationship(coachId, traineeId);
    const biometrics = await prisma.userBiometrics.findUnique({ where: { userId: traineeId } });
    if (!biometrics) throw new Error('Trainee has not completed onboarding');
    return prisma.userBiometrics.update({
      where: { userId: traineeId },
      data: { dailyCalories: calories },
    });
  },

  // ── Mock subscription (for dev/testing without Stripe) ─────────────────────
  async createMockSubscription(traineeId: string, coachId: string) {
    // Check if already subscribed
    const existing = await prisma.subscription.findFirst({
      where: { userId: traineeId, coachId, status: 'active' },
    });
    if (existing) return existing;

    return prisma.subscription.create({
      data: {
        userId: traineeId,
        coachId,
        stripeSubscriptionId: `mock_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        status: 'active',
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });
  },

  async createMockClientForCoach(coachId: string) {
    // Create a dummy user
    const randomId = Math.random().toString(36).slice(2, 7);
    const mockUser = await prisma.user.create({
      data: {
        email: `mock-client-${randomId}@example.com`,
        name: `Mock Trainee ${randomId.toUpperCase()}`,
        password: 'password123', // Dummy password
        role: 'USER',
        biometrics: {
          create: {
            height: 175,
            weight: 70,
            age: 25,
            gender: 'MALE',
            activityLevel: 'MODERATELY_ACTIVE',
            goal: 'BUILD_MUSCLE',
            dailyCalories: 2500,
            protein: 150,
            carbs: 250,
            fat: 70,
          }
        }
      }
    });

    // Subscribe them to the coach
    return this.createMockSubscription(mockUser.id, coachId);
  },
};
