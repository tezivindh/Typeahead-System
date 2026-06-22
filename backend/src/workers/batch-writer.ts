import { SearchQuery } from '../models/query.model';
import { cacheService } from '../services/cache.service';
import { metricsService } from '../metrics/metrics.service';
import { logger } from '../utils/logger';

export class BatchWriter {
  private queue: Map<string, number> = new Map();
  private intervalId: NodeJS.Timeout | null = null;
  
  private readonly maxBatchSize: number;
  private readonly flushIntervalMs: number;
  private readonly invalidationMode: string;
  private readonly lambda: number;

  constructor() {
    this.maxBatchSize = parseInt(process.env.BATCH_MAX_SIZE || '100', 10);
    this.flushIntervalMs = parseInt(process.env.BATCH_FLUSH_INTERVAL_MS || '5000', 10);
    this.invalidationMode = process.env.CACHE_INVALIDATION_MODE || 'active';
    this.lambda = parseFloat(process.env.DECAY_RATE_LAMBDA || '0.05');
  }

  /**
   * Starts the periodic flush timer.
   */
  public start(): void {
    if (this.intervalId) return;
    
    this.intervalId = setInterval(() => {
      this.flush();
    }, this.flushIntervalMs);
    logger.info(`BatchWriter started: Max Batch Size = ${this.maxBatchSize}, Interval = ${this.flushIntervalMs}ms`);
  }

  /**
   * Stops the periodic flush timer.
   */
  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Enqueues a search query. Flushes if batch size limit is reached.
   */
  public enqueue(query: string): void {
    const cleanQuery = query.trim().toLowerCase();
    if (!cleanQuery) return;

    const currentCount = this.queue.get(cleanQuery) || 0;
    this.queue.set(cleanQuery, currentCount + 1);

    // If total accumulated search operations exceed max batch size, flush immediately
    let totalQueued = 0;
    for (const count of this.queue.values()) {
      totalQueued += count;
    }

    if (totalQueued >= this.maxBatchSize) {
      logger.info(`Batch size reached (${totalQueued}), forcing immediate flush.`);
      // Run flush in the next tick to avoid blocking the request
      process.nextTick(() => this.flush());
    }
  }

  /**
   * Flushes queued searches to MongoDB using bulk updates with pipeline-based decay and scores.
   */
  public async flush(): Promise<void> {
    if (this.queue.size === 0) return;

    // Snapshot the current queue and clear it for incoming requests
    const batchSnapshot = new Map(this.queue);
    this.queue.clear();

    const startTime = Date.now();
    const totalLogicalSearches = Array.from(batchSnapshot.values()).reduce((sum, val) => sum + val, 0);

    try {
      const now = new Date();
      
      // Build bulk operations using aggregation pipeline for updates to calculate decay
      const operations = Array.from(batchSnapshot.entries()).map(([query, count]) => {
        return {
          updateOne: {
            filter: { query },
            update: [
              {
                $set: {
                  // Decay recentCount if lastSearchedAt is present, otherwise start at 0
                  recentCount: {
                    $let: {
                      vars: {
                        ageHours: {
                          $cond: [
                            { $ifNull: ['$lastSearchedAt', false] },
                            {
                              $divide: [
                                { $subtract: [now, '$lastSearchedAt'] },
                                1000 * 60 * 60 // Convert ms to hours
                              ]
                            },
                            0
                          ]
                        }
                      },
                      in: {
                        $add: [
                          {
                            $multiply: [
                              { $ifNull: ['$recentCount', 0] },
                              { $exp: { $multiply: [-this.lambda, '$$ageHours'] } }
                            ]
                          },
                          count // Increment with current batch counts
                        ]
                      }
                    }
                  },
                  count: { $add: [{ $ifNull: ['$count', 0] }, count] },
                  lastSearchedAt: now,
                  createdAt: { $ifNull: ['$createdAt', now] }
                }
              },
              {
                // Dynamic final score recalculation
                $set: {
                  score: {
                    $add: [
                      { $multiply: ['$count', 0.7] },
                      { $multiply: ['$recentCount', 0.3] }
                    ]
                  }
                }
              }
            ],
            upsert: true
          }
        };
      });

      // Execute bulkWrite
      if (operations.length > 0) {
        await SearchQuery.bulkWrite(operations, { ordered: false });
        
        // Track stats
        metricsService.recordDbWrite(1); // 1 physical db write operation
        const writesSaved = totalLogicalSearches - 1;
        metricsService.recordBatchFlush(writesSaved);

        const duration = Date.now() - startTime;
        logger.info(
          `Batch flushed: ${operations.length} unique queries (${totalLogicalSearches} total searches) written in ${duration}ms. Writes saved: ${writesSaved}`
        );

        // Perform active cache invalidation if configured
        if (this.invalidationMode === 'active') {
          for (const query of batchSnapshot.keys()) {
            cacheService.invalidatePrefixes(query);
          }
        }
      }
    } catch (error) {
      logger.error('Error flushing query batch to database:', error);
      // Put snapshotted queries back into the queue to avoid loss
      for (const [query, count] of batchSnapshot.entries()) {
        this.queue.set(query, (this.queue.get(query) || 0) + count);
      }
    }
  }

  /**
   * Retrieves a snapshot of the current queue for statistics visualization.
   */
  public getQueueSnapshot(): Record<string, number> {
    const result: Record<string, number> = {};
    for (const [query, count] of this.queue.entries()) {
      result[query] = count;
    }
    return result;
  }
}

// Export singleton
export const batchWriter = new BatchWriter();
