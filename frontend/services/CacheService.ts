import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

interface CacheEntry<T> {
  data: T;
  cachedAt: number;
  expiresAt: number;
}

const STORAGE_PREFIX = '@lms_cache:';
const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

// In-memory Tier 1 cache for synchronous zero-latency lookups
const memoryCache = new Map<string, CacheEntry<any>>();

export class CacheService {
  /**
   * Set a cache entry in memory and AsyncStorage
   */
  static async set<T>(key: string, data: T, ttlMs: number = DEFAULT_TTL_MS): Promise<void> {
    const now = Date.now();
    const entry: CacheEntry<T> = {
      data,
      cachedAt: now,
      expiresAt: now + ttlMs,
    };

    memoryCache.set(key, entry);

    try {
      await AsyncStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(entry));
    } catch (e) {
      console.warn(`[CacheService] Failed to persist key ${key}:`, e);
    }
  }

  /**
   * Get a cache entry.
   * If allowStale is true, returns even expired entries while flagging isStale: true.
   */
  static async get<T>(
    key: string,
    options: { allowStale?: boolean } = {}
  ): Promise<{ data: T | null; isStale: boolean; cachedAt: number | null }> {
    const now = Date.now();

    // 1. Check in-memory first
    const mem = memoryCache.get(key);
    if (mem) {
      const isExpired = now > mem.expiresAt;
      if (!isExpired || options.allowStale) {
        return { data: mem.data as T, isStale: isExpired, cachedAt: mem.cachedAt };
      }
    }

    // 2. Check AsyncStorage fallback
    try {
      const raw = await AsyncStorage.getItem(`${STORAGE_PREFIX}${key}`);
      if (raw) {
        const parsed: CacheEntry<T> = JSON.parse(raw);
        // Hydrate in-memory
        memoryCache.set(key, parsed);

        const isExpired = now > parsed.expiresAt;
        if (!isExpired || options.allowStale) {
          return { data: parsed.data, isStale: isExpired, cachedAt: parsed.cachedAt };
        }
      }
    } catch (e) {
      console.warn(`[CacheService] Failed to read key ${key} from storage:`, e);
    }

    return { data: null, isStale: false, cachedAt: null };
  }

  /**
   * Invalidate a specific cache key
   */
  static async invalidate(key: string): Promise<void> {
    memoryCache.delete(key);
    try {
      await AsyncStorage.removeItem(`${STORAGE_PREFIX}${key}`);
    } catch (e) {
      console.warn(`[CacheService] Failed to remove key ${key}:`, e);
    }
  }

  /**
   * Invalidate all keys matching a prefix
   */
  static async invalidatePrefix(prefix: string): Promise<void> {
    for (const key of Array.from(memoryCache.keys())) {
      if (key.startsWith(prefix)) {
        memoryCache.delete(key);
      }
    }

    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const matchingKeys = allKeys.filter((k) => k.startsWith(`${STORAGE_PREFIX}${prefix}`));
      if (matchingKeys.length > 0) {
        await AsyncStorage.multiRemove(matchingKeys);
      }
    } catch (e) {
      console.warn(`[CacheService] Failed to remove prefix ${prefix}:`, e);
    }
  }

  /**
   * Clear entire LMS application cache
   */
  static async clearAll(): Promise<void> {
    memoryCache.clear();
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter((k) => k.startsWith(STORAGE_PREFIX));
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
      }
    } catch (e) {
      console.warn('[CacheService] Failed to clear all cache:', e);
    }
  }
}

/**
 * React hook implementing Stale-While-Revalidate with CacheService
 */
export function useCachedAsync<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: {
    ttlMs?: number;
    enabled?: boolean;
    onSuccess?: (data: T) => void;
  } = {}
) {
  const { ttlMs = DEFAULT_TTL_MS, enabled = true, onSuccess } = options;
  const [data, setData] = useState<T | null>(() => {
    // Synchronous memory cache check for initial state (avoids loading flicker on remount)
    const mem = memoryCache.get(key);
    return mem ? mem.data : null;
  });
  const [loading, setLoading] = useState<boolean>(() => {
    const mem = memoryCache.get(key);
    return !mem;
  });
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<any>(null);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const executeFetch = useCallback(
    async (isManualRefresh = false) => {
      if (!enabled) return;

      if (isManualRefresh) {
        setRefreshing(true);
      } else if (!data) {
        setLoading(true);
      }

      try {
        const fresh = await fetcher();
        if (!mountedRef.current) return;

        setData(fresh);
        setError(null);
        await CacheService.set(key, fresh, ttlMs);
        if (onSuccess) onSuccess(fresh);
      } catch (err) {
        if (!mountedRef.current) return;
        setError(err);
      } finally {
        if (mountedRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [key, enabled, ttlMs, data, fetcher, onSuccess]
  );

  useEffect(() => {
    if (!enabled) return;

    let isCancelled = false;

    const init = async () => {
      // 1. Try to get cached data (including stale for immediate display)
      const cached = await CacheService.get<T>(key, { allowStale: true });
      if (isCancelled) return;

      if (cached.data !== null) {
        setData(cached.data);
        setLoading(false);

        // If not stale, we can skip background revalidation
        if (!cached.isStale) {
          return;
        }
      }

      // 2. Perform background revalidation
      await executeFetch(false);
    };

    init();

    return () => {
      isCancelled = true;
    };
  }, [key, enabled]);

  const refresh = useCallback(async () => {
    await executeFetch(true);
  }, [executeFetch]);

  return {
    data,
    loading,
    refreshing,
    refresh,
    error,
    setData,
  };
}
