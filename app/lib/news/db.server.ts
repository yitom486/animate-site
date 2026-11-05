import type { D1Database } from "@cloudflare/workers-types";
import { NEWS_FEEDS, NEWS_RETENTION_MS, type NewsChannel } from "./config";
import type { NewsArticle, NewsFeed, NewsItem } from "./types";

export type NewsEnv = { NEWS_DB: D1Database };

export function newsDbFromContext(context: { cloudflare?: unknown }): D1Database {
  const env = (context.cloudflare as { env?: Partial<NewsEnv> } | undefined)?.env;
  if (!env?.NEWS_DB)
    throw new Response("资讯存储暂未配置", {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  return env.NEWS_DB;
}

export type ArticleRow = {
  id: string;
  guid: string;
  channel: NewsChannel;
  title: string;
  source_url: string;
  content_html: string;
  excerpt: string;
  published_at: number;
};
export type FeedRow = {
  id: NewsChannel;
  etag: string | null;
  last_modified: string | null;
  checked_at: number | null;
  success_at: number | null;
  error: string | null;
};

function toItem(row: Omit<ArticleRow, "guid" | "content_html">): NewsItem {
  return {
    id: row.id,
    title: row.title,
    link: row.source_url,
    channel: row.channel,
    excerpt: row.excerpt,
    publishedAt: new Date(row.published_at).toISOString(),
    source: NEWS_FEEDS.find((feed) => feed.id === row.channel)!.label,
    locale: "zh",
  };
}

export async function readNewsFeed(
  db: D1Database,
  options: { channel?: NewsChannel; page?: number; limit?: number; now?: number } = {},
): Promise<NewsFeed> {
  const { channel, now = Date.now() } = options;
  const limit = Math.min(40, Math.max(1, Math.floor(options.limit ?? 24)));
  const page = Math.min(10000, Math.max(1, Math.floor(options.page ?? 1)));
  const where = "published_at >= ? AND published_at <= ?" + (channel ? " AND channel = ?" : "");
  const bindings = [now - NEWS_RETENTION_MS, now, ...(channel ? [channel] : [])];
  const [rows, count, states] = await db.batch([
    db
      .prepare(
        `SELECT id, channel, title, source_url, excerpt, published_at FROM news_articles WHERE ${where} ORDER BY published_at DESC, id DESC LIMIT ? OFFSET ?`,
      )
      .bind(...bindings, limit, (page - 1) * limit),
    db.prepare(`SELECT COUNT(*) AS total FROM news_articles WHERE ${where}`).bind(...bindings),
    db.prepare("SELECT id, success_at, checked_at, error FROM news_feeds"),
  ]);
  const total = Number((count.results[0] as { total: number }).total);
  const sources = NEWS_FEEDS.map((feed) => {
    const state = (states.results as unknown as FeedRow[]).find((row) => row.id === feed.id);
    return {
      id: feed.id,
      label: feed.label,
      ok: Boolean(state?.success_at) && !state?.error,
      count: (rows.results as unknown as ArticleRow[]).filter((row) => row.channel === feed.id)
        .length,
      error: state?.error || (!state?.success_at ? "等待首次同步" : undefined),
      lastSuccessAt: state?.success_at ? new Date(state.success_at).toISOString() : undefined,
    };
  });
  return {
    items: (rows.results as unknown as ArticleRow[]).map(toItem),
    sources,
    fetchedAt: new Date(now).toISOString(),
    total,
    page,
    pageSize: limit,
    hasMore: page * limit < total,
  };
}

export async function readNewsArticle(
  db: D1Database,
  id: string,
  now = Date.now(),
): Promise<NewsArticle | null> {
  if (!/^[a-f0-9]{64}$/.test(id)) return null;
  const row = await db
    .prepare("SELECT * FROM news_articles WHERE id = ? AND published_at >= ? AND published_at <= ?")
    .bind(id, now - NEWS_RETENTION_MS, now)
    .first<ArticleRow>();
  return row ? { ...toItem(row), guid: row.guid, contentHtml: row.content_html } : null;
}

/** 首页为两个频道分别取数，避免高频动漫消息挤掉较早发布的漫展。 */
export async function readHomeNews(db: D1Database, now = Date.now()): Promise<NewsFeed> {
  const feeds = await Promise.all(
    NEWS_FEEDS.map((feed) => readNewsFeed(db, { channel: feed.id, limit: 12, now })),
  );
  const items = feeds.flatMap((feed) => feed.items);
  const total = feeds.reduce((sum, feed) => sum + feed.total, 0);
  return {
    items,
    sources: feeds.map((feed, index) =>
      feed.sources.find((source) => source.id === NEWS_FEEDS[index].id)!,
    ),
    fetchedAt: new Date(now).toISOString(),
    total,
    page: 1,
    pageSize: 24,
    hasMore: items.length < total,
  };
}
