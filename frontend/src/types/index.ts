export interface Suggestion {
  query: string;
  count: number;
  recentCount: number;
  score: number;
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
  dbConnected?: boolean;
}

export interface CacheNodeStats {
  size: number;
  keys: string[];
  data: Record<string, { value: Suggestion[]; expiryLeftMs: number }>;
  online?: boolean;
}

export type CacheStats = Record<string, CacheNodeStats>;

export interface CacheDebugInfo {
  prefix: string;
  hash: number;
  node: string;
  cacheHit: boolean;
}
