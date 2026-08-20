import { createCache, withCache } from "~/lib/cache";
import { CACHE_TTL_NEWS_MS } from "./constants";
import { fetchAniNews } from "./fetch-aninews";
import { fetchBahamutNews } from "./fetch-bahamut";
import { fetchBgmBlogNews } from "./fetch-bgm-blog";
import { fetchGoogleNewsZh } from "./fetch-google-news";
import { fetchRssHubNews } from "./fetch-rsshub";
import type { NewsFeed, NewsItem, NewsSourceStatus } from "./types";
import { toSimplified } from "./zh-convert";

/** 中文条目统一转简体（台湾/繁中源会混入繁体；简体输入转换后不变） */
function normalizeZh(item: NewsItem): NewsItem {
  if (item.locale !== "zh") return item;
  return {
    ...item,
    title: toSimplified(item.title),
    excerpt: toSimplified(item.excerpt),
  };
}

const newsCache = createCache<NewsFeed>(CACHE_TTL_NEWS_MS);

function parseTime(iso?: string): number {
  if (!iso) return 0;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? 0 : t;
}

function dedupeItems(items: NewsItem[]): NewsItem[] {
  const seen = new Set<string>();
  const out: NewsItem[] = [];

  for (const item of items) {
    const key = item.link || item.title;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }

  return out;
}

function sortByDate(items: NewsItem[]): NewsItem[] {
  return [...items].sort((a, b) => parseTime(b.publishedAt) - parseTime(a.publishedAt));
}

/** 聚合中文（Google News + RSSHub 可选）+ 英文 AniNews */
export async function fetchNewsFeed(limit = 24): Promise<NewsFeed> {
  return withCache(newsCache, `news:v6:${limit}`, async () => {
    const sources: NewsSourceStatus[] = [];
    let items: NewsItem[] = [];

    const [googleZh, bahamut, bgmBlog, rsshub, aninewsResult] = await Promise.all([
      fetchGoogleNewsZh(),
      fetchBahamutNews(),
      fetchBgmBlogNews(),
      fetchRssHubNews(),
      fetchAniNews(12).then(
        (rows) => ({ ok: true as const, rows }),
        (err: unknown) => ({
          ok: false as const,
          rows: [] as NewsItem[],
          error: err instanceof Error ? err.message : "未知错误",
        }),
      ),
    ]);

    sources.push(...googleZh.sources);
    items.push(...googleZh.items);

    sources.push(...bahamut.sources);
    items.push(...bahamut.items);

    sources.push(...bgmBlog.sources);
    items.push(...bgmBlog.items);

    sources.push(...rsshub.sources);
    items.push(...rsshub.items);

    if (aninewsResult.ok) {
      sources.push({
        id: "aninews",
        label: "AniNews",
        ok: true,
        count: aninewsResult.rows.length,
      });
      items.push(...aninewsResult.rows);
    } else {
      sources.push({
        id: "aninews",
        label: "AniNews",
        ok: false,
        count: 0,
        error: aninewsResult.error,
      });
    }

    const merged = sortByDate(dedupeItems(items)).map(normalizeZh);
    const zh = merged.filter((x) => x.locale === "zh").slice(0, 16);
    const en = merged.filter((x) => x.locale === "en").slice(0, 12);
    items = [...zh, ...en].slice(0, limit);

    return {
      items,
      fetchedAt: new Date().toISOString(),
      sources,
    };
  });
}
