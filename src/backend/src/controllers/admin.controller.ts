import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { AdminService } from '../services/admin.service';
import { prisma } from '../lib/prisma'; // For creating reports (not admin-only)

export const AdminController = {
  // --- Coaches ---
  async getPendingCoaches(req: AuthRequest, res: Response): Promise<void> {
    try {
      const coaches = await AdminService.getPendingCoaches();
      res.json(coaches);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async verifyCoach(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { decision } = req.body; // 'APPROVED' | 'REJECTED'
      const result = await AdminService.verifyCoach(req.user!.id, String(req.params.id), decision);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },

  // --- Recipes ---
  async getPendingRecipes(req: AuthRequest, res: Response): Promise<void> {
    try {
      const recipes = await AdminService.getPendingRecipes();
      res.json(recipes);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async approveRecipe(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { decision } = req.body;
      const result = await AdminService.approveRecipe(req.user!.id, String(req.params.id), decision);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },

  // --- SubCommunities ---
  async getPendingGroups(req: AuthRequest, res: Response): Promise<void> {
    try {
      const groups = await AdminService.getPendingGroups();
      res.json(groups);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async approveGroup(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { decision } = req.body;
      const result = await AdminService.approveGroup(req.user!.id, String(req.params.id), decision);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },

  // --- Reports & Bans ---
  async getReports(req: AuthRequest, res: Response): Promise<void> {
    try {
      const reports = await AdminService.getReports();
      res.json(reports);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async resolveReport(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { decision } = req.body; // 'WARN' | 'BAN' | 'DISMISS'
      const result = await AdminService.resolveReport(req.user!.id, String(req.params.id), decision);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },

  async banUser(req: AuthRequest, res: Response): Promise<void> {
    try {
      const result = await AdminService.banUser(req.user!.id, String(req.params.id));
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },

  async getPendingPosts(req: AuthRequest, res: Response): Promise<void> {
    try {
      const posts = await AdminService.getPendingPosts();
      res.json(posts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async approvePost(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { decision } = req.body;
      const result = await AdminService.approvePost(req.user!.id, String(req.params.id), decision);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },

  async createChallenge(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { title, description, startDate, endDate, criteria } = req.body;
      const challenge = await AdminService.createChallenge(
        req.user!.id,
        title,
        description,
        startDate,
        endDate,
        criteria
      );
      res.status(201).json(challenge);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },

  // Public endpoint for normal users to report someone
  async createReport(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { reportedUserId, reason } = req.body;
      const report = await prisma.report.create({
        data: {
          reporterId: req.user!.id,
          reportedUserId,
          reason
        }
      });
      res.status(201).json(report);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
};
