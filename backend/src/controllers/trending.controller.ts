import { Request, Response } from 'express';
import { SearchQuery } from '../models/query.model';
import { metricsService } from '../metrics/metrics.service';
import { Suggestion } from '../types';
import { logger } from '../utils/logger';

export const getTrendingController = async (_req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  metricsService.recordRequest();

  try {
    // 1. Fetch active trending queries with non-zero recentCount
    const dbResults = await SearchQuery.find({ recentCount: { $gt: 0 } })
      .sort({ recentCount: -1, count: -1 })
      .limit(20)
      .lean();

    metricsService.recordDbRead(1); // 1 DB read operation

    const trending: Suggestion[] = dbResults.map((doc) => ({
      query: doc.query,
      count: doc.count,
      recentCount: doc.recentCount,
      score: doc.score,
    }));

    // 2. If less than 20 items, backfill with overall popular items by count
    if (trending.length < 20) {
      const needed = 20 - trending.length;
      const excludeQueries = trending.map((item) => item.query);
      
      const backfillResults = await SearchQuery.find({ query: { $nin: excludeQueries } })
        .sort({ count: -1 })
        .limit(needed)
        .lean();
        
      metricsService.recordDbRead(1); // 1 DB read operation

      const backfill: Suggestion[] = backfillResults.map((doc) => ({
        query: doc.query,
        count: doc.count,
        recentCount: doc.recentCount,
        score: doc.score,
      }));

      trending.push(...backfill);
    }

    res.json(trending);
  } catch (error) {
    logger.error('Error fetching trending searches:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    metricsService.recordLatency(Date.now() - startTime);
  }
};
