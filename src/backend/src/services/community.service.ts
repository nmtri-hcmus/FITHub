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
        subCommunityId
      },
      include: { user: { select: { name: true, role: true } } }
    });
  },

  async getPosts(page: number = 1, limit: number = 20, subCommunityId?: string) {
    const skip = (page - 1) * limit;
    
    return prisma.post.findMany({
      where: subCommunityId ? { subCommunityId } : {},
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        user: { select: { name: true, role: true } },
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
  async getActiveChallenges() {
    return prisma.challenge.findMany({
      where: {
        startDate: { lte: new Date() },
        endDate: { gte: new Date() }
      },
      include: {
        _count: { select: { participants: true } }
      }
    });
  },

  async joinChallenge(userId: string, challengeId: string) {
    return prisma.challengeParticipant.create({
      data: { userId, challengeId }
    });
  }
};
