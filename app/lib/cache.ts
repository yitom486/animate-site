const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000;

type Entry<T> = { data: T; expires: number };

export type CacheStore<T> = {
  get(key: string): T | null;
  set(key: string, data: T): void;
};

/**
 * 进程内内存缓存。
 * 部署 Cloudflare Workers 时可替换为 KV：
 *   get: await env.KV.get(key, "json")
 *   set: await env.KV.put(key, JSON.stringify(data), { expirationTtl: TTL_SEC })
 */
export function createCache<T>(ttlMs = DEFAULT_CACHE_TTL_MS): CacheStore<T> {
  const store = new Map<string, Entry<T>>();

  return {
    get(key: string): T | null {
      const hit = store.get(key);
      if (!hit) return null;
      if (Date.now() > hit.expires) {
        store.delete(key);
        return null;
      }
      return hit.data;
    },
    set(key: string, data: T) {
      store.set(key, { data, expires: Date.now() + ttlMs });
    },
  };
}

/** 读缓存 → 未命中则拉取并写入（服务端 / clientLoader 通用） */
export async function withCache<T>(
  cache: CacheStore<T>,
  key: string,
  fetcher: () => Promise<T>,
): Promise<T> {
  const hit = cache.get(key);
  if (hit) return hit;
  const data = await fetcher();
  cache.set(key, data);
  return data;
}
