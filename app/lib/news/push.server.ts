import type { NewsSyncEnv } from "./settings.server";
import { NEWS_RETENTION_MS } from "./config";
import {
  extractCoverImageUrl,
  makeExcerpt,
  sanitizeNewsHtml,
  type ParsedArticle,
} from "./parse.server";
import { renderNewsMarkdown } from "./markdown.server";
import { newsArticleUpsertStatements } from "./sync.server";
import { normalizeSourceUrl } from "./url";

const MAX_BYTES = 2 * 1024 * 1024;
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Expected object");
  return value as Record<string, unknown>;
}
function field(row: Record<string, unknown>, key: string, max: number, required = false) {
  const value = row[key];
  // Optional fields: null/undefined/"" mean "missing" (upstream often sends coverUrl: null).
  if ((value === undefined || value === null) && !required) return "";
  if (typeof value !== "string" || value.length > max || (required && !value.trim()))
    throw new Error(`Invalid ${key}`);
  return value.trim();
}
function webUrl(value: string, httpsOnly = false) {
  const url = new URL(value);
  if (!(httpsOnly ? ["https:"] : ["https:", "http:"]).includes(url.protocol))
    throw new Error("Invalid URL protocol");
  return url.href;
}
export function parseNewsPush(value: unknown, now = Date.now()) {
  const body = record(value);
  const batchId = field(body, "batchId", 200);
  if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 50)
    throw new Error("items must contain 1–50 articles");
  const seen = new Set<string>();
  const articles: ParsedArticle[] = [];
  for (const input of body.items) {
    const row = record(input);
    if (row.channel !== "anime" && row.channel !== "events") throw new Error("Invalid channel");
    const guid = field(row, "guid", 2048, true);
    const title = field(row, "title", 1000, true);
    const sourceUrl = normalizeSourceUrl(webUrl(field(row, "sourceUrl", 8192, true)));
    // ISO-8601 timestamp, or Unix milliseconds (not seconds).
    const publishedAt =
      typeof row.publishedAt === "number"
        ? row.publishedAt
        : Date.parse(field(row, "publishedAt", 100, true));
    if (!Number.isFinite(publishedAt) || publishedAt < 0 || publishedAt > now + 86400000)
      throw new Error("Invalid publishedAt");
    // Optional monotonic revision (integer or numeric string). Same publishedAt + lower version must not clobber.
    let version: number | undefined;
    if (row.version !== undefined && row.version !== null && row.version !== "") {
      const raw =
        typeof row.version === "number"
          ? row.version
          : typeof row.version === "string"
            ? Number(row.version.trim())
            : NaN;
      if (!Number.isInteger(raw) || raw < 0 || raw > Number.MAX_SAFE_INTEGER)
        throw new Error("Invalid version");
      version = raw;
    }
    const html = field(row, "contentHtml", MAX_BYTES);
    const markdown = field(row, "contentMarkdown", MAX_BYTES);
    const excerpt = field(row, "excerpt", 2000);
    const contentHtml = sanitizeNewsHtml(
      html || (markdown ? renderNewsMarkdown(markdown) : excerpt),
    );
    if (!contentHtml)
      throw new Error("Article needs nonempty contentHtml, contentMarkdown or excerpt");
    const cover = field(row, "coverUrl", 8192);
    const imageUrl = cover ? webUrl(cover, true) : extractCoverImageUrl(contentHtml);
    if (seen.has(guid) || publishedAt < now - NEWS_RETENTION_MS) continue;
    seen.add(guid);
    articles.push({
      channel: row.channel,
      guid,
      title,
      sourceUrl,
      publishedAt,
      contentHtml,
      excerpt: makeExcerpt(excerpt ? sanitizeNewsHtml(excerpt) : contentHtml),
      imageUrl,
      ...(version !== undefined ? { version } : {}),
    });
  }
  return { articles, received: body.items.length, ...(batchId ? { batchId } : {}) };
}
async function validToken(request: Request, expected?: string) {
  const match = request.headers.get("Authorization")?.match(/^Bearer ([^\s]+)$/i);
  if (!expected || !match || match[1].length > 1024) return false;
  const encoder = new TextEncoder();
  const [a, b] = await Promise.all(
    [expected, match[1]].map((token) => crypto.subtle.digest("SHA-256", encoder.encode(token))),
  );
  const aa = new Uint8Array(a),
    bb = new Uint8Array(b);
  let difference = 0;
  for (let i = 0; i < aa.length; i++) difference |= aa[i]! ^ bb[i]!;
  return difference === 0;
}
async function readJson(request: Request) {
  if (!request.body) throw new Error("Missing body");
  const reader = request.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let text = "",
    bytes = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_BYTES) {
        await reader.cancel();
        throw new Error("Body exceeds 2 MiB");
      }
      text += decoder.decode(value, { stream: true });
    }
    return JSON.parse(text + decoder.decode());
  } finally {
    reader.releaseLock();
  }
}

