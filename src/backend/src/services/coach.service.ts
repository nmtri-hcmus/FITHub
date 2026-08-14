import { prisma } from '../lib/prisma';

export const CoachService = {
  // ── Marketplace ──────────────────────────────────────────────────────────────

  /**
   * Searches verified coaches with optional specialty/rate filters.
   * Used by the marketplace listing page.
   */
  async searchCoaches(filters: { specialty?: string; maxHourlyRate?: number }) {
    return prisma.coachProfile.findMany({
      where: {
        isVerified: true,
        specialty: filters.specialty
          ? { contains: filters.specialty, mode: 'insensitive' }
          : undefined,
        hourlyRate: filters.maxHourlyRate ? { lte: filters.maxHourlyRate } : undefined,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            reviewsReceived: {
              select: { rating: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  /**
   * Returns coaches recommended for a user based on their biometric goal.
   * Maps LOSE_WEIGHT → "weight loss", BUILD_MUSCLE → "muscle", MAINTAIN → "maintenance".
   */
  async getRecommendations(goal: string) {
    const goalToSpecialty: Record<string, string> = {
      LOSE_WEIGHT: 'weight',
      BUILD_MUSCLE: 'muscle',
      MAINTAIN: 'maintenance',
    };
    const keyword = goalToSpecialty[goal] ?? '';

    return prisma.coachProfile.findMany({
      where: {
        isVerified: true,
        specialty: keyword ? { contains: keyword, mode: 'insensitive' } : undefined,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            reviewsReceived: { select: { rating: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  /**
   * Returns the full coach profile including their received reviews.
   */
  async getCoachProfile(coachId: string) {
    const profile = await prisma.coachProfile.findUnique({
      where: { userId: coachId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            reviewsReceived: {
              select: {
                id: true,
                rating: true,
                text: true,
                user: { select: { name: true } },
                createdAt: true,
              },
              orderBy: { createdAt: 'desc' },
            },
          },
        },
      },
    });

    if (!profile) throw new Error('Coach not found');
    return profile;
  },

  // ── Reviews ──────────────────────────────────────────────────────────────────

  /**
   * Creates a review for a coach. The reviewer must have an active or past subscription.
   */
  async createReview(userId: string, coachId: string, rating: number, text?: string) {
    const subscription = await prisma.subscription.findFirst({
      where: { userId, coachId },
    });

    if (!subscription)
      throw new Error('You can only review coaches you have subscribed to');

    // Prevent duplicate reviews
    const existing = await prisma.review.findFirst({ where: { userId, coachId } });
    if (existing) {
      return prisma.review.update({
        where: { id: existing.id },
        data: { rating, text },
      });
    }

    return prisma.review.create({
      data: { userId, coachId, rating, text },
    });
  },

  // ── Consultations ────────────────────────────────────────────────────────────

  /**
   * Books a 15-minute free consultation with a coach.
   */
  async bookConsultation(userId: string, coachId: string, scheduledAt: Date) {
    return prisma.consultation.create({
      data: { userId, coachId, scheduledAt },
      include: {
        coach: { select: { id: true, name: true } },
      },
    });
  },

  /**
   * Returns all consultations booked by a specific trainee.
   */
  async getMyConsultations(userId: string) {
    return prisma.consultation.findMany({
      where: { userId },
      include: {
        coach: {
          select: {
            id: true,
            name: true,
            coachProfile: { select: { specialty: true, hourlyRate: true } },
          },
        },
      },
      orderBy: { scheduledAt: 'desc' },
    });
  },

  /**
   * Allows a coach to accept or reject a consultation request.
   */
  async respondToConsultation(coachId: string, consultationId: string, accept: boolean) {
    const consultation = await prisma.consultation.findUnique({
      where: { id: consultationId },
    });
    if (!consultation || consultation.coachId !== coachId)
      throw new Error('Consultation not found or unauthorized');

    return prisma.consultation.update({
      where: { id: consultationId },
      data: { status: accept ? 'ACCEPTED' : 'REJECTED' },
    });
  },

  // ── Coach Profile Management ─────────────────────────────────────────────────

  /**
   * Returns the authenticated coach's own profile.
   */
  async getMyProfile(userId: string) {
    return prisma.coachProfile.findUnique({
      where: { userId },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });
  },

  /**
   * Creates or updates the coach's own profile (upsert).
   * Only available to users with COACH role.
   */
  async upsertCoachProfile(
    userId: string,
    data: { specialty: string; hourlyRate: number; bio?: string }
  ) {
    return prisma.coachProfile.upsert({
      where: { userId },
      create: {
        userId,
        specialty: data.specialty,
        hourlyRate: data.hourlyRate,
        bio: data.bio,
        isVerified: false, // Requires admin verification
      },
      update: {
        specialty: data.specialty,
        hourlyRate: data.hourlyRate,
        bio: data.bio,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });
  },
};
