import { SearchQuery } from '../models/query.model';
import { logger } from '../utils/logger';
import { metricsService } from '../metrics/metrics.service';

export class DecayWorker {
  private intervalId: NodeJS.Timeout | null = null;
  private readonly decayIntervalMs = 30000; // Run decay checks every 30 seconds
  private readonly lambda: number;

  constructor() {
    this.lambda = parseFloat(process.env.DECAY_RATE_LAMBDA || '0.05');
  }

  /**
   * Starts the background decay timer.
   */
  public start(): void {
    if (this.intervalId) return;

    this.intervalId = setInterval(() => {
      this.decayScores();
    }, this.decayIntervalMs);
    logger.info(`DecayWorker started: Interval = ${this.decayIntervalMs}ms, Lambda = ${this.lambda}`);
  }

  /**
   * Stops the background decay timer.
   */
  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Scans and decays all queries in MongoDB where recentCount > 0.
   */
  public async decayScores(): Promise<void> {
    const startTime = Date.now();
    try {
      const now = new Date();

      // Perform a bulk update using MongoDB aggregation pipeline to decay active counts
      const result = await SearchQuery.updateMany(
        { recentCount: { $gt: 0 } },
        [
          {
            $set: {
              recentCount: {
                $let: {
                  vars: {
                    ageHours: {
                      $divide: [
                        { $subtract: [now, '$lastSearchedAt'] },
                        1000 * 60 * 60 // convert to hours
                      ]
                    }
                  },
                  in: {
                    $multiply: [
                      '$recentCount',
                      { $exp: { $multiply: [-this.lambda, '$$ageHours'] } }
                    ]
                  }
                }
              },
              updatedAt: now
            }
          },
          {
            // Drop small fractions to 0 to prevent infinite decay updates
            $set: {
              recentCount: {
                $cond: [
                  { $lt: ['$recentCount', 0.01] },
                  0,
                  '$recentCount'
                ]
              }
            }
          },
          {
            // Update scores based on decayed recent counts
            $set: {
              score: {
                $add: [
                  { $multiply: ['$count', 0.7] },
                  { $multiply: ['$recentCount', 0.3] }
                ]
              }
            }
          }
        ]
      );

      if (result.modifiedCount > 0) {
        metricsService.recordDbWrite(1); // 1 physical write operation
        const duration = Date.now() - startTime;
        logger.info(
          `Decay worker completed: Decayed ${result.modifiedCount} active queries in ${duration}ms.`
        );
      }
    } catch (error) {
      logger.error('Error executing decay scores in background:', error);
    }
  }
}

// Export singleton
export const decayWorker = new DecayWorker();
