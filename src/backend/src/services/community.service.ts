import { prisma } from '../lib/prisma';
import { wordFilter } from '../utils/word-filter';

export const CommunityService = {
  // --- Sub-Communities ---
  async createSubCommunity(userId: string, name: string, description?: string) {
    // Automatically make creator an ADMIN
    const sub = await prisma.subCommunity.create({
      data: {
        name,
        description,
        createdById: userId,
        status: 'PENDING', // requires admin approval
        members: {
          create: {
            userId,
            role: 'ADMIN'
          }
        }
      }
    });
    return sub;
  },

  async getApprovedSubCommunities() {
    return prisma.subCommunity.findMany({
      where: { status: 'APPROVED' },
      include: {
        _count: { select: { members: true, posts: true } }
      }
    });
  },

  async joinSubCommunity(userId: string, subCommunityId: string) {
    return prisma.subCommunityMember.create({
      data: { userId, subCommunityId }
    });
  },

  // --- Posts & Comments ---
  async createPost(userId: string, title: string, content: string, subCommunityId?: string) {
    const cleanTitle = wordFilter.censor(title);
    const cleanContent = wordFilter.censor(content);

    return prisma.post.create({
      data: {
        title: cleanTitle,
        content: cleanContent,
        authorId: userId,
        subCommunityId,
        status: 'PENDING'
      },
      include: { user: { select: { name: true, role: true } } }
    });
  },

  async getPosts(page: number = 1, limit: number = 20, subCommunityId?: string, userId?: string) {
    const skip = (page - 1) * limit;

    let whereClause: any = { status: 'APPROVED' };

    if (subCommunityId) {
      // Viewing a specific sub-community — show only that community's posts
      whereClause.subCommunityId = subCommunityId;
    } else {
      // General forum: show global posts (no subCommunityId) + posts from communities the user has joined
      if (userId) {
        // Fetch the sub-community IDs this user is a member of
        const memberships = await prisma.subCommunityMember.findMany({
          where: { userId },
          select: { subCommunityId: true }
        });
        const joinedIds = memberships.map((m: { subCommunityId: string }) => m.subCommunityId);

        whereClause = {
          status: 'APPROVED',
          OR: [
            { subCommunityId: null },                       // global posts
            { subCommunityId: { in: joinedIds } }           // joined community posts
          ]
        };
      } else {
        // Guest: only global posts
        whereClause.subCommunityId = null;
      }
    }

    return prisma.post.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        user: { select: { name: true, role: true, id: true } },
        subCommunity: { select: { id: true, name: true } },
        _count: { select: { comments: true } }
      }
    });
  },

  async getPostDetails(postId: string) {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        user: { select: { name: true, role: true } },
        comments: {
          orderBy: { createdAt: 'asc' },
          include: { user: { select: { name: true, role: true } } }
        }
      }
    });
    if (!post) throw new Error("Post not found");
    return post;
  },

  async createComment(userId: string, postId: string, content: string) {
    const cleanContent = wordFilter.censor(content);

    return prisma.comment.create({
      data: {
        content: cleanContent,
        authorId: userId,
        postId
      },
      include: { user: { select: { name: true, role: true } } }
    });
  },

  // --- Challenges ---
  async getActiveChallenges(userId?: string) {
    return prisma.challenge.findMany({
      where: {
        startDate: { lte: new Date() },
        endDate: { gte: new Date() }
      },
      include: {
        _count: { select: { participants: true } },
        ...(userId ? { participants: { where: { userId }, select: { id: true, progress: true, status: true } } } : {})
      }
    });
  },

  async joinChallenge(userId: string, challengeId: string) {
    return prisma.challengeParticipant.create({
      data: { userId, challengeId }
    });
  },

  async syncChallengeProgress(userId: string) {
    const participants = await prisma.challengeParticipant.findMany({
      where: { userId },
      include: { challenge: true }
    });

    for (const p of participants) {
      if (p.challenge.id === 'chal-001') {
        const count = await prisma.mealLog.count({
          where: { 
            userId,
            date: { gte: p.challenge.startDate, lte: p.challenge.endDate }
          }
        });
        await prisma.challengeParticipant.update({
          where: { id: p.id },
          data: { progress: count }
        });
      } else if (p.challenge.id === 'chal-002') {
        const count = await prisma.progressLog.count({
          where: { 
            userId,
            date: { gte: p.challenge.startDate, lte: p.challenge.endDate }
          }
        });
        await prisma.challengeParticipant.update({
          where: { id: p.id },
          data: { progress: count }
        });
      }
    }
  }
};
