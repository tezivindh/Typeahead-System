import { SystemMetrics } from '../types';

export class MetricsService {
  private totalRequests = 0;
  private cacheHits = 0;
  private cacheMisses = 0;
  private dbReads = 0;
  private dbWrites = 0;
  private batchFlushCount = 0;
  private writesSaved = 0;
  
  // Latencies sliding window (bounded memory)
  private latencies: number[] = [];
  private readonly maxLatencyWindow = 2000;

  public recordRequest(): void {
    this.totalRequests++;
  }

  public recordCacheHit(): void {
    this.cacheHits++;
  }

  public recordCacheMiss(): void {
    this.cacheMisses++;
  }

  public recordDbRead(count = 1): void {
    this.dbReads += count;
  }

  public recordDbWrite(count = 1): void {
    this.dbWrites += count;
  }

  public recordBatchFlush(writesSaved: number): void {
    this.batchFlushCount++;
    this.writesSaved += writesSaved;
  }

  public recordLatency(ms: number): void {
    this.latencies.push(ms);
    if (this.latencies.length > this.maxLatencyWindow) {
      this.latencies.shift();
    }
  }

  /**
   * Compiles the tracked statistics and formatting rates.
   */
  public getMetrics(): SystemMetrics {
    const hitsAndMisses = this.cacheHits + this.cacheMisses;
    const cacheHitRate = hitsAndMisses > 0 
      ? `${((this.cacheHits / hitsAndMisses) * 100).toFixed(1)}%` 
      : '0.0%';

    // Average Latency
    const avgLatency = this.latencies.length > 0
      ? this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length
      : 0;

    // P95 Latency
    let p95Latency = 0;
    if (this.latencies.length > 0) {
      const sorted = [...this.latencies].sort((a, b) => a - b);
      const idx = Math.floor(sorted.length * 0.95);
      p95Latency = sorted[Math.min(idx, sorted.length - 1)];
    }

    // Write reduction percentage
    const totalLogicalWrites = this.dbWrites + this.writesSaved;
    const writeReduction = totalLogicalWrites > 0
      ? `${((this.writesSaved / totalLogicalWrites) * 100).toFixed(1)}%`
      : '0.0%';

    return {
      totalRequests: this.totalRequests,
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      dbReads: this.dbReads,
      dbWrites: this.dbWrites,
      batchFlushCount: this.batchFlushCount,
      writesSaved: this.writesSaved,
      cacheHitRate,
      avgLatencyMs: `${avgLatency.toFixed(1)}ms`,
      p95LatencyMs: `${p95Latency.toFixed(1)}ms`,
      writeReductionPercent: writeReduction
    };
  }

  /**
   * Resets all counter metrics.
   */
  public reset(): void {
    this.totalRequests = 0;
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.dbReads = 0;
    this.dbWrites = 0;
    this.batchFlushCount = 0;
    this.writesSaved = 0;
    this.latencies = [];
  }
}

export const metricsService = new MetricsService();
