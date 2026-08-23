import { Router } from 'express';
import { CommunityController } from '../controllers/community.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Posts
router.post('/posts', requireAuth, CommunityController.createPost);
router.get('/posts', CommunityController.getPosts); // Public or Auth? Make it public
router.get('/posts/:id', CommunityController.getPostDetails);
router.post('/posts/:id/comments', requireAuth, CommunityController.createComment);

// Sub-Communities
router.post('/groups', requireAuth, CommunityController.createSubCommunity);
router.get('/groups', CommunityController.getSubCommunities);
router.post('/groups/:id/join', requireAuth, CommunityController.joinSubCommunity);

// Gamification
router.get('/leaderboards', CommunityController.getLeaderboards);
router.get('/challenges', CommunityController.getChallenges);
router.post('/challenges/:id/join', requireAuth, CommunityController.joinChallenge);

export default router;
