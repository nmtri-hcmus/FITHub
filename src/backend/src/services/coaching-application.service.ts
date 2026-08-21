import { prisma } from '../lib/prisma';
import { ApplicationStatus } from '../generated/prisma/enums';

export const CoachingApplicationService = {
  async applyToBecomeCoach(
    userId: string,
    data: {
      specialty: string;
      hourlyRate: number;
      bio?: string;
      idDocumentUrl: string;
      certDocumentUrl: string;
    }
  ) {
    return prisma.coachApplication.upsert({
      where: { userId },
      create: {
        userId,
        specialty: data.specialty,
        hourlyRate: data.hourlyRate,
        bio: data.bio,
        idDocumentUrl: data.idDocumentUrl,
        certDocumentUrl: data.certDocumentUrl,
        status: ApplicationStatus.PENDING,
      },
      update: {
        specialty: data.specialty,
        hourlyRate: data.hourlyRate,
        bio: data.bio,
        idDocumentUrl: data.idDocumentUrl,
        certDocumentUrl: data.certDocumentUrl,
        status: ApplicationStatus.PENDING,
      },
    });
  },

  async getMyApplication(userId: string) {
    return prisma.coachApplication.findUnique({
      where: { userId },
    });
  },

  async getPendingApplications() {
    return prisma.coachApplication.findMany({
      where: { status: ApplicationStatus.PENDING },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  async resolveApplication(appId: string, approve: boolean) {
    const app = await prisma.coachApplication.findUnique({
      where: { id: appId },
    });
    if (!app) throw new Error('Application not found');

    if (approve) {
      // 1. Upgrade user's role to COACH
      await prisma.user.update({
        where: { id: app.userId },
        data: { role: 'COACH' },
      });

      // 2. Create/update the CoachProfile and make it active/verified
      await prisma.coachProfile.upsert({
        where: { userId: app.userId },
        create: {
          userId: app.userId,
          specialty: app.specialty,
          hourlyRate: app.hourlyRate,
          bio: app.bio,
          isVerified: true,
        },
        update: {
          specialty: app.specialty,
          hourlyRate: app.hourlyRate,
          bio: app.bio,
          isVerified: true,
        },
      });

      // 3. Delete application and document URLs to comply with security requirements (UC-22)
      await prisma.coachApplication.delete({
        where: { id: appId },
      });

      return { success: true, status: 'APPROVED' };
    } else {
      // Reject application: Mark status as REJECTED, delete sensitive doc urls
      await prisma.coachApplication.update({
        where: { id: appId },
        data: {
          status: ApplicationStatus.REJECTED,
          idDocumentUrl: '',
          certDocumentUrl: '',
        },
      });

      return { success: true, status: 'REJECTED' };
    }
  },
};
