import { Request, Response } from 'express';
import { metricsService } from '../metrics/metrics.service';
import { logger } from '../utils/logger';
import mongoose from 'mongoose';

export const getMetrics = async (_req: Request, res: Response): Promise<void> => {
  try {
    const metrics = metricsService.getMetrics();
    const dbConnected = mongoose.connection.readyState === 1;
    res.json({
      ...metrics,
      dbConnected,
    });
  } catch (error) {
    logger.error('Error fetching metrics:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
