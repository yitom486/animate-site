import type { D1Database } from "@cloudflare/workers-types";
import { createCache, withCache } from "~/lib/cache";
import { buildBilibiliBangumiUrl, buildBilibiliEmbedUrl, buildBilibiliEpisodeUrl } from "./player";
import type { BilibiliMatch, BilibiliMatchResponse } from "./types";

export type JiluEnv = {
  JILU_API_KEY?: string;
  JILU_API_BASE_URL?: string;
  NEWS_DB?: D1Database;
};

const memory = createCache<BilibiliMatch>({ ttlMs: 60000, maxEntries: 256 });
const COOLDOWN_ID = "jilu-cooldown";
class MetadataError extends Error {
  constructor(
    readonly status: "empty" | "blocked" | "unavailable" | "rate_limited",
    readonly httpStatus = 503,
    readonly retryAfterSeconds?: number,
  ) {
    super("Metadata service unavailable");
  }
}

export function jiluEnvFromContext(context: { cloudflare?: unknown }): JiluEnv {
  return (context.cloudflare as { env?: JiluEnv } | undefined)?.env ?? {};
}

export function hasJiluConfig(env: JiluEnv) {
  return Boolean(env.JILU_API_KEY && env.JILU_API_BASE_URL);
}

const positiveId = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value > 0;

/** 只把校验过的公开字段返回浏览器，不转发服务原始响应或异常。 */
export function decodeJiluMetadata(value: unknown, mediaId: number): BilibiliMatch {
  const row = value as Record<string, unknown> | null;
  if (
    !row ||
    row.schemaVersion !== 1 ||
    row.status !== "matched" ||
    row.mediaId !== mediaId ||
    !positiveId(row.seasonId) ||
    typeof row.title !== "string" ||
    !row.title.trim() ||
    typeof row.updatedAt !== "string" ||
    !Number.isFinite(Date.parse(row.updatedAt)) ||
    typeof row.stale !== "boolean" ||
    !Array.isArray(row.episodes) ||
    !row.episodes.length ||
    row.episodes.length > 5000
  ) {
    throw new MetadataError("unavailable");
  }
  const seasonId = row.seasonId;
  const seen = new Set<number>();
  const episodes = row.episodes.map((ep: unknown) => {
    const item = ep as Record<string, unknown> | null;
    if (
      !item ||
      !positiveId(item.epId) ||
      seen.has(item.epId) ||
      typeof item.indexLabel !== "string" ||
      !item.indexLabel.trim() ||
      (item.title != null && typeof item.title !== "string") ||
      (item.badge != null && typeof item.badge !== "string")
    )
      throw new MetadataError("unavailable");
    seen.add(item.epId);
    return {
      epId: item.epId,
      indexLabel: item.indexLabel,
      title: typeof item.title === "string" ? item.title : undefined,
      badge: typeof item.badge === "string" ? item.badge : undefined,
      pageUrl: buildBilibiliEpisodeUrl(item.epId),
      embedUrl: buildBilibiliEmbedUrl({ episodeId: item.epId, seasonId }),
    };
  });
  return {
    seasonId,
    title: row.title,
    updatedAt: row.updatedAt,
    stale: row.stale,
    seasonUrl: buildBilibiliBangumiUrl(seasonId),
    pageUrl: episodes[0].pageUrl,
    episodes,
  };
}

/** 全站滚动一分钟最多 50 次；每个访客最多 5 次上游取数，D1 原子准入跨实例生效。 */
export async function reserveJiluRequest(db: D1Database, client: string, now = Date.now()) {
  const results = await db.batch([
    db.prepare("DELETE FROM bilibili_metadata_requests WHERE requested_at <= ?").bind(now - 60000),
    db
      .prepare(`INSERT INTO bilibili_metadata_requests (id, requested_at, client)
      SELECT ?, ?, ? WHERE
      COALESCE((SELECT requested_at FROM bilibili_metadata_requests WHERE id = ?), 0) <= ?
      AND (SELECT COUNT(*) FROM bilibili_metadata_requests WHERE id != ? AND requested_at > ?) < 50
      AND (SELECT COUNT(*) FROM bilibili_metadata_requests WHERE client = ? AND requested_at > ?) < 5
      RETURNING id`)
      .bind(
        crypto.randomUUID(),
        now,
        client,
        COOLDOWN_ID,
        now,
        COOLDOWN_ID,
        now - 60000,
        client,
        now - 60000,
      ),
  ]);
  return Boolean(results[1]?.results?.length);
}

function retrySeconds(value: string | null) {
  if (value && /^\d+$/.test(value) && Number.isSafeInteger(Number(value)))
    return Math.max(1, Number(value));
  const time = value ? Date.parse(value) : NaN;
  return Number.isFinite(time) ? Math.max(1, Math.ceil((time - Date.now()) / 1000)) : 60;
}

