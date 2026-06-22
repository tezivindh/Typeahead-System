import { create } from 'zustand';
import { apiService } from '../services/api';
import { Suggestion, SystemMetrics, CacheStats, CacheDebugInfo } from '../types';

interface StoreState {
  query: string;
  suggestions: Suggestion[];
  trending: Suggestion[];
  metrics: SystemMetrics | null;
  cacheStats: CacheStats | null;
  cacheDebug: CacheDebugInfo | null;
  
  isLoadingSuggestions: boolean;
  isSimulating: boolean;
  isIngesting: boolean;
  error: string | null;
  apiOnline: boolean;
  dbConnected: boolean;

  setQuery: (q: string) => void;
  fetchSuggestions: (q: string) => Promise<void>;
  submitSearch: (queryText: string) => Promise<void>;
  fetchTrending: () => Promise<void>;
  fetchMetrics: () => Promise<void>;
  fetchCacheStats: () => Promise<void>;
  fetchCacheDebug: (prefix: string) => Promise<void>;
  loadDataset: () => Promise<number>;
  simulateWorkload: (requests?: number) => Promise<{ durationMs: number; currentMetrics: SystemMetrics }>;
  toggleCacheNode: (nodeName: string, online: boolean) => Promise<void>;
  clearCacheDebug: () => void;
}

export const useStore = create<StoreState>((set, get) => ({
  query: '',
  suggestions: [],
  trending: [],
  metrics: null,
  cacheStats: null,
  cacheDebug: null,
  
  isLoadingSuggestions: false,
  isSimulating: false,
  isIngesting: false,
  error: null,
  apiOnline: false,
  dbConnected: false,

  setQuery: (q) => {
    set({ query: q });
    if (!q.trim()) {
      set({ suggestions: [], cacheDebug: null });
    }
  },

  fetchSuggestions: async (q) => {
    const cleanQ = q.trim();
    if (!cleanQ) {
      set({ suggestions: [], cacheDebug: null });
      return;
    }

    set({ isLoadingSuggestions: true, error: null });
    try {
      const suggestions = await apiService.getSuggestions(cleanQ);
      set({ suggestions, isLoadingSuggestions: false });
      
      // Also fetch cache debug for this prefix key
      await get().fetchCacheDebug(cleanQ);
    } catch (err: any) {
      set({ 
        error: err.response?.data?.error || 'Failed to fetch suggestions', 
        isLoadingSuggestions: false 
      });
    }
  },

  submitSearch: async (queryText) => {
    const cleanQuery = queryText.trim();
    if (!cleanQuery) return;

    set({ error: null });
    try {
      await apiService.submitSearch(cleanQuery);
      
      // Trigger a light refresh of metrics and trending lists after a delay to reflect updates
      setTimeout(() => {
        get().fetchMetrics();
        get().fetchTrending();
        get().fetchCacheStats();
      }, 500); // 500ms delay to let the batch queue get checked (flushed soon or visible)
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Failed to submit search' });
    }
  },

  fetchTrending: async () => {
    try {
      const trending = await apiService.getTrending();
      set({ trending });
    } catch (err: any) {
      console.error('Failed to fetch trending terms:', err);
    }
  },

  fetchMetrics: async () => {
    try {
      const metrics = await apiService.getMetrics();
      set({ 
        metrics, 
        apiOnline: true, 
        dbConnected: metrics.dbConnected !== false 
      });
    } catch (err: any) {
      console.error('Failed to fetch system metrics:', err);
      set({ 
        apiOnline: false, 
        dbConnected: false 
      });
    }
  },

  fetchCacheStats: async () => {
    try {
      const cacheStats = await apiService.getCacheStats();
      set({ cacheStats });
    } catch (err: any) {
      console.error('Failed to fetch cache statistics:', err);
    }
  },

  fetchCacheDebug: async (prefix) => {
    try {
      const cacheDebug = await apiService.getCacheDebug(prefix);
      set({ cacheDebug });
    } catch (err: any) {
      console.error('Failed to fetch cache debug details:', err);
    }
  },

  loadDataset: async () => {
    set({ isIngesting: true, error: null });
    try {
      const res = await apiService.loadDataset();
      set({ isIngesting: false });
      
      // Refresh app view
      await get().fetchTrending();
      await get().fetchMetrics();
      await get().fetchCacheStats();
      
      return res.inserted;
    } catch (err: any) {
      set({ 
        error: err.response?.data?.error || 'Failed to load dataset', 
        isIngesting: false 
      });
      throw err;
    }
  },

  simulateWorkload: async (requests = 500) => {
    set({ isSimulating: true, error: null });
    try {
      const res = await apiService.simulateWorkload(requests);
      set({ 
        metrics: res.currentMetrics,
        isSimulating: false 
      });
      // Refresh stats
      await get().fetchTrending();
      await get().fetchCacheStats();
      
      return { durationMs: res.durationMs, currentMetrics: res.currentMetrics };
    } catch (err: any) {
      set({ 
        error: err.response?.data?.error || 'Simulation run failed', 
        isSimulating: false 
      });
      throw err;
    }
  },

  toggleCacheNode: async (nodeName, online) => {
    try {
      await apiService.toggleCacheNode(nodeName, online);
      await get().fetchCacheStats();
      
      const currentQuery = get().query.trim();
      if (currentQuery) {
        await get().fetchSuggestions(currentQuery);
      }
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Failed to toggle cache node' });
      throw err;
    }
  },

  clearCacheDebug: () => {
    set({ cacheDebug: null });
  }
}));
