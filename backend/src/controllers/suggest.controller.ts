import { Request, Response } from 'express';
import { SearchQuery } from '../models/query.model';
import { cacheService } from '../services/cache.service';
import { metricsService } from '../metrics/metrics.service';
import { Suggestion } from '../types';
import { logger } from '../utils/logger';

export const suggestController = async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  metricsService.recordRequest();

  try {
    const q = req.query.q;
    
    // Handle empty or missing prefix queries
    if (!q || typeof q !== 'string') {
      res.json([]);
      metricsService.recordLatency(Date.now() - startTime);
      return;
    }

    const prefix = q.trim().toLowerCase();
    if (!prefix) {
      res.json([]);
      metricsService.recordLatency(Date.now() - startTime);
      return;
    }

    // 1. Try consistent hashing lookup in distributed cache nodes
    const cachedResult = cacheService.get(prefix);
    if (cachedResult !== null) {
      res.json(cachedResult);
      metricsService.recordLatency(Date.now() - startTime);
      return;
    }

    // 2. Cache Miss: Query MongoDB
    // Retrieve up to 80 candidate terms containing the prefix key, then score & rank them in-memory
    const containsRegex = new RegExp(escapeRegex(prefix));
    const candidates = await SearchQuery.find({ query: containsRegex })
      .sort({ score: -1 })
      .limit(80)
      .lean();

    metricsService.recordDbRead(1); // 1 read operation

    const escapedPrefix = escapeRegex(prefix);
    const wordBoundaryRegex = new RegExp(`\\b${escapedPrefix}`);
    const exactWordRegex = new RegExp(`\\b${escapedPrefix}\\b`);

    const ranked = candidates.map((doc) => {
      let relevanceBonus = 0;
      const lowerQuery = doc.query.toLowerCase();

      // Priority 1: Prefix matching (starts with the query string)
      if (lowerQuery.startsWith(prefix)) {
        relevanceBonus += 1000;
      }

      // Priority 2: Word boundary matching (starts a word inside the query, e.g. "gym" in "24 hour gym")
      if (wordBoundaryRegex.test(lowerQuery)) {
        relevanceBonus += 500;
      }

      // Priority 3: Exact word matching (matches a full independent word, e.g. "gym" vs "gymnastics")
      if (exactWordRegex.test(lowerQuery)) {
        relevanceBonus += 200;
      }

      return {
        suggestion: {
          query: doc.query,
          count: doc.count,
          recentCount: doc.recentCount,
          score: doc.score,
        },
        finalScore: doc.score + relevanceBonus,
      };
    });

    // Sort by combined score descending and limit to top 10 results
    const suggestions: Suggestion[] = ranked
      .sort((a, b) => b.finalScore - a.finalScore)
      .slice(0, 10)
      .map((item) => item.suggestion);

    // 3. Set Cache for future requests
    cacheService.set(prefix, suggestions);

    res.json(suggestions);
  } catch (error) {
    logger.error('Error in suggest controller:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    metricsService.recordLatency(Date.now() - startTime);
  }
};

/**
 * Escapes regex special characters in a search string.
 */
function escapeRegex(text: string): string {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}
