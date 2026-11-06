import { createCache } from "~/lib/cache";
import { CACHE_MAX_ENTRIES, CACHE_TTL_LIST_MS } from "./constants";
import { listCacheKey } from "./params";
import type { AnimeListResult } from "./types";
import { SUBJECT_TYPE } from "./types";

/** 浏览器列表缓存：anime layout 与首页热数据预热共用，保证回退/点进排行零等待。 */
export const animeListClientCache = createCache<AnimeListResult>({
  ttlMs: CACHE_TTL_LIST_MS,
  maxEntries: CACHE_MAX_ENTRIES.clientList,
});

export function rememberAnimeList(searchParams: URLSearchParams, data: AnimeListResult) {
  animeListClientCache.set(listCacheKey(searchParams), data);
}

export function readAnimeListCache(searchParams: URLSearchParams): AnimeListResult | null {
  return animeListClientCache.get(listCacheKey(searchParams));
}

const HOT_LIST_QUERIES: URLSearchParams[] = [
  new URLSearchParams({ type: SUBJECT_TYPE.anime, view: "calendar" }),
  new URLSearchParams({ type: SUBJECT_TYPE.anime, sort: "rank" }),
];

/**
 * 预热高流量列表（今日放送周表 + 排行榜首页）。
 * 不阻塞导航；失败静默。命中后 anime layout clientLoader 直接读内存。
 */
export function preloadHotAnimeLists(scheduleResult?: AnimeListResult): void {
  if (typeof window === "undefined") return;

  if (scheduleResult) {
    rememberAnimeList(HOT_LIST_QUERIES[0], scheduleResult);
  }

  for (const params of HOT_LIST_QUERIES) {
    const keyParams = params;
    if (readAnimeListCache(keyParams)) continue;
    const url = `/api/anime/list?${keyParams}`;
    void fetch(url)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: AnimeListResult | null) => {
        if (data) rememberAnimeList(keyParams, data);
      })
      .catch(() => {
        /* ignore preload errors */
      });
  }
}
