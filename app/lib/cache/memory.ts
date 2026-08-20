import { edgeGet, edgeSet } from "./edge";
import type { CacheStore, CreateCacheOptions, WithCacheOptions } from "./types";

const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000;
const DEFAULT_MAX_ENTRIES = 256;

type Entry<T> = { data: T; expires: number };

type CacheInternals = {
  inFlight: Map<string, Promise<unknown>>;
  ttlMs: number;
};

const internalsByCache = new WeakMap<CacheStore<unknown>, CacheInternals>();

function getInternals(cache: CacheStore<unknown>): CacheInternals {
  let internals = internalsByCache.get(cache);
  if (!internals) {
    internals = { inFlight: new Map(), ttlMs: DEFAULT_CACHE_TTL_MS };
    internalsByCache.set(cache, internals);
  }
  return internals;
}

function resolveOptions(ttlOrOptions?: number | CreateCacheOptions): Required<CreateCacheOptions> {
  if (typeof ttlOrOptions === "number") {
    return { ttlMs: ttlOrOptions, maxEntries: DEFAULT_MAX_ENTRIES };
  }
  return {
    ttlMs: ttlOrOptions?.ttlMs ?? DEFAULT_CACHE_TTL_MS,
    maxEntries: ttlOrOptions?.maxEntries ?? DEFAULT_MAX_ENTRIES,
  };
}

/**
 * 进程内有界 LRU 内存缓存（L1）。
 * - TTL：新鲜度边界
 * - maxEntries：容量边界；get 命中会刷新 LRU 顺序
 */
export function createCache<T>(ttlOrOptions?: number | CreateCacheOptions): CacheStore<T> {
  const { ttlMs, maxEntries } = resolveOptions(ttlOrOptions);
  /** Map 插入顺序即 LRU：队头最久未用，队尾最近访问 */
  const store = new Map<string, Entry<T>>();

  const touch = (key: string, entry: Entry<T>) => {
    store.delete(key);
    store.set(key, entry);
  };

  const evictExpiredAndOverflow = () => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now > entry.expires) store.delete(key);
    }
    while (store.size > maxEntries) {
      const oldest = store.keys().next().value;
      if (oldest === undefined) break;
      store.delete(oldest);
    }
  };

  const cache: CacheStore<T> = {
    get(key: string): T | null {
      const hit = store.get(key);
      if (!hit) return null;
      if (Date.now() > hit.expires) {
        store.delete(key);
        return null;
      }
      touch(key, hit);
      return hit.data;
    },
    set(key: string, data: T) {
      store.delete(key);
      store.set(key, { data, expires: Date.now() + ttlMs });
      evictExpiredAndOverflow();
    },
    delete(key: string) {
      store.delete(key);
    },
    size() {
      return store.size;
    },
    clear() {
      store.clear();
    },
  };

  internalsByCache.set(cache as CacheStore<unknown>, {
    inFlight: new Map(),
    ttlMs,
  });
  return cache;
}

function abortError(signal: AbortSignal): unknown {
  return signal.reason ?? new DOMException("The operation was aborted.", "AbortError");
}

/** 等待 shared；调用方 signal abort 时只结束等待，不取消 shared */
function waitShared<T>(shared: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return shared;
  if (signal.aborted) return Promise.reject(abortError(signal));

  return new Promise<T>((resolve, reject) => {
    const onAbort = () => {
      cleanup();
      reject(abortError(signal));
    };
    const cleanup = () => signal.removeEventListener("abort", onAbort);

    signal.addEventListener("abort", onAbort);
    shared.then(
      (value) => {
        cleanup();
        resolve(value);
      },
      (error) => {
        cleanup();
        reject(error);
      },
    );
  });
}

/**
 * 统一缓存读取入口：
 * 1. L1 内存命中 → 返回
 * 2. （可选）L2 Cache API 命中 → 回填 L1 后返回
 * 3. miss → single-flight fetcher → 写 L1，并在启用 L2 时写边缘
 *
 * 对外签名稳定；HTTP CDN 层由 loader 的 publicCacheHeaders 声明。
 */
export async function withCache<T>(
  cache: CacheStore<T>,
  key: string,
  fetcher: () => Promise<T>,
  options?: WithCacheOptions,
): Promise<T> {
  const hit = cache.get(key);
  if (hit) return hit;

  if (options?.signal?.aborted) {
    throw abortError(options.signal);
  }

  const internals = getInternals(cache as CacheStore<unknown>);
  let pending = internals.inFlight.get(key) as Promise<T> | undefined;

  if (!pending) {
    const useEdge = options?.useEdge === true;
    const ttlSeconds = Math.max(1, Math.floor(internals.ttlMs / 1000));

    pending = (async () => {
      try {
        if (useEdge) {
          const edgeHit = await edgeGet<T>(key);
          if (edgeHit != null) {
            cache.set(key, edgeHit);
            return edgeHit;
          }
        }

        const data = await fetcher();
        cache.set(key, data);
        if (useEdge) {
          void edgeSet(key, data, ttlSeconds);
        }
        return data;
      } finally {
        internals.inFlight.delete(key);
      }
    })();
    internals.inFlight.set(key, pending);
  }

  return waitShared(pending, options?.signal);
}
