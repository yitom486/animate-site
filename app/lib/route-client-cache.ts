import { createCache, type CacheStore } from "~/lib/cache";

/**
 * 浏览器路由级 clientLoader 缓存：命中则跳过 serverLoader 网络往返。
 * 与 TanStack Query 互补——页面主数据走这里；同源 API 子查询走 QueryClient。
 */
export function createRouteClientCache<T>(options: {
  ttlMs: number;
  maxEntries: number;
}): CacheStore<T> {
  return createCache<T>(options);
}

export async function readThroughRouteCache<T>(
  cache: CacheStore<T>,
  key: string,
  fetcher: () => Promise<T>,
): Promise<T> {
  const hit = cache.get(key);
  if (hit != null) return hit;
  const value = await fetcher();
  cache.set(key, value);
  return value;
}
