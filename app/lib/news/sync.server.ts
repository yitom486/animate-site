import type { D1Database } from "@cloudflare/workers-types";
import { NEWS_FEEDS, NEWS_RETENTION_MS, type NewsChannel } from "./config";
import type { FeedRow } from "./db.server";
import { newsArticleId, parseNewsRss, type ParsedArticle } from "./parse.server";
import {
  newsFeedSourceId,
  newsSourceUrls,
  newsSyncErrorMessage,
  NewsSyncError,
  type NewsSourceSecrets,
} from "./settings.server";
import { normalizeSourceUrl } from "./url";

const MAX_FEED_BYTES = 2 * 1024 * 1024;

type ArticleMergeRow = {
  id: string;
  guid: string;
  channel: NewsChannel;
  title: string;
  source_url: string;
  content_html: string;
  excerpt: string;
  image_url: string | null;
  published_at: number;
  first_seen_at: number;
  updated_at: number;
};

async function readFeedBody(response: Response) {
  if (Number(response.headers.get("Content-Length")) > MAX_FEED_BYTES)
    throw new NewsSyncError("RSS 超过大小限制");
  if (!response.body) throw new NewsSyncError("RSS 响应正文为空");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > MAX_FEED_BYTES) {
        await reader.cancel();
        throw new NewsSyncError("RSS 超过大小限制");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

function preferCeladonGuid(guid: string) {
  return guid.startsWith("celadon:");
}

/** Count https <img> tags — used so stripped caption-only bodies lose to real figure markup. */
export function countNewsHttpsImages(html: string) {
  return (html.match(/<img\b[^>]*\bsrc=["']https:\/\//gi) ?? []).length;
}

export function preferNewsContentHtml(a: string, b: string) {
  const ai = countNewsHttpsImages(a);
  const bi = countNewsHttpsImages(b);
  if (ai !== bi) return ai > bi ? a : b;
  return a.length >= b.length ? a : b;
}

/**
 * Pick which row keeps id/guid.
 * Prefer more https images in body, then longer body, then celadon guid, then cover field.
 */
export function chooseNewsMergeKeeper(a: ArticleMergeRow, b: ArticleMergeRow): ArticleMergeRow {
  const ai = countNewsHttpsImages(a.content_html);
  const bi = countNewsHttpsImages(b.content_html);
  if (ai !== bi) return ai > bi ? a : b;
  if (a.content_html.length !== b.content_html.length) {
    return a.content_html.length >= b.content_html.length ? a : b;
  }
  const aCeladon = preferCeladonGuid(a.guid);
  const bCeladon = preferCeladonGuid(b.guid);
  if (aCeladon !== bCeladon) return aCeladon ? a : b;
  const aImage = Boolean(a.image_url);
  const bImage = Boolean(b.image_url);
  if (aImage !== bImage) return aImage ? a : b;
  return a.first_seen_at <= b.first_seen_at ? a : b;
}

export function mergeNewsArticlePair(a: ArticleMergeRow, b: ArticleMergeRow): ArticleMergeRow {
  const keeper = chooseNewsMergeKeeper(a, b);
  const other = keeper.id === a.id ? b : a;
  const contentHtml = preferNewsContentHtml(keeper.content_html, other.content_html);
  const excerptSource =
    contentHtml === keeper.content_html
      ? keeper.excerpt.length >= other.excerpt.length
        ? keeper.excerpt
        : other.excerpt
      : other.excerpt.length >= keeper.excerpt.length
        ? other.excerpt
        : keeper.excerpt;
  return {
    ...keeper,
    title: keeper.title.length >= other.title.length ? keeper.title : other.title,
    source_url: normalizeSourceUrl(keeper.source_url || other.source_url),
    content_html: contentHtml,
    excerpt: excerptSource,
    image_url: keeper.image_url || other.image_url,
    published_at: Math.min(keeper.published_at, other.published_at),
    first_seen_at: Math.min(keeper.first_seen_at, other.first_seen_at),
    updated_at: Math.max(keeper.updated_at, other.updated_at),
  };
}

/** Collapse same-channel rows that share a normalized source_url; keep richer merged row. */
export async function collapseDuplicateNewsArticles(db: D1Database, now = Date.now()) {
  const rows = (
    await db
      .prepare(
        `SELECT id, guid, channel, title, source_url, content_html, excerpt, image_url, published_at, first_seen_at, updated_at
         FROM news_articles`,
      )
      .all<ArticleMergeRow>()
  ).results;
  const groups = new Map<string, ArticleMergeRow[]>();
  for (const row of rows) {
    let normalized: string;
    try {
      normalized = normalizeSourceUrl(row.source_url);
    } catch {
      normalized = row.source_url;
    }
    const key = `${row.channel}\0${normalized}`;
    const list = groups.get(key) ?? [];
    list.push({ ...row, source_url: normalized });
    groups.set(key, list);
  }

  const statements = [];
  let collapsed = 0;
  for (const group of groups.values()) {
    if (group.length === 1) {
      const only = group[0]!;
      if (only.source_url !== rows.find((row) => row.id === only.id)?.source_url) {
        statements.push(
          db
            .prepare("UPDATE news_articles SET source_url = ?, updated_at = ? WHERE id = ?")
            .bind(only.source_url, now, only.id),
        );
      }
      continue;
    }
    let merged = group[0]!;
    for (let index = 1; index < group.length; index++) {
      merged = mergeNewsArticlePair(merged, group[index]!);
    }
    collapsed += group.length - 1;
    statements.push(
      db
        .prepare(
          `UPDATE news_articles
           SET guid = ?, title = ?, source_url = ?, content_html = ?, excerpt = ?, image_url = ?,
               published_at = ?, first_seen_at = ?, updated_at = ?
           WHERE id = ?`,
        )
        .bind(
          merged.guid,
          merged.title,
          merged.source_url,
          merged.content_html,
          merged.excerpt,
          merged.image_url,
          merged.published_at,
          merged.first_seen_at,
          now,
          merged.id,
        ),
    );
    for (const row of group) {
      if (row.id === merged.id) continue;
      statements.push(db.prepare("DELETE FROM news_articles WHERE id = ?").bind(row.id));
    }
  }
  if (statements.length) await db.batch(statements);
  return { collapsed, groups: groups.size };
}

/** Shared atomic upsert path for RSS and authenticated finished-news pushes. */
export async function newsArticleUpsertStatements(
  db: D1Database,
  articles: ParsedArticle[],
  now = Date.now(),
) {
  const values = await Promise.all(
    articles.map(async (article) => [
      await newsArticleId(article.guid),
      article.guid,
      article.channel,
      article.title,
      article.sourceUrl,
      article.contentHtml,
      article.excerpt,
      article.imageUrl ?? null,
      article.publishedAt,
      now,
      now,
    ]),
  );
  // 每条 SQL 最多 100 个参数；11 列时按 8 篇合写（88 参数）。
  const statements = [];
  for (let offset = 0; offset < values.length; offset += 8) {
    const chunk = values.slice(offset, offset + 8);
    statements.push(
      db
        .prepare(`INSERT INTO news_articles (id, guid, channel, title, source_url, content_html, excerpt, image_url, published_at, first_seen_at, updated_at)
          VALUES ${chunk.map(() => "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").join(",")}
          ON CONFLICT(guid) DO UPDATE SET
            channel=excluded.channel,
            title=excluded.title,
            source_url=excluded.source_url,
            content_html=CASE
              WHEN excluded.content_html LIKE '%<img%' AND news_articles.content_html NOT LIKE '%<img%'
              THEN excluded.content_html
              WHEN news_articles.content_html LIKE '%<img%' AND excluded.content_html NOT LIKE '%<img%'
              THEN news_articles.content_html
              WHEN length(excluded.content_html) >= length(news_articles.content_html)
              THEN excluded.content_html ELSE news_articles.content_html END,
            excerpt=CASE
              WHEN excluded.content_html LIKE '%<img%' AND news_articles.content_html NOT LIKE '%<img%'
              THEN excluded.excerpt
              WHEN news_articles.content_html LIKE '%<img%' AND excluded.content_html NOT LIKE '%<img%'
              THEN news_articles.excerpt
              WHEN length(excluded.excerpt) >= length(news_articles.excerpt)
              THEN excluded.excerpt ELSE news_articles.excerpt END,
            image_url=COALESCE(excluded.image_url, news_articles.image_url),
            published_at=MIN(excluded.published_at, news_articles.published_at),
            updated_at=excluded.updated_at`)
        .bind(...chunk.flat()),
    );
  }
  return statements;
}

async function syncOneFeedSource(
  db: D1Database,
  options: {
    channel: NewsChannel;
    feedId: string;
    url: string;
    intervalMs: number;
    sources: NewsSourceSecrets;
    now: number;
    force: boolean;
    fetcher: typeof fetch;
  },
) {
  const { channel, feedId, url, intervalMs, sources, now, force, fetcher } = options;
  await db.prepare("INSERT OR IGNORE INTO news_feeds (id) VALUES (?)").bind(feedId).run();
  const lease = await db
    .prepare(
      "UPDATE news_feeds SET lease_until = ? WHERE id = ? AND lease_until <= ? AND (? = 1 OR next_check_at <= ?)",
    )
    .bind(now + 120000, feedId, now, force ? 1 : 0, now)
    .run();
  if (!lease.meta.changes) return { id: feedId, status: "skipped" as const };

  try {
    const state = await db
      .prepare("SELECT * FROM news_feeds WHERE id = ?")
      .bind(feedId)
      .first<FeedRow>();
    const headers = new Headers({
      Accept: "application/rss+xml, application/xml",
      "User-Agent": "CeladonPortal/1.0 (+https://lowbculture.com)",
    });
    // force 全量重拉时不带条件头，避免 304 跳过正文回填（例如旧稿 img 被消毒剥掉后要重写入）。
    if (!force) {
      if (state?.etag) headers.set("If-None-Match", state.etag);
      if (state?.last_modified) headers.set("If-Modified-Since", state.last_modified);
    }
    if (sources.NEWS_RSS_BEARER_TOKEN)
      headers.set("Authorization", `Bearer ${sources.NEWS_RSS_BEARER_TOKEN}`);
    const response = await fetcher(url, {
      headers,
      signal: AbortSignal.timeout(15000),
      // Workers 不支持 error 模式；manual 暴露 3xx，随后由状态检查拒绝。
      redirect: "manual",
    });
    if (response.status === 304) {
      if (!state?.success_at) throw new NewsSyncError("首次同步收到无对应内容的 304");
      await db
        .prepare(
          "UPDATE news_feeds SET checked_at = ?, success_at = ?, next_check_at = ?, lease_until = 0, error = NULL WHERE id = ?",
        )
        .bind(now, now, now + intervalMs, feedId)
        .run();
      return { id: feedId, status: "not-modified" as const };
    }
    if (!response.ok) throw new NewsSyncError(`RSS HTTP ${response.status}`);
    const articles = parseNewsRss(await readFeedBody(response), channel)
      .map((article) => ({
        ...article,
        sourceUrl: normalizeSourceUrl(article.sourceUrl),
      }))
      .filter((article) => article.publishedAt >= now - NEWS_RETENTION_MS);
    const statements = await newsArticleUpsertStatements(db, articles, now);
    // 最后才推进 ETag；D1 batch 事务中任一写入失败，不丢掉下次重试机会。
    statements.push(
      db
        .prepare(
          "UPDATE news_feeds SET etag = ?, last_modified = ?, checked_at = ?, success_at = ?, next_check_at = ?, lease_until = 0, error = NULL WHERE id = ?",
        )
        .bind(
          response.headers.get("ETag"),
          response.headers.get("Last-Modified"),
          now,
          now,
          now + intervalMs,
          feedId,
        ),
    );
    await db.batch(statements);
    return { id: feedId, status: "updated" as const, count: articles.length };
  } catch (error) {
    const message = newsSyncErrorMessage(error);
    await db
      .prepare(
        "UPDATE news_feeds SET checked_at = ?, next_check_at = ?, lease_until = 0, error = ? WHERE id = ?",
      )
      .bind(now, now + 5 * 60 * 1000, message.slice(0, 500), feedId)
      .run();
    return { id: feedId, status: "error" as const, error: message };
  }
}

export async function syncNewsFeeds(
  db: D1Database,
  options: { sources: NewsSourceSecrets; now?: number; force?: boolean; fetcher?: typeof fetch },
) {
  const { now = Date.now(), force = false, fetcher = fetch } = options;
  const results = [];
  for (const feed of NEWS_FEEDS) {
    let urls: string[];
    try {
      urls = newsSourceUrls(feed.id, options.sources);
    } catch (error) {
      const message = newsSyncErrorMessage(error);
      // Keep legacy row so channel status still surfaces a config error.
      await db.prepare("INSERT OR IGNORE INTO news_feeds (id) VALUES (?)").bind(feed.id).run();
      await db
        .prepare(
          "UPDATE news_feeds SET checked_at = ?, next_check_at = ?, lease_until = 0, error = ? WHERE id = ?",
        )
        .bind(now, now + 5 * 60 * 1000, message.slice(0, 500), feed.id)
        .run();
      results.push({ id: feed.id, status: "error" as const, error: message });
      continue;
    }

    for (const url of urls) {
      const feedId = await newsFeedSourceId(feed.id, url, urls);
      results.push(
        await syncOneFeedSource(db, {
          channel: feed.id,
          feedId,
          url,
          intervalMs: feed.intervalMs,
          sources: options.sources,
          now,
          force,
          fetcher,
        }),
      );
    }
  }
  await collapseDuplicateNewsArticles(db, now);
  // 仅按保留期限清理，不按源内是否仍存在来删除。
  await db
    .prepare("DELETE FROM news_articles WHERE published_at < ?")
    .bind(now - NEWS_RETENTION_MS)
    .run();
  return results;
}
