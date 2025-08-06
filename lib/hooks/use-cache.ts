import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

/**
 * Cache entry interface
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

/**
 * Cache configuration
 */
interface CacheConfig {
  /** Default TTL in milliseconds (default: 5 minutes) */
  defaultTTL?: number;
  /** Maximum cache size (default: 100 entries) */
  maxSize?: number;
  /** Enable automatic cleanup (default: true) */
  autoCleanup?: boolean;
}

/**
 * In-memory cache with TTL and LRU eviction
 * Optimized for high-frequency data access in SMS application
 */
class MemoryCache<T = unknown> {
  private cache = new Map<string, CacheEntry<T>>();
  private accessOrder = new Map<string, number>();
  private accessCounter = 0;
  
  constructor(private config: CacheConfig = {}) {
    this.config = {
      defaultTTL: 5 * 60 * 1000, // 5 minutes
      maxSize: 100,
      autoCleanup: true,
      ...config
    };
    
    if (this.config.autoCleanup) {
      this.startCleanupInterval();
    }
  }

  /**
   * Get item from cache
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
      return null;
    }
    
    // Update access order for LRU
    this.accessOrder.set(key, this.accessCounter++);
    
    return entry.data;
  }

  /**
   * Set item in cache
   */
  set(key: string, data: T, ttl?: number): void {
    const actualTTL = ttl ?? this.config.defaultTTL!;
    
    // Evict if at max size
    if (this.cache.size >= this.config.maxSize! && !this.cache.has(key)) {
      this.evictLRU();
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: actualTTL
    });
    
    this.accessOrder.set(key, this.accessCounter++);
  }

  /**
   * Delete item from cache
   */
  delete(key: string): boolean {
    this.accessOrder.delete(key);
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hitRate: 0 // Would need hit/miss tracking for this
    };
  }

  /**
   * Evict least recently used item
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestAccess = Infinity;
    
    for (const [key, accessTime] of this.accessOrder) {
      if (accessTime < oldestAccess) {
        oldestAccess = accessTime;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.accessOrder.delete(oldestKey);
    }
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    
    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        this.accessOrder.delete(key);
      }
    }
  }

  /**
   * Start automatic cleanup interval
   */
  private startCleanupInterval(): void {
    setInterval(() => {
      this.cleanup();
    }, 60000); // Cleanup every minute
  }
}

// Global cache instances for different data types
const messageCache = new MemoryCache<unknown>({ 
  defaultTTL: 2 * 60 * 1000, // 2 minutes for messages
  maxSize: 200 
});

const patientCache = new MemoryCache<unknown>({ 
  defaultTTL: 10 * 60 * 1000, // 10 minutes for patients
  maxSize: 500 
});

const statsCache = new MemoryCache<unknown>({ 
  defaultTTL: 5 * 60 * 1000, // 5 minutes for stats
  maxSize: 50 
});

/**
 * Hook for caching API responses and expensive computations
 */
export function useCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: {
    ttl?: number;
    cacheType: 'messages' | 'patients' | 'stats' | 'general';
    enabled?: boolean;
  }
) {
  // Select appropriate cache - wrap in useMemo to avoid re-creating on every render
  const cache = useMemo(() => {
    return options.cacheType === 'messages' ? messageCache :
           options.cacheType === 'patients' ? patientCache :
           options.cacheType === 'stats' ? statsCache :
           new MemoryCache<T>();
  }, [options.cacheType]);

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!options.enabled) return;
    
    // Try cache first
    if (!forceRefresh) {
      const cached = cache.get(key);
      if (cached) {
        setData(cached as T);
        setError(null);
        return cached;
      }
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await fetcherRef.current();
      cache.set(key, result, options.ttl);
      setData(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [key, cache, options.ttl, options.enabled]);

  const invalidate = useCallback(() => {
    cache.delete(key);
    setData(null);
  }, [key, cache]);

  const refresh = useCallback(() => {
    return fetchData(true);
  }, [fetchData]);

  // Initial fetch
  useEffect(() => {
    if (options.enabled !== false) {
      fetchData();
    }
  }, [fetchData, options.enabled]);

  return {
    data,
    loading,
    error,
    refresh,
    invalidate,
    isStale: data === null
  };
}

/**
 * Hook for memoizing expensive computations
 */
export function useMemoizedComputation<T, Args extends unknown[]>(
  computation: (...args: Args) => T,
  dependencies: Args,
  ttl = 60000 // 1 minute default
): T {
  const [result, setResult] = useState<T | null>(null);
  const cache = useRef(new Map<string, { result: T; timestamp: number }>());
  
  const key = JSON.stringify(dependencies);
  
  useEffect(() => {
    const cached = cache.current.get(key);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < ttl) {
      setResult(cached.result);
      return;
    }
    
    const computed = computation(...dependencies);
    cache.current.set(key, { result: computed, timestamp: now });
    setResult(computed);
    
    // Cleanup old entries
    if (cache.current.size > 50) {
      const entries = Array.from(cache.current.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toDelete = entries.slice(0, 25);
      toDelete.forEach(([k]) => cache.current.delete(k));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, computation, ttl, ...dependencies]);
  
  return result!;
}

/**
 * Cache utilities
 */
export const cacheUtils = {
  clearMessages: () => messageCache.clear(),
  clearPatients: () => patientCache.clear(),
  clearStats: () => statsCache.clear(),
  clearAll: () => {
    messageCache.clear();
    patientCache.clear();
    statsCache.clear();
  },
  getStats: () => ({
    messages: messageCache.getStats(),
    patients: patientCache.getStats(),
    stats: statsCache.getStats()
  })
};