import { Request, Response } from 'express';
import { cacheService } from '../services/cache.service';
import { metricsService } from '../metrics/metrics.service';
import { logger } from '../utils/logger';

export const getCacheStats = async (_req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  metricsService.recordRequest();
  try {
    const stats = cacheService.getStats();
    res.json(stats);
  } catch (error) {
    logger.error('Error fetching cache stats:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    metricsService.recordLatency(Date.now() - startTime);
  }
};

export const getCacheDebug = async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  metricsService.recordRequest();
  try {
    const { prefix } = req.query;
    if (!prefix || typeof prefix !== 'string') {
      res.status(400).json({ error: 'Prefix query parameter is required' });
      metricsService.recordLatency(Date.now() - startTime);
      return;
    }

    const debugInfo = cacheService.getDebugInfo(prefix);
    res.json(debugInfo);
  } catch (error) {
    logger.error('Error debugging cache routing:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    metricsService.recordLatency(Date.now() - startTime);
  }
};

export const toggleCacheNode = async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  metricsService.recordRequest();
  try {
    const { nodeName, online } = req.body;
    if (!nodeName || typeof online !== 'boolean') {
      res.status(400).json({ error: 'nodeName and online boolean are required' });
      metricsService.recordLatency(Date.now() - startTime);
      return;
    }

    cacheService.toggleNodeStatus(nodeName, online);
    res.json({ success: true, message: `Node ${nodeName} status set to ${online ? 'online' : 'offline'}` });
  } catch (error: any) {
    logger.error('Error toggling cache node:', error);
    res.status(400).json({ error: error.message || 'Failed to toggle cache node' });
  } finally {
    metricsService.recordLatency(Date.now() - startTime);
  }
};
