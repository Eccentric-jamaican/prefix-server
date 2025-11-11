export interface CacheEntry<V> {
  value: V;
  expiresAt: number;
}

export class TtlLruCache<K, V> {
  private readonly maxSize: number;
  private readonly ttlMs: number;
  private readonly map: Map<K, CacheEntry<V>>;

  constructor(options: { maxSize: number; ttlMs: number }) {
    this.maxSize = options.maxSize;
    this.ttlMs = options.ttlMs;
    this.map = new Map();
  }

  get(key: K): V | undefined {
    const entry = this.map.get(key);
    if (!entry) {
      return undefined;
    }

    if (entry.expiresAt <= Date.now()) {
      this.map.delete(key);
      return undefined;
    }

    this.map.delete(key);
    this.map.set(key, entry);
    return entry.value;
  }

  set(key: K, value: V): void {
    if (this.map.has(key)) {
      this.map.delete(key);
    }

    this.map.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs
    });

    if (this.map.size > this.maxSize) {
      const lruKey = this.map.keys().next().value as K | undefined;
      if (lruKey !== undefined) {
        this.map.delete(lruKey);
      }
    }
  }

  clear(): void {
    this.map.clear();
  }
}
