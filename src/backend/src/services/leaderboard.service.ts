import { prisma } from '../lib/prisma';
import { createClient } from 'redis';

const redisClient = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
redisClient.on('error', (err: any) => console.error('Redis Leaderboard Client Error:', err));
redisClient.connect().catch(console.error);

export const LeaderboardService = {
  /**
   * Run by a cron job nightly.
   * Aggregates points/activity for the week and caches in Redis.
   */
  async calculateAndCacheLeaderboard() {
    console.log('[Leaderboard] Calculating weekly rankings...');
    
    // For this prototype, let's rank users by total calories burned (mocked via meal logs/progress or just random points for demo)
    // We'll just grab the top 100 users with the most meal logs as a proxy for "consistency"
    
    const rankingsRaw = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        _count: {
          select: { mealLogs: true, progressLogs: true }
        }
      }
    });

    // Score = 10 * mealLogs + 50 * progressLogs
    const scored = rankingsRaw.map(user => ({
      userId: user.id,
      name: user.name,
      score: (user._count.mealLogs * 10) + (user._count.progressLogs * 50)
    }));

    // Sort descending
    scored.sort((a, b) => b.score - a.score);
    const top100 = scored.slice(0, 100);

    // Cache to Redis with 24h expiry
    try {
      await redisClient.setEx('community:leaderboard:weekly', 86400, JSON.stringify(top100));
      console.log(`[Leaderboard] Cached top ${top100.length} users.`);
    } catch (e) {
      console.error('[Leaderboard] Failed to cache to Redis', e);
    }
  },

  /**
   * Served to the API instantly from Redis
   */
  async getCachedLeaderboard() {
    try {
      const data = await redisClient.get('community:leaderboard:weekly');
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error('[Leaderboard] Redis read error', e);
    }
    return []; // Return empty if cache misses or fails
  }
};
