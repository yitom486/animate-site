import { FETCH_TIMEOUT_MS, RSSHUB_BASE, RSSHUB_FEEDS } from "./constants";
import { stripHtml } from "~/lib/rss";
import type { NewsItem, NewsLocale, NewsSourceStatus } from "./types";

type JsonFeedItem = {
  id?: string;
  title?: string;
  url?: string;
  summary?: string;
  date_published?: string;
  image?: string;
};

type JsonFeed = {
  items?: JsonFeedItem[];
};

async function fetchRssHubJson(path: string): Promise<JsonFeedItem[]> {
  const url = `${RSSHUB_BASE.replace(/\/$/, "")}${path}`;
  const res = await fetch(url, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: {
      Accept: "application/json",
      "User-Agent": "yhang/anime-site (https://github.com/yitom486/animate-site)",
    },
  });

  if (!res.ok) {
    throw new Error(`RSSHub HTTP ${res.status}`);
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("json")) {
    throw new Error("RSSHub 未返回 JSON（公共实例可能已限流，请自建 RSSHub）");
  }

  const json = (await res.json()) as JsonFeed;
  return json.items ?? [];
}

function toNewsItem(
  row: JsonFeedItem,
  source: string,
  locale: NewsLocale,
  prefix: string,
): NewsItem | null {
  const title = row.title?.trim();
  const link = row.url?.trim();
  if (!title || !link) return null;

  const id = row.id?.trim() || `${prefix}:${link}`;

  return {
    id,
    title,
    link,
    excerpt: stripHtml(row.summary),
    publishedAt: row.date_published,
    source,
    locale,
    image: row.image,
  };
}

/** RSSHub JSON Feed — 中文动漫/漫展资讯（单源失败不影响其它源） */
export async function fetchRssHubNews(): Promise<{
  items: NewsItem[];
  sources: NewsSourceStatus[];
}> {
  const results = await Promise.all(
    RSSHUB_FEEDS.map(async (feed) => {
      try {
        const rows = await fetchRssHubJson(feed.path);
        const items = rows
          .map((row) => toNewsItem(row, feed.label, feed.locale, feed.id))
          .filter((x): x is NewsItem => x != null);

        return {
          status: {
            id: feed.id,
            label: feed.label,
            ok: true,
            count: items.length,
          } satisfies NewsSourceStatus,
          items,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : "未知错误";
        return {
          status: {
            id: feed.id,
            label: feed.label,
            ok: false,
            count: 0,
            error: message,
          } satisfies NewsSourceStatus,
          items: [] as NewsItem[],
        };
      }
    }),
  );

  return {
    items: results.flatMap((r) => r.items),
    sources: results.map((r) => r.status),
  };
}
