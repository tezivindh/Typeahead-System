import { HashRing } from '../hashing/hash-ring';
import { CacheNode } from '../cache/cache-node';
import { Suggestion } from '../types';
import { metricsService } from '../metrics/metrics.service';

export class CacheService {
  private hashRing: HashRing;
  private nodes: Map<string, CacheNode> = new Map();
  private ttlSeconds = 30;

  private offlineNodes: Set<string> = new Set();

  constructor() {
    this.hashRing = new HashRing(50); // 50 virtual nodes per physical node
    
    // Initialize 3 cache nodes
    const nodeNames = ['Cache-A', 'Cache-B', 'Cache-C'];
    for (const name of nodeNames) {
      this.nodes.set(name, new CacheNode(name));
      this.hashRing.addNode(name);
    }
  }

  /**
   * Toggles the online/offline status of a cache node, updating the hashing ring.
   */
  public toggleNodeStatus(nodeName: string, isOnline: boolean): void {
    if (isOnline) {
      if (this.offlineNodes.has(nodeName)) {
        this.offlineNodes.delete(nodeName);
        this.hashRing.addNode(nodeName);
      }
    } else {
      if (!this.offlineNodes.has(nodeName)) {
        const activeCount = this.nodes.size - this.offlineNodes.size;
        if (activeCount <= 1) {
          throw new Error('Cannot take the last remaining cache node offline.');
        }
        this.offlineNodes.add(nodeName);
        this.hashRing.removeNode(nodeName);
        this.nodes.get(nodeName)?.clear(); // Clear memory
      }
    }
  }

  /**
   * Retrieves suggestions from the cache node responsible for the query prefix.
   */
  public get(prefix: string): Suggestion[] | null {
    if (!prefix) return null;
    
    const nodeName = this.hashRing.getNode(prefix);
    const node = this.nodes.get(nodeName);
    
    if (!node) {
      throw new Error(`Cache node ${nodeName} is registered in hash ring but has no instance`);
    }

    const value = node.get(prefix);
    if (value !== null) {
      metricsService.recordCacheHit();
      return value;
    }

    metricsService.recordCacheMiss();
    return null;
  }

  /**
   * Caches suggestions in the cache node responsible for the query prefix.
   */
  public set(prefix: string, suggestions: Suggestion[]): void {
    if (!prefix) return;
    
    const nodeName = this.hashRing.getNode(prefix);
    const node = this.nodes.get(nodeName);
    
    if (node) {
      node.set(prefix, suggestions, this.ttlSeconds);
    }
  }

  /**
   * Deletes a prefix from its responsible cache node.
   */
  public delete(prefix: string): void {
    if (!prefix) return;
    
    const nodeName = this.hashRing.getNode(prefix);
    const node = this.nodes.get(nodeName);
    
    if (node) {
      node.delete(prefix);
    }
  }

  /**
   * Active Invalidation: Invalidates all prefix combinations of a query.
   * e.g. "iphone" -> invalidates "i", "ip", "iph", "ipho", "iphon", "iphone"
   */
  public invalidatePrefixes(query: string): void {
    const cleanQuery = query.trim().toLowerCase();
    for (let i = 1; i <= cleanQuery.length; i++) {
      const prefix = cleanQuery.substring(0, i);
      this.delete(prefix);
    }
  }

  /**
   * Returns consistent hashing debug info for a specific prefix key.
   */
  public getDebugInfo(prefix: string) {
    const cleanPrefix = prefix.trim().toLowerCase();
    const hashVal = this.hashRing.hash(cleanPrefix);
    const nodeName = this.hashRing.getNode(cleanPrefix);
    const node = this.nodes.get(nodeName);
    
    // Check if it's currently cached
    const isCached = node ? node.get(cleanPrefix) !== null : false;
    
    return {
      prefix: cleanPrefix,
      hash: hashVal,
      node: nodeName,
      cacheHit: isCached,
    };
  }

  /**
   * Retrieves structural and load data for all cache nodes.
   */
  public getStats() {
    const stats: Record<string, { size: number; keys: string[]; data: any; online: boolean }> = {};
    for (const [name, node] of this.nodes.entries()) {
      stats[name] = {
        size: node.size(),
        keys: node.getKeys(),
        data: node.getDebugStore(),
        online: !this.offlineNodes.has(name),
      };
    }
    return stats;
  }

  /**
   * Clears all cache nodes contents.
   */
  public clearAll(): void {
    for (const node of this.nodes.values()) {
      node.clear();
    }
  }
}

// Export singleton
export const cacheService = new CacheService();
