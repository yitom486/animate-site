import type { D1Database } from "@cloudflare/workers-types";
import { NEWS_FEEDS, NEWS_RETENTION_MS } from "./config";
import type { FeedRow } from "./db.server";
import { newsArticleId, parseNewsRss } from "./parse.server";
import {
  newsSourceUrl,
  newsSyncErrorMessage,
  NewsSyncError,
  type NewsSourceSecrets,
} from "./settings.server";

const MAX_FEED_BYTES = 2 * 1024 * 1024;

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

export async function syncNewsFeeds(
  db: D1Database,
  options: { sources: NewsSourceSecrets; now?: number; force?: boolean; fetcher?: typeof fetch },
) {
  const { now = Date.now(), force = false, fetcher = fetch } = options;
  const results = [];
  for (const feed of NEWS_FEEDS) {
    await db.prepare("INSERT OR IGNORE INTO news_feeds (id) VALUES (?)").bind(feed.id).run();
    const lease = await db
      .prepare(
        "UPDATE news_feeds SET lease_until = ? WHERE id = ? AND lease_until <= ? AND (? = 1 OR next_check_at <= ?)",
      )
      .bind(now + 120000, feed.id, now, force ? 1 : 0, now)
      .run();
    if (!lease.meta.changes) {
      results.push({ id: feed.id, status: "skipped" });
      continue;
    }
    try {
      const state = await db
        .prepare("SELECT * FROM news_feeds WHERE id = ?")
        .bind(feed.id)
        .first<FeedRow>();
      const headers = new Headers({
        Accept: "application/rss+xml, application/xml",
        "User-Agent": "CeladonPortal/1.0 (+https://lowbculture.com)",
      });
      if (state?.etag) headers.set("If-None-Match", state.etag);
      if (state?.last_modified) headers.set("If-Modified-Since", state.last_modified);
      if (options.sources.NEWS_RSS_BEARER_TOKEN)
        headers.set("Authorization", `Bearer ${options.sources.NEWS_RSS_BEARER_TOKEN}`);
      const response = await fetcher(newsSourceUrl(feed.id, options.sources), {
        headers,
        signal: AbortSignal.timeout(15000),
        redirect: "error",
      });
      if (response.status === 304) {
        if (!state?.success_at) throw new NewsSyncError("首次同步收到无对应内容的 304");
        await db
          .prepare(
            "UPDATE news_feeds SET checked_at = ?, success_at = ?, next_check_at = ?, lease_until = 0, error = NULL WHERE id = ?",
          )
          .bind(now, now, now + feed.intervalMs, feed.id)
          .run();
        results.push({ id: feed.id, status: "not-modified" });
        continue;
      }
      if (!response.ok) throw new NewsSyncError(`RSS HTTP ${response.status}`);
      const articles = parseNewsRss(await readFeedBody(response), feed.id).filter(
        (article) => article.publishedAt >= now - NEWS_RETENTION_MS,
      );
      const values = await Promise.all(
        articles.map(async (article) => [
          await newsArticleId(article.guid),
          article.guid,
          article.channel,
          article.title,
          article.sourceUrl,
          article.contentHtml,
          article.excerpt,
          article.publishedAt,
          now,
          now,
        ]),
      );
      // 每条 SQL 最多 100 个参数；十篇合写，降低 Worker 的 D1 查询次数。
      const statements = [];
      for (let offset = 0; offset < values.length; offset += 10) {
        const chunk = values.slice(offset, offset + 10);
        statements.push(
          db
            .prepare(`INSERT INTO news_articles (id, guid, channel, title, source_url, content_html, excerpt, published_at, first_seen_at, updated_at)
          VALUES ${chunk.map(() => "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").join(",")}
          ON CONFLICT(guid) DO UPDATE SET channel=excluded.channel, title=excluded.title, source_url=excluded.source_url, content_html=excluded.content_html, excerpt=excluded.excerpt, published_at=excluded.published_at, updated_at=excluded.updated_at`)
            .bind(...chunk.flat()),
        );
      }
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
            now + feed.intervalMs,
            feed.id,
          ),
      );
      await db.batch(statements);
      results.push({ id: feed.id, status: "updated", count: articles.length });
    } catch (error) {
      const message = newsSyncErrorMessage(error);
      await db
        .prepare(
          "UPDATE news_feeds SET checked_at = ?, next_check_at = ?, lease_until = 0, error = ? WHERE id = ?",
        )
        .bind(now, now + 5 * 60 * 1000, message.slice(0, 500), feed.id)
        .run();
      results.push({ id: feed.id, status: "error", error: message });
    }
  }
  // 仅按保留期限清理，不按源内是否仍存在来删除。
  await db
    .prepare("DELETE FROM news_articles WHERE published_at < ?")
    .bind(now - NEWS_RETENTION_MS)
    .run();
  return results;
}
