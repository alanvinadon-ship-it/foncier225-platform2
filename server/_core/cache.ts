/**
 * Application Cache — Sprint 20 Performance
 * 
 * Simple in-memory cache with TTL for expensive queries.
 * Supports:
 * - Per-key TTL
 * - Manual invalidation by key or pattern
 * - User-scoped cache keys (for permission-aware caching)
 * - Automatic cleanup of expired entries
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class AppCache {
  private store = new Map<string, CacheEntry<unknown>>();
  private cleanupInterval: ReturnType<typeof setInterval>;

  constructor() {
    // Cleanup expired entries every 60 seconds
    this.cleanupInterval = setInterval(() => this.cleanup(), 60_000);
  }

  /**
   * Get a cached value, or null if expired/missing
   */
  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.data as T;
  }

  /**
   * Set a value with TTL in seconds
   */
  set<T>(key: string, data: T, ttlSeconds: number): void {
    this.store.set(key, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  /**
   * Get or compute: returns cached value or executes fn and caches result
   */
  async getOrSet<T>(key: string, ttlSeconds: number, fn: () => Promise<T>): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) return cached;
    const data = await fn();
    this.set(key, data, ttlSeconds);
    return data;
  }

  /**
   * Invalidate a specific key
   */
  invalidate(key: string): void {
    this.store.delete(key);
  }

  /**
   * Invalidate all keys matching a prefix
   */
  invalidatePrefix(prefix: string): void {
    Array.from(this.store.keys()).forEach(key => {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    });
  }

  /**
   * Invalidate all cache entries
   */
  invalidateAll(): void {
    this.store.clear();
  }

  /**
   * Get cache stats
   */
  stats(): { size: number; keys: string[] } {
    return { size: this.store.size, keys: Array.from(this.store.keys()) };
  }

  private cleanup(): void {
    const now = Date.now();
    Array.from(this.store.entries()).forEach(([key, entry]) => {
      if (now > entry.expiresAt) {
        this.store.delete(key);
      }
    });
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.store.clear();
  }
}

// Singleton instance
export const appCache = new AppCache();

/**
 * Cache key helpers for common patterns
 */
export const CacheKeys = {
  erpDashboard: (userId: number) => `erp:dashboard:${userId}`,
  erpDashboardFinance: (userId: number) => `erp:dashboard:finance:${userId}`,
  erpDashboardInventory: (userId: number) => `erp:dashboard:inventory:${userId}`,
  erpDashboardSafety: (userId: number) => `erp:dashboard:safety:${userId}`,
  erpStats: (module: string) => `erp:stats:${module}`,
  erpNotificationsUnread: (userId: number) => `erp:notifications:unread:${userId}`,
  erpReferenceList: (listName: string) => `erp:ref:${listName}`,
};

/**
 * Cache TTL constants (in seconds)
 */
export const CacheTTL = {
  DASHBOARD: 120,       // 2 minutes
  STATS: 300,           // 5 minutes
  NOTIFICATIONS: 60,    // 1 minute
  REFERENCE_LIST: 600,  // 10 minutes
};