/** Skip older publishedAt, or same/newer clock with a lower push revision. */
async function dropStalePushArticles(db: D1Database, articles: ParsedArticle[]) {
  if (!articles.length) return articles;
  const kept: ParsedArticle[] = [];
  for (const article of articles) {
    const row = await db
      .prepare("SELECT published_at, push_version FROM news_articles WHERE guid = ?")
      .bind(article.guid)
      .first<{ published_at: number; push_version: number | null }>();
    if (row && article.publishedAt < row.published_at) continue;
    if (
      row &&
      article.version !== undefined &&
      row.push_version != null &&
      article.version < row.push_version
    )
      continue;
    kept.push(article);
  }
  return kept;
}

async function touchNewsFeedsAfterPush(db: D1Database, articles: ParsedArticle[]) {
  const channels = [...new Set(articles.map((a) => a.channel))];
  const now = Date.now();
  for (const channel of channels) {
    await db.prepare("INSERT OR IGNORE INTO news_feeds (id) VALUES (?)").bind(channel).run();
    await db
      .prepare(
        "UPDATE news_feeds SET checked_at = ?, success_at = ?, next_check_at = ?, error = NULL WHERE id = ?",
      )
      .bind(now, now, now + (channel === "events" ? 3600000 : 900000), channel)
      .run();
  }
}

/** Best-effort CDN purge; optional CF_CACHE_PURGE_TOKEN + CF_ZONE_ID secrets. */
async function purgeNewsHttpCache(
  env: NewsSyncEnv & { CF_CACHE_PURGE_TOKEN?: string; CF_ZONE_ID?: string },
) {
  const token = env.CF_CACHE_PURGE_TOKEN?.trim();
  const zone = env.CF_ZONE_ID?.trim();
  if (!token || !zone) return;
  try {
    await fetch(`https://api.cloudflare.com/client/v4/zones/${zone}/purge_cache`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prefixes: ["https://lowbculture.com/api/news", "https://lowbculture.com/news"],
      }),
    });
  } catch {
    console.error(JSON.stringify({ job: "news-push", error: "cache purge failed" }));
  }
}

export async function handleNewsPush(
  request: Request,
  env: NewsSyncEnv & { NEWS_PUSH_TOKEN?: string },
) {
  if (request.method !== "POST")
    return Response.json(
      { ok: false, error: "Method not allowed" },
      { status: 405, headers: { Allow: "POST" } },
    );
  if (!(await validToken(request, env.NEWS_PUSH_TOKEN)))
    return Response.json(
      { ok: false, error: "Unauthorized" },
      { status: 401, headers: { "WWW-Authenticate": "Bearer" } },
    );
  let parsed: ReturnType<typeof parseNewsPush>;
  try {
    parsed = parseNewsPush(await readJson(request));
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "Invalid body" },
      { status: 422 },
    );
  }
  try {
    const articles = await dropStalePushArticles(env.NEWS_DB, parsed.articles);
    const staleSkipped = parsed.articles.length - articles.length;
    const statements = await newsArticleUpsertStatements(env.NEWS_DB, articles);
    if (statements.length) await env.NEWS_DB.batch(statements);
    await touchNewsFeedsAfterPush(env.NEWS_DB, articles);
    await purgeNewsHttpCache(env);
    return Response.json({
      ok: true,
      received: parsed.received,
      upserted: articles.length,
      skipped: parsed.received - articles.length,
      staleSkipped,
      ...(parsed.batchId ? { batchId: parsed.batchId } : {}),
    });
  } catch {
    console.error(JSON.stringify({ job: "news-push", error: "D1 upsert failed" }));
    return Response.json({ ok: false, error: "Storage unavailable; retry batch" }, { status: 503 });
  }
}
