import axios from 'axios';
import { Suggestion, SystemMetrics, CacheStats, CacheDebugInfo } from '../types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const apiService = {
  /**
   * Fetches search suggestions for a given prefix.
   */
  async getSuggestions(q: string): Promise<Suggestion[]> {
    const response = await client.get<Suggestion[]>('/suggest', { params: { q } });
    return response.data;
  },

  /**
   * Submits a completed search query (buffered on the backend).
   */
  async submitSearch(query: string): Promise<{ message: string }> {
    const response = await client.post<{ message: string }>('/search', { query });
    return response.data;
  },

  /**
   * Fetches top 20 trending search terms.
   */
  async getTrending(): Promise<Suggestion[]> {
    const response = await client.get<Suggestion[]>('/trending');
    return response.data;
  },

  /**
   * Fetches system-wide observability metrics.
   */
  async getMetrics(): Promise<SystemMetrics> {
    const response = await client.get<SystemMetrics>('/metrics');
    return response.data;
  },

  /**
   * Fetches details of the distributed cache nodes.
   */
  async getCacheStats(): Promise<CacheStats> {
    const response = await client.get<CacheStats>('/cache/stats');
    return response.data;
  },

  /**
   * Debugs consistent hashing routing for a query prefix.
   */
  async getCacheDebug(prefix: string): Promise<CacheDebugInfo> {
    const response = await client.get<CacheDebugInfo>('/cache/debug', { params: { prefix } });
    return response.data;
  },

  /**
   * Toggles a cache node online/offline.
   */
  async toggleCacheNode(nodeName: string, online: boolean): Promise<{ success: boolean; message: string }> {
    const response = await client.post<{ success: boolean; message: string }>('/cache/node/toggle', { nodeName, online });
    return response.data;
  },

  /**
   * Loads the 100,000+ CSV dataset into the DB.
   */
  async loadDataset(): Promise<{ inserted: number }> {
    const response = await client.post<{ inserted: number }>('/admin/load-dataset');
    return response.data;
  },

  /**
   * Triggers a simulated high-throughput workload for demonstration.
   */
  async simulateWorkload(requests = 500): Promise<{ message: string; durationMs: number; currentMetrics: SystemMetrics }> {
    const response = await client.post<{ message: string; durationMs: number; currentMetrics: SystemMetrics }>(
      '/admin/simulate-workload',
      {},
      { params: { requests } }
    );
    return response.data;
  },
};
