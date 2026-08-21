import { Router } from 'express';
import { ChatController } from '../controllers/chat.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Send a message (coach or trainee)
router.post('/', requireAuth, ChatController.sendMessage);

// Get presigned URL for video uploads
router.get('/upload-url', requireAuth, ChatController.getPresignedUrl);

// Add video feedback note (coach only)
router.post('/feedback', requireAuth, ChatController.addVideoFeedback);

// Chat History with a specific user
router.get('/:otherUserId', requireAuth, ChatController.getHistory);
router.put('/:senderId/read', requireAuth, ChatController.markAsRead);

export default router;
