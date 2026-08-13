import { Request, Response } from 'express';
import { ChatService } from '../services/chat.service';
import { UploadService } from '../services/upload.service';

export const ChatController = {
  async getHistory(req: Request, res: Response) {
    try {
      // @ts-ignore
      const userId = req.user.id;
      const otherUserId = (req.params.otherUserId as string);
      const page = parseInt(req.query.page as string) || 1;

      const messages = await ChatService.getMessages(userId, otherUserId, page);
      res.json(messages);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async markAsRead(req: Request, res: Response) {
    try {
      // @ts-ignore
      const userId = req.user.id; // receiver
      const senderId = (req.params.senderId as string);

      await ChatService.markAsRead(senderId, userId);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async getPresignedUrl(req: Request, res: Response) {
    try {
      const data = UploadService.getPresignedUrl();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
};