async function readJson(response: Response): Promise<unknown> {
  if (!response.headers.get("content-type")?.includes("application/json") || !response.body)
    throw new MetadataError("unavailable");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = "";
  try {
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > 2 * 1024 * 1024) {
        await reader.cancel();
        throw new MetadataError("unavailable");
      }
      text += decoder.decode(chunk.value, { stream: true });
    }
    return JSON.parse(text + decoder.decode());
  } finally {
    reader.releaseLock();
  }
}

export async function fetchJiluMetadata(
  mediaId: number,
  env: JiluEnv,
  clientIp: string | null,
): Promise<{ body: BilibiliMatchResponse; httpStatus: number }> {
  try {
    if (!hasJiluConfig(env) || !env.NEWS_DB) throw new MetadataError("unavailable");
    const base = new URL(env.JILU_API_BASE_URL!);
    if (base.protocol !== "https:" || base.username || base.password || base.search || base.hash)
      throw new MetadataError("unavailable");
    base.pathname = `${base.pathname.replace(/\/$/, "")}/v1/bilibili/media/${mediaId}`;
    const db = env.NEWS_DB;
    const match = await withCache(memory, `${base.origin}${base.pathname}`, async () => {
      const saved = await db
        .prepare("SELECT payload, fetched_at FROM bilibili_metadata_cache WHERE media_id = ?")
        .bind(mediaId)
        .first<{ payload: string; fetched_at: number }>();
      let previous: BilibiliMatch | null = null;
      try {
        previous = saved ? (JSON.parse(saved.payload) as BilibiliMatch) : null;
        if (!Array.isArray(previous?.episodes) || !previous.episodes.length) previous = null;
      } catch {
        /* 损坏记录重新取数。 */
      }
      if (
        saved &&
        previous?.episodes.length &&
        Date.now() - saved.fetched_at < (previous.stale ? 300000 : 3600000)
      )
        return previous;
      try {
        const hash = await crypto.subtle.digest(
          "SHA-256",
          new TextEncoder().encode(clientIp ?? "unknown"),
        );
        const client = Array.from(new Uint8Array(hash), (n) =>
          n.toString(16).padStart(2, "0"),
        ).join("");
        if (!(await reserveJiluRequest(db, client))) {
          const cooldown = await db
            .prepare("SELECT requested_at FROM bilibili_metadata_requests WHERE id = ?")
            .bind(COOLDOWN_ID)
            .first<{ requested_at: number }>();
          throw new MetadataError(
            "rate_limited",
            429,
            Math.max(60, Math.ceil(((cooldown?.requested_at ?? 0) - Date.now()) / 1000)),
          );
        }
        const response = await fetch(base, {
          headers: { Authorization: `Bearer ${env.JILU_API_KEY}`, Accept: "application/json" },
          redirect: "manual",
          signal: AbortSignal.timeout(45000),
        });
        if (response.status === 429) {
          const seconds = retrySeconds(response.headers.get("retry-after"));
          await db
            .prepare(`INSERT INTO bilibili_metadata_requests (id, requested_at, client) VALUES (?, ?, 'cooldown')
            ON CONFLICT(id) DO UPDATE SET requested_at = MAX(requested_at, excluded.requested_at)`)
            .bind(COOLDOWN_ID, Date.now() + seconds * 1000)
            .run();
          throw new MetadataError("rate_limited", 429, seconds);
        }
        if (response.status === 404) {
          await db
            .prepare("DELETE FROM bilibili_metadata_cache WHERE media_id = ?")
            .bind(mediaId)
            .run();
          throw new MetadataError("empty", 404);
        }
        if (!response.ok) {
          console.warn(JSON.stringify({ service: "jilu", httpStatus: response.status }));
          let status: "blocked" | "unavailable" = "unavailable";
          if (response.status === 503) {
            const failure = (await readJson(response).catch(() => null)) as {
              status?: string;
            } | null;
            if (failure?.status === "blocked") status = "blocked";
          }
          throw new MetadataError(status);
        }
        const result = decodeJiluMetadata(await readJson(response), mediaId);
        await db
          .prepare(`INSERT INTO bilibili_metadata_cache (media_id, payload, fetched_at) VALUES (?, ?, ?)
          ON CONFLICT(media_id) DO UPDATE SET payload = excluded.payload, fetched_at = excluded.fetched_at`)
          .bind(mediaId, JSON.stringify(result), Date.now())
          .run();
        return result;
      } catch (error) {
        if (
          previous?.episodes.length &&
          !(error instanceof MetadataError && error.status === "empty")
        )
          return { ...previous, stale: true };
        throw error;
      }
    });
    return { body: { status: "matched", match }, httpStatus: 200 };
  } catch (error) {
    const failure = error instanceof MetadataError ? error : new MetadataError("unavailable");
    return {
      body: {
        status: failure.status,
        match: null,
        ...(failure.retryAfterSeconds ? { retryAfterSeconds: failure.retryAfterSeconds } : {}),
      },
      httpStatus: failure.httpStatus,
    };
  }
}
