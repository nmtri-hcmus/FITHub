import { prisma } from '../lib/prisma';

export const ChatService = {
  /**
   * Generates a consistent conversation key based on two user IDs.
   * By sorting them, A-B and B-A always produce the same key.
   */
  generateConversationKey(user1: string, user2: string) {
    return [user1, user2].sort().join(':');
  },

  async saveMessage(senderId: string, receiverId: string, content: string, mediaUrl?: string) {
    const conversationKey = this.generateConversationKey(senderId, receiverId);
    
    return prisma.message.create({
      data: {
        conversationKey,
        senderId,
        receiverId,
        content,
        mediaUrl,
        isRead: false
      },
      include: {
        sender: { select: { id: true, name: true } }
      }
    });
  },

  async getMessages(user1: string, user2: string, page: number = 1, limit: number = 20) {
    const conversationKey = this.generateConversationKey(user1, user2);
    const skip = (page - 1) * limit;

    return prisma.message.findMany({
      where: { conversationKey },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        sender: { select: { id: true, name: true } }
      }
    });
  },

  async markAsRead(senderId: string, receiverId: string) {
    const conversationKey = this.generateConversationKey(senderId, receiverId);
    
    // If current user is receiverId, mark messages sent by senderId as read
    await prisma.message.updateMany({
      where: { 
        conversationKey,
        receiverId: receiverId, // The person who is reading
        isRead: false
      },
      data: { isRead: true }
    });
  }
};
