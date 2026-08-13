import { prisma } from '../lib/prisma';

export const CoachService = {
  async searchCoaches(filters: { specialty?: string; maxHourlyRate?: number }) {
    return prisma.coachProfile.findMany({
      where: {
        isVerified: true,
        specialty: filters.specialty ? { contains: filters.specialty, mode: 'insensitive' } : undefined,
        hourlyRate: filters.maxHourlyRate ? { lte: filters.maxHourlyRate } : undefined,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });
  },

  async getCoachProfile(coachId: string) {
    const profile = await prisma.coachProfile.findUnique({
      where: { userId: coachId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            reviewsReceived: {
              select: { id: true, rating: true, text: true, user: { select: { name: true } }, createdAt: true },
              orderBy: { createdAt: 'desc' }
            }
          }
        }
      }
    });

    if (!profile) throw new Error('Coach not found');
    return profile;
  },

  async createReview(userId: string, coachId: string, rating: number, text?: string) {
    // Validate if the user has a subscription (past or present)
    const subscription = await prisma.subscription.findFirst({
      where: { userId, coachId }
    });

    if (!subscription) throw new Error('You can only review coaches you have subscribed to');

    return prisma.review.create({
      data: { userId, coachId, rating, text }
    });
  },

  async bookConsultation(userId: string, coachId: string, scheduledAt: Date) {
    return prisma.consultation.create({
      data: { userId, coachId, scheduledAt }
    });
  },

  async respondToConsultation(coachId: string, consultationId: string, accept: boolean) {
    const consultation = await prisma.consultation.findUnique({ where: { id: consultationId } });
    if (!consultation || consultation.coachId !== coachId) throw new Error('Consultation not found or unauthorized');

    return prisma.consultation.update({
      where: { id: consultationId },
      data: { status: accept ? 'ACCEPTED' : 'REJECTED' }
    });
  }
};
