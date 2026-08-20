import { createCache, withCache } from "~/lib/cache";
import { listCacheKey } from "../params";
import type { AnimeListResult } from "../types";
import type { UpstreamRequestOptions } from "~/lib/upstream";
import { upstreamFromRequest } from "~/lib/upstream";
import { CACHE_TTL_LIST_MS } from "./config.server";
import { fetchAnimeList } from "./list.server";

/** 列表 SSR / API 共用进程内缓存（部署 Cloudflare 后可换 KV） */
export const serverListCache = createCache<AnimeListResult>(CACHE_TTL_LIST_MS);

/** 按 URL 查询参数加载列表，带服务端缓存 */
export async function loadCachedAnimeList(
  searchParams: URLSearchParams,
  options?: UpstreamRequestOptions,
): Promise<AnimeListResult> {
  const key = listCacheKey(searchParams);
  return withCache(serverListCache, key, () => fetchAnimeList(searchParams, options), options);
}

/** 从 Request 解析参数并加载；供 route loader 直接调用，避免 HTTP 回环 */
export async function loadCachedAnimeListFromRequest(
  request: Request,
  options?: UpstreamRequestOptions,
): Promise<AnimeListResult> {
  const url = new URL(request.url);
  const upstream = options ?? upstreamFromRequest(request);
  return loadCachedAnimeList(url.searchParams, upstream);
}
