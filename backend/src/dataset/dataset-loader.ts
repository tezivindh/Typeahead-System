import * as fs from 'fs';
import * as readline from 'readline';
import { SearchQuery } from '../models/query.model';
import { logger } from '../utils/logger';
import { metricsService } from '../metrics/metrics.service';
import { cacheService } from '../services/cache.service';

export class DatasetLoader {
  /**
   * Reads and parses dataset.csv, groups duplicates, clears the database, and loads records in bulk chunks.
   * @param filePath Absolute path to the CSV file
   */
  public static async loadDataset(filePath: string): Promise<number> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Dataset file not found at: ${filePath}`);
    }

    logger.info(`Starting dataset loading from: ${filePath}`);
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    const queryCounts = new Map<string, number>();
    let isHeader = true;
    let lineCount = 0;

    for await (const line of rl) {
      if (isHeader) {
        isHeader = false;
        continue;
      }

      lineCount++;
      const lastCommaIdx = line.lastIndexOf(',');
      if (lastCommaIdx === -1) continue;

      const rawQuery = line.substring(0, lastCommaIdx).trim();
      const rawCount = line.substring(lastCommaIdx + 1).trim();

      const query = rawQuery.replace(/^"|"$/g, '').toLowerCase().trim();
      const count = parseInt(rawCount, 10);

      if (!query || isNaN(count)) continue;

      // Aggregate counts if duplicate queries exist in dataset
      const currentCount = queryCounts.get(query) || 0;
      queryCounts.set(query, currentCount + count);
    }

    logger.info(`Parsed ${lineCount} lines. Found ${queryCounts.size} unique queries. Clearing collection...`);
    
    // Clear existing data and cache to start fresh
    await SearchQuery.deleteMany({});
    cacheService.clearAll();
    metricsService.reset();

    logger.info('Database cleared. Performing chunked bulk insertion...');

    const queriesArray = Array.from(queryCounts.entries());
    const chunkSize = 5000;
    let insertedCount = 0;
    const now = new Date();

    for (let i = 0; i < queriesArray.length; i += chunkSize) {
      const chunk = queriesArray.slice(i, i + chunkSize);
      
      const docs = chunk.map(([query, count]) => ({
        query,
        count,
        recentCount: 0,
        score: count * 0.7, // Initial score calculation with 0 recentCount
        lastSearchedAt: now,
      }));

      // Insert chunk
      await SearchQuery.insertMany(docs, { ordered: false });
      insertedCount += docs.length;
      metricsService.recordDbWrite(1); // 1 bulk insert operation
      
      logger.info(`Inserted ${insertedCount} / ${queriesArray.length} records.`);
    }

    logger.info('Dataset ingestion successfully completed.');
    return insertedCount;
  }
}
