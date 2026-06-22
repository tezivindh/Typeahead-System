import { Suggestion, CacheEntry } from '../types';

export class CacheNode {
  public readonly name: string;
  private store: Map<string, CacheEntry> = new Map();

  constructor(name: string) {
    this.name = name;
  }

  /**
   * Retrieves value from store. Returns null if key doesn't exist or is expired.
   */
  public get(key: string): Suggestion[] | null {
    const entry = this.store.get(key);
    if (!entry) {
      return null;
    }
    
    // Check expiry
    if (Date.now() > entry.expiry) {
      this.store.delete(key);
      return null;
    }
    
    return entry.value;
  }

  /**
   * Sets value in store with a specified TTL in seconds.
   */
  public set(key: string, value: Suggestion[], ttlSeconds: number): void {
    const expiry = Date.now() + ttlSeconds * 1000;
    this.store.set(key, { value, expiry });
  }

  /**
   * Deletes a key from the cache.
   */
  public delete(key: string): void {
    this.store.delete(key);
  }

  /**
   * Clears all cache contents.
   */
  public clear(): void {
    this.store.clear();
  }

  /**
   * Returns all active (unexpired) keys, purging expired ones.
   */
  public getKeys(): string[] {
    const now = Date.now();
    const activeKeys: string[] = [];
    
    for (const [key, entry] of this.store.entries()) {
      if (now <= entry.expiry) {
        activeKeys.push(key);
      } else {
        this.store.delete(key); // Evict expired key
      }
    }
    
    return activeKeys;
  }

  /**
   * Returns current active cache size.
   */
  public size(): number {
    this.getKeys(); // Clean up expired keys
    return this.store.size;
  }

  /**
   * Returns full internal cache data for debugging.
   */
  public getDebugStore(): Record<string, { value: Suggestion[]; expiryLeftMs: number }> {
    this.getKeys(); // Purge expired keys first
    const now = Date.now();
    const result: Record<string, { value: Suggestion[]; expiryLeftMs: number }> = {};
    
    for (const [key, entry] of this.store.entries()) {
      result[key] = {
        value: entry.value,
        expiryLeftMs: Math.max(0, entry.expiry - now),
      };
    }
    
    return result;
  }
}
