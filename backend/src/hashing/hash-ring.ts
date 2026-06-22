import crypto from 'crypto';

export class HashRing {
  private ring: Map<number, string> = new Map();
  private sortedKeys: number[] = [];
  private virtualNodes: number;

  constructor(virtualNodes = 50) {
    this.virtualNodes = virtualNodes;
  }

  /**
   * Generates a 32-bit unsigned integer hash for the given key using SHA-1.
   */
  public hash(key: string): number {
    const sha1 = crypto.createHash('sha1').update(key).digest('hex');
    // Extract first 8 chars (32 bits) and convert to base 16 integer
    return parseInt(sha1.substring(0, 8), 16);
  }

  /**
   * Adds a physical node to the ring, generating virtual nodes for it.
   */
  public addNode(node: string): void {
    for (let i = 0; i < this.virtualNodes; i++) {
      const vNodeKey = `${node}-vnode-${i}`;
      const hashVal = this.hash(vNodeKey);
      this.ring.set(hashVal, node);
      this.sortedKeys.push(hashVal);
    }
    this.sortedKeys.sort((a, b) => a - b);
  }

  /**
   * Removes a physical node and all its virtual nodes from the ring.
   */
  public removeNode(node: string): void {
    for (let i = 0; i < this.virtualNodes; i++) {
      const vNodeKey = `${node}-vnode-${i}`;
      const hashVal = this.hash(vNodeKey);
      this.ring.delete(hashVal);
    }
    this.sortedKeys = this.sortedKeys.filter((k) => this.ring.has(k));
  }

  /**
   * Finds the physical node responsible for a given key.
   */
  public getNode(key: string): string {
    if (this.sortedKeys.length === 0) {
      throw new Error('Hash ring is empty');
    }
    const hashVal = this.hash(key);
    
    // Find the first virtual node hash value that is >= key's hash
    let idx = this.binarySearch(hashVal);
    
    // If we've reached the end of the ring, wrap around to the first element
    if (idx === -1) {
      idx = 0;
    }
    
    const node = this.ring.get(this.sortedKeys[idx]);
    if (!node) {
      throw new Error(`Node not found on hash ring for hash ${hashVal}`);
    }
    return node;
  }

  /**
   * Binary search helper to find the first index in sortedKeys with value >= target.
   * Returns -1 if no such element exists (needs wrap-around).
   */
  private binarySearch(target: number): number {
    let low = 0;
    let high = this.sortedKeys.length - 1;
    let result = -1;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (this.sortedKeys[mid] >= target) {
        result = mid;
        high = mid - 1; // Continue searching to the left for a closer element
      } else {
        low = mid + 1; // Search to the right
      }
    }

    return result;
  }

  /**
   * Returns the virtual nodes layout on the ring for debug analysis.
   */
  public getDebugRing() {
    return this.sortedKeys.map((k) => ({
      hash: k,
      node: this.ring.get(k)!,
    }));
  }
}
