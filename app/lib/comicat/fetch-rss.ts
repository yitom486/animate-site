import { createCache, withCache } from "~/lib/bangumi/cache";
import {
  CACHE_TTL_COMICAT_MS,
  COMICAT_FETCH_TIMEOUT_MS,
  COMICAT_MATCH_LIMIT,
  COMICAT_RSS_URL,
} from "./constants";
import { filterAnimationItems, matchComicatItems } from "./match";
import { parseComicatRss } from "./parse-rss";
import type { ComicatItem } from "./types";

const rssCache = createCache<ComicatItem[]>(CACHE_TTL_COMICAT_MS);

const COMICAT_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (compatible; yhang/anime-site; +https://github.com/yitom486/animate-site)",
  Accept: "application/rss+xml, application/xml, text/xml, */*",
} as const;

/** 拉取漫猫全站 RSS（带进程内缓存） */
export async function fetchComicatRss(): Promise<ComicatItem[]> {
  return withCache(rssCache, "rss:v1", async () => {
    const res = await fetch(COMICAT_RSS_URL, {
      headers: COMICAT_HEADERS,
      signal: AbortSignal.timeout(COMICAT_FETCH_TIMEOUT_MS),
    });

    if (!res.ok) {
      throw new Error(`漫猫 RSS HTTP ${res.status}`);
    }

    const xml = await res.text();
    return parseComicatRss(xml);
  });
}

/** 按番剧名在 RSS 中匹配可能相关的下载条目 */
export async function fetchComicatForAnime(
  keywords: string[],
): Promise<ComicatItem[]> {
  try {
    const feed = await fetchComicatRss();
    const animation = filterAnimationItems(feed);
    return matchComicatItems(animation, keywords, COMICAT_MATCH_LIMIT);
  } catch {
    return [];
  }
}
