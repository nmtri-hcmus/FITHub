import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// Endpoint for any authenticated user to create a report
router.post('/reports', requireAuth, AdminController.createReport);

// All other endpoints require ADMIN role
const requireAdmin = [requireAuth, requireRole(['ADMIN'])];

router.get('/pending-coaches', requireAdmin, AdminController.getPendingCoaches);
router.post('/verify-coach/:id', requireAdmin, AdminController.verifyCoach);

router.get('/pending-recipes', requireAdmin, AdminController.getPendingRecipes);
router.post('/approve-recipe/:id', requireAdmin, AdminController.approveRecipe);

router.get('/pending-groups', requireAdmin, AdminController.getPendingGroups);
router.post('/approve-group/:id', requireAdmin, AdminController.approveGroup);

router.get('/reports', requireAdmin, AdminController.getReports);
router.post('/reports/:id/resolve', requireAdmin, AdminController.resolveReport);

router.post('/users/:id/ban', requireAdmin, AdminController.banUser);

router.get('/pending-posts', requireAdmin, AdminController.getPendingPosts);
router.post('/approve-post/:id', requireAdmin, AdminController.approvePost);

router.post('/challenges', requireAdmin, AdminController.createChallenge);

export default router;
