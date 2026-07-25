import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { requireAuth } from '../middleware/auth'; // Our JWT protection

const router = Router();

// Notice we put `requireAuth` in the middle! It intercepts the request, 
// checks the JWT, and ONLY lets them through to the controller if valid.
router.get('/me', requireAuth, UserController.getMe);
router.put('/onboard', requireAuth, UserController.onboard);

export default router;