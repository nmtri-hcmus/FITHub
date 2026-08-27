import { Router } from 'express';
import { CommunityController } from '../controllers/community.controller';
import { requireAuth, optionalAuth } from '../middleware/auth';

const router = Router();

// Posts
router.post('/posts', requireAuth, CommunityController.createPost);
router.get('/posts', optionalAuth, CommunityController.getPosts); // Personalised when logged in
router.get('/posts/:id', CommunityController.getPostDetails);
router.post('/posts/:id/comments', requireAuth, CommunityController.createComment);

// Sub-Communities
router.post('/groups', requireAuth, CommunityController.createSubCommunity);
router.get('/groups', CommunityController.getSubCommunities);
router.post('/groups/:id/join', requireAuth, CommunityController.joinSubCommunity);

// Gamification
router.get('/leaderboards', CommunityController.getLeaderboards);
router.get('/challenges', optionalAuth, CommunityController.getChallenges);
router.post('/challenges/sync', requireAuth, CommunityController.syncChallengeProgress);
router.post('/challenges/:id/join', requireAuth, CommunityController.joinChallenge);

export default router;
