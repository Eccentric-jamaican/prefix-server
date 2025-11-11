import { TtlLruCache } from "./ttlLruCache.js";

interface CachedResponse {
  status: number;
  body: unknown;
}

const cacheTtlMs = 10 * 60 * 1000; // 10 minutes
const cacheMaxEntries = Number.parseInt(process.env.IDEMPOTENCY_CACHE_MAX ?? "256", 10);

const cache = new TtlLruCache<string, CachedResponse>({ maxSize: cacheMaxEntries, ttlMs: cacheTtlMs });

export function getCachedResponse(key: string): CachedResponse | undefined {
  return cache.get(key);
}

export function setCachedResponse(key: string, response: CachedResponse): void {
  cache.set(key, response);
}

export function clearIdempotencyCache(): void {
  cache.clear();
}
