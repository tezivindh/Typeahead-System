import { Request, Response } from 'express';
import * as path from 'path';
import { DatasetLoader } from '../dataset/dataset-loader';
import { generateCSV } from '../dataset/generate-dataset';
import { batchWriter } from '../workers/batch-writer';
import { SearchQuery } from '../models/query.model';
import { metricsService } from '../metrics/metrics.service';
import { cacheService } from '../services/cache.service';
import { logger } from '../utils/logger';

export const loadDataset = async (_req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  metricsService.recordRequest();

  try {
    // Generate the dataset file (either parsing ORCAS tsv or falling back to synthetic)
    await generateCSV();

    const csvPath = path.join('/home/tezivindh/Desktop/Typeahead System', 'dataset.csv');
    const count = await DatasetLoader.loadDataset(csvPath);
    
    res.json({ inserted: count });
  } catch (error: any) {
    logger.error('Error loading dataset:', error);
    res.status(500).json({ error: error.message || 'Failed to load dataset' });
  } finally {
    metricsService.recordLatency(Date.now() - startTime);
  }
};

/**
 * Simulates a high-throughput user workload to generate realistic performance metrics.
 * Simulates:
 * - 70% Autocomplete Lookups (GET /suggest) - with common prefixes.
 * - 25% Popular Searches (POST /search) - results in batching.
 * - 5% Random New Searches (POST /search) - creates new entries in DB.
 */
export const simulateWorkload = async (req: Request, res: Response): Promise<void> => {
  metricsService.recordRequest();
  const startTime = Date.now();

  const countParam = req.query.requests;
  const requestsCount = countParam ? parseInt(countParam as string, 10) : 500;

  logger.info(`Starting workload simulation of ${requestsCount} requests...`);

  // Popular prefix templates to trigger hits/misses
  const popularPrefixes = [
    'iph', 'ipho', 'iphon', 'iphone',
    'reac', 'react', 'next', 'nextjs',
    'pyth', 'pytho', 'python',
    'java', 'javas', 'javasc', 'javascr', 'javascript',
    'nik', 'nike', 'adi', 'adid', 'adidas',
    'coff', 'coffe', 'coffee',
    'tes', 'tesl', 'tesla'
  ];

  // Popular search queries
  const popularSearches = [
    'iphone 15 pro', 'iphone charger', 'iphone case',
    'react tutorial', 'react guide', 'nextjs tutorial',
    'python tutorial', 'python crash course',
    'javascript guide', 'javascript interview questions',
    'nike shoes', 'adidas sneakers',
    'coffee recipe', 'cappuccino machine',
    'tesla model 3', 'tesla price'
  ];

  // Random word parts to generate new searches
  const randomBases = ['cloud', 'data', 'block', 'chain', 'smart', 'contract', 'cyber', 'secure', 'crypto', 'wallet'];
  const randomSuffixes = ['service', 'app', 'platform', 'tool', 'network', 'expert', 'system', 'engine', 'hub'];

  try {
    // We will execute the simulation in small asynchronous batches to avoid locking the thread completely
    let processed = 0;
    const batchSize = 50;

    while (processed < requestsCount) {
      const currentBatchSize = Math.min(batchSize, requestsCount - processed);
      const promises = [];

      for (let i = 0; i < currentBatchSize; i++) {
        const rand = Math.random();
        
        if (rand < 0.70) {
          // 70% Autocomplete lookups
          const prefix = popularPrefixes[Math.floor(Math.random() * popularPrefixes.length)];
          promises.push((async () => {
            const start = Date.now();
            metricsService.recordRequest();
            // Cache lookup
            const hit = cacheService.get(prefix);
            if (hit === null) {
              // DB fetch simulation
              const regex = new RegExp(`^${prefix}`);
              const dbResults = await SearchQuery.find({ query: regex })
                .sort({ score: -1 })
                .limit(10)
                .lean();
              metricsService.recordDbRead(1);
              const suggestions = dbResults.map(doc => ({
                query: doc.query,
                count: doc.count,
                recentCount: doc.recentCount,
                score: doc.score
              }));
              cacheService.set(prefix, suggestions);
            }
            metricsService.recordLatency(Date.now() - start);
          })());
        } else if (rand < 0.95) {
          // 25% Popular search submissions
          const query = popularSearches[Math.floor(Math.random() * popularSearches.length)];
          promises.push((async () => {
            metricsService.recordRequest();
            const start = Date.now();
            batchWriter.enqueue(query);
            metricsService.recordLatency(Date.now() - start);
          })());
        } else {
          // 5% Random new search submissions
          const base = randomBases[Math.floor(Math.random() * randomBases.length)];
          const suffix = randomSuffixes[Math.floor(Math.random() * randomSuffixes.length)];
          const query = `${base} ${suffix}`;
          promises.push((async () => {
            metricsService.recordRequest();
            const start = Date.now();
            batchWriter.enqueue(query);
            metricsService.recordLatency(Date.now() - start);
          })());
        }
      }

      await Promise.all(promises);
      processed += currentBatchSize;
    }

    // Force flush the batch updates so that database writes are completed and metrics reflect the flush!
    await batchWriter.flush();

    const duration = Date.now() - startTime;
    logger.info(`Workload simulation of ${requestsCount} requests completed in ${duration}ms.`);
    
    res.json({
      message: `Simulated ${requestsCount} operations successfully.`,
      durationMs: duration,
      currentMetrics: metricsService.getMetrics()
    });
  } catch (error: any) {
    logger.error('Error during workload simulation:', error);
    res.status(500).json({ error: error.message || 'Simulation failed' });
  } finally {
    metricsService.recordLatency(Date.now() - startTime);
  }
};
