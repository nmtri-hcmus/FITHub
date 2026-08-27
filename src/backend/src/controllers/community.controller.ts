import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { CommunityService } from '../services/community.service';
import { LeaderboardService } from '../services/leaderboard.service';

export const CommunityController = {
  // --- Posts ---
  async createPost(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { title, content, subCommunityId } = req.body;
      const post = await CommunityService.createPost(req.user!.id, title, content, subCommunityId);
      res.status(201).json(post);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },

  async getPosts(req: AuthRequest, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const subCommunityId = req.query.subCommunityId ? String(req.query.subCommunityId) : undefined;
      const userId = req.user?.id; // undefined for guests
      const posts = await CommunityService.getPosts(page, 20, subCommunityId, userId);
      res.json(posts);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },

  async getPostDetails(req: AuthRequest, res: Response): Promise<void> {
    try {
      const post = await CommunityService.getPostDetails(String(req.params.id));
      res.json(post);
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  },

  async createComment(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { content } = req.body;
      const comment = await CommunityService.createComment(req.user!.id, String(req.params.id), content);
      res.status(201).json(comment);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },

  // --- Sub-Communities ---
  async createSubCommunity(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { name, description } = req.body;
      const sub = await CommunityService.createSubCommunity(req.user!.id, name, description);
      res.status(201).json(sub);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },

  async getSubCommunities(req: AuthRequest, res: Response): Promise<void> {
    try {
      const subs = await CommunityService.getApprovedSubCommunities();
      res.json(subs);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },

  async joinSubCommunity(req: AuthRequest, res: Response): Promise<void> {
    try {
      const membership = await CommunityService.joinSubCommunity(req.user!.id, String(req.params.id));
      res.status(201).json(membership);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },

  // --- Gamification ---
  async getLeaderboards(req: AuthRequest, res: Response): Promise<void> {
    try {
      // Direct cache hit
      const rankings = await LeaderboardService.getCachedLeaderboard();
      res.json(rankings);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async getChallenges(req: AuthRequest, res: Response): Promise<void> {
    try {
      const challenges = await CommunityService.getActiveChallenges(req.user?.id);
      res.json(challenges);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },
  
  async joinChallenge(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) throw new Error('Not authenticated');
      await CommunityService.joinChallenge(req.user.id, req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },

  async syncChallengeProgress(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) throw new Error('Not authenticated');
      await CommunityService.syncChallengeProgress(req.user.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
};
