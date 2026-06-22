import { Request, Response } from 'express';
import { batchWriter } from '../workers/batch-writer';
import { metricsService } from '../metrics/metrics.service';
import { logger } from '../utils/logger';

export const searchController = async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  metricsService.recordRequest();

  try {
    const { query } = req.body;

    if (!query || typeof query !== 'string') {
      res.status(400).json({ error: 'Query is required and must be a string' });
      metricsService.recordLatency(Date.now() - startTime);
      return;
    }

    const cleanQuery = query.trim();
    if (!cleanQuery) {
      res.status(400).json({ error: 'Query cannot be empty' });
      metricsService.recordLatency(Date.now() - startTime);
      return;
    }

    // Push into the batch processor queue. Return immediately (non-blocking database IO)
    batchWriter.enqueue(cleanQuery);

    // 202 Accepted indicates request accepted but processing not finalized
    res.status(202).json({ message: 'Searched' });
  } catch (error) {
    logger.error('Error in search controller:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    metricsService.recordLatency(Date.now() - startTime);
  }
};
