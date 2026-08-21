import { Request, Response } from 'express';
import { ChatService } from '../services/chat.service';
import { UploadService } from '../services/upload.service';

export const ChatController = {
  async sendMessage(req: Request, res: Response) {
    try {
      // @ts-ignore
      const senderId = req.user.id;
      const { receiverId, content, mediaUrl, videoDuration } = req.body;
      if (!receiverId || !content) {
        res.status(400).json({ error: 'receiverId and content are required' });
        return;
      }
      const message = await ChatService.saveMessage(senderId, receiverId, content, mediaUrl, videoDuration);
      res.status(201).json(message);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async getHistory(req: Request, res: Response) {
    try {
      // @ts-ignore
      const userId = req.user.id;
      const otherUserId = req.params.otherUserId as string;
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
      const userId = req.user.id;
      const senderId = req.params.senderId as string;
      await ChatService.markAsRead(senderId, userId);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async addVideoFeedback(req: Request, res: Response) {
    try {
      // @ts-ignore
      const coachId = req.user.id;
      const { messageId, timestamp, note } = req.body;
      if (!messageId || timestamp == null || !note) {
        res.status(400).json({ error: 'messageId, timestamp, and note are required' });
        return;
      }
      const feedback = await ChatService.addVideoFeedback(messageId, coachId, Number(timestamp), note);
      res.status(201).json(feedback);
    } catch (err: any) {
      res.status(403).json({ error: err.message });
    }
  },

  async getPresignedUrl(req: Request, res: Response) {
    try {
      const data = UploadService.getPresignedUrl();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
};
