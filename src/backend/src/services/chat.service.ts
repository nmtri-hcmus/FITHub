import { prisma } from '../lib/prisma';

export const ChatService = {
  generateConversationKey(user1: string, user2: string) {
    return [user1, user2].sort().join(':');
  },

  async saveMessage(
    senderId: string,
    receiverId: string,
    content: string,
    mediaUrl?: string,
    videoDuration?: number
  ) {
    const conversationKey = this.generateConversationKey(senderId, receiverId);
    return prisma.message.create({
      data: {
        conversationKey,
        senderId,
        receiverId,
        content,
        mediaUrl,
        videoDuration,
        isRead: false,
      },
      include: {
        sender: { select: { id: true, name: true } },
        feedbackNotes: true,
      },
    });
  },

  async getMessages(user1: string, user2: string, page: number = 1, limit: number = 50) {
    const conversationKey = this.generateConversationKey(user1, user2);
    const skip = (page - 1) * limit;

    const messages = await prisma.message.findMany({
      where: { conversationKey },
      orderBy: { createdAt: 'asc' },
      skip,
      take: limit,
      include: {
        sender: { select: { id: true, name: true } },
        feedbackNotes: { orderBy: { timestamp: 'asc' } },
      },
    });
    return messages;
  },

  async markAsRead(senderId: string, receiverId: string) {
    const conversationKey = this.generateConversationKey(senderId, receiverId);
    await prisma.message.updateMany({
      where: { conversationKey, receiverId, isRead: false },
      data: { isRead: true },
    });
  },

  async addVideoFeedback(messageId: string, coachId: string, timestamp: number, note: string) {
    // Verify the message exists and belongs to this conversation
    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message) throw new Error('Message not found');
    if (message.receiverId !== coachId && message.senderId !== coachId) {
      throw new Error('Unauthorized: You are not part of this conversation');
    }

    return prisma.videoFeedback.create({
      data: { messageId, timestamp, note },
    });
  },
};
