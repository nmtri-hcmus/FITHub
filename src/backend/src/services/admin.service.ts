import { prisma } from '../lib/prisma';
import { UploadService } from './upload.service';

/**
 * Helper to extract Cloudinary public ID from URL
 * Assumes format: https://res.cloudinary.com/.../upload/v.../folder/file.ext
 */
const extractPublicId = (url: string) => {
  const parts = url.split('/');
  // Usually the public ID is folder/filename without extension
  const fileWithExt = parts.pop();
  const folder = parts.pop();
  if (fileWithExt && folder) {
    const filename = fileWithExt.split('.')[0];
    return `${folder}/${filename}`;
  }
  return null;
};

export const AdminService = {
  // --- Coaches ---
  async getPendingCoaches() {
    return prisma.coachApplication.findMany({
      where: { status: 'PENDING' },
      include: { user: { select: { name: true, email: true } } }
    });
  },

  async verifyCoach(adminId: string, applicationId: string, decision: 'APPROVED' | 'REJECTED') {
    const application = await prisma.coachApplication.findUnique({ where: { id: applicationId } });
    if (!application) throw new Error("Application not found");

    // Start a transaction for DB changes
    await prisma.$transaction(async (tx) => {
      // 1. Update app status
      await tx.coachApplication.update({
        where: { id: applicationId },
        data: { status: decision }
      });

      // 2. If approved, update user role and create coach profile
      if (decision === 'APPROVED') {
        await tx.user.update({
          where: { id: application.userId },
          data: { role: 'COACH' }
        });

        await tx.coachProfile.create({
          data: {
            userId: application.userId,
            specialty: application.specialty,
            hourlyRate: application.hourlyRate,
            bio: application.bio,
            isVerified: true
          }
        });
      }

      // 3. Log action
      await tx.adminAction.create({
        data: {
          adminId,
          actionType: 'VERIFY_COACH',
          targetId: applicationId,
          details: `Decision: ${decision} for User ID: ${application.userId}`
        }
      });
    });

    // 4. Wipe sensitive documents from Cloudinary for privacy
    try {
      const idPublicId = extractPublicId(application.idDocumentUrl);
      const certPublicId = extractPublicId(application.certDocumentUrl);
      if (idPublicId) await UploadService.deleteFile(idPublicId);
      if (certPublicId) await UploadService.deleteFile(certPublicId);
    } catch (e) {
      console.error("[AdminService] Failed to delete sensitive documents:", e);
      // We don't fail the transaction if cloudinary deletion fails, just log it.
    }

    return { message: `Coach application ${decision}` };
  },

  // --- Recipes ---
  async getPendingRecipes() {
    return prisma.recipe.findMany({
      where: { status: 'PENDING' },
      include: { user: { select: { name: true } }, ingredients: true }
    });
  },

  async approveRecipe(adminId: string, recipeId: string, decision: 'APPROVED' | 'REJECTED') {
    const status = decision === 'APPROVED' ? 'APPROVED' : 'PRIVATE'; // Private if rejected
    await prisma.recipe.update({
      where: { id: recipeId },
      data: { status }
    });

    await prisma.adminAction.create({
      data: { adminId, actionType: 'APPROVE_RECIPE', targetId: recipeId, details: `Decision: ${decision}` }
    });

    return { message: `Recipe ${decision}` };
  },

  // --- SubCommunities ---
  async getPendingGroups() {
    return prisma.subCommunity.findMany({
      where: { status: 'PENDING' }
    });
  },

  async approveGroup(adminId: string, groupId: string, decision: 'APPROVED' | 'REJECTED') {
    await prisma.subCommunity.update({
      where: { id: groupId },
      data: { status: decision }
    });

    await prisma.adminAction.create({
      data: { adminId, actionType: 'APPROVE_GROUP', targetId: groupId, details: `Decision: ${decision}` }
    });

    return { message: `Group ${decision}` };
  },

  // --- Reports & Bans ---
  async getReports() {
    return prisma.report.findMany({
      where: { status: 'PENDING' },
      include: {
        reporter: { select: { name: true, email: true } },
        reportedUser: { select: { name: true, email: true, isBanned: true } }
      }
    });
  },

  async resolveReport(adminId: string, reportId: string, decision: 'WARN' | 'BAN' | 'DISMISS') {
    const report = await prisma.report.findUnique({ where: { id: reportId } });
    if (!report) throw new Error("Report not found");

    if (decision === 'BAN') {
      await this.banUser(adminId, report.reportedUserId, `Banned via Report ${reportId}`);
    }

    await prisma.report.update({
      where: { id: reportId },
      data: { status: 'RESOLVED' }
    });

    await prisma.adminAction.create({
      data: { adminId, actionType: 'RESOLVE_REPORT', targetId: reportId, details: `Decision: ${decision}` }
    });

    return { message: `Report resolved: ${decision}` };
  },

  async banUser(adminId: string, userId: string, reason: string = 'Manual Admin Ban') {
    await prisma.user.update({
      where: { id: userId },
      data: { isBanned: true }
    });

    await prisma.adminAction.create({
      data: { adminId, actionType: 'BAN_USER', targetId: userId, details: reason }
    });

    return { message: 'User banned successfully' };
  }
};
