import { Router } from 'express';
import { ChatController } from '../controllers/chat.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Uploads (Requires Auth)
router.get('/upload-url', requireAuth, ChatController.getPresignedUrl);

// Chat History
router.get('/:otherUserId', requireAuth, ChatController.getHistory);
router.put('/:senderId/read', requireAuth, ChatController.markAsRead);

export default router;
