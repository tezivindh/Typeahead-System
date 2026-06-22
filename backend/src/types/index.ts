export interface Suggestion {
  query: string;
  count: number;
  recentCount: number;
  score: number;
}

export interface CacheEntry {
  value: Suggestion[];
  expiry: number;
}

export interface SystemMetrics {
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  dbReads: number;
  dbWrites: number;
  batchFlushCount: number;
  writesSaved: number;
  cacheHitRate: string;
  avgLatencyMs: string;
  p95LatencyMs: string;
  writeReductionPercent: string;
}
