import { buildBilibiliBangumiUrl, buildBilibiliEmbedUrl, buildBilibiliEpisodeUrl } from "./player";
import type {
  BilibiliEpisode,
  BilibiliMatch,
  BilibiliMatchResponse,
  BilibiliMatchStatus,
} from "./types";
import { createCache, withCache } from "~/lib/cache";

const BILI_WBI_TYPE = "https://api.bilibili.com/x/web-interface/wbi/search/type";
const BILI_ALL_V2 = "https://api.bilibili.com/x/web-interface/search/all/v2";
const BILI_LEGACY_TYPE = "https://api.bilibili.com/x/web-interface/search/type";
const BILI_SEASON_VIEW = "https://api.bilibili.com/pgc/view/web/season";
const BILI_MEDIA_VIEW = "https://api.bilibili.com/pgc/review/user";

const mediaCache = createCache<BilibiliMatch>({ ttlMs: 60 * 60 * 1000, maxEntries: 256 });

class PlaybackLookupError extends Error {
  constructor(readonly status: Exclude<BilibiliMatchStatus, "matched">) {
    super("Bilibili playback metadata unavailable");
  }
}

const BILI_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Referer: "https://www.bilibili.com/",
  Origin: "https://www.bilibili.com",
  Accept: "application/json, text/plain, */*",
} as const;

type BangumiSearchItem = {
  season_id?: number;
  pgc_season_id?: number;
  media_id?: number;
  title?: string;
  org_title?: string;
  url?: string;
  eps?: Array<{ id?: number; url?: string }>;
};

type TypedSearchResponse = {
  code: number;
  message?: string;
  data?: { result?: BangumiSearchItem[] };
};

type AllV2Response = {
  code: number;
  message?: string;
  data?: {
    result?: Array<{ result_type?: string; data?: BangumiSearchItem[] }>;
  };
};

type SeasonViewEpisode = {
  id?: number;
  title?: string;
  long_title?: string;
  badge?: string;
  share_url?: string;
  link?: string;
};

type SeasonViewResponse = {
  code?: number;
  result?: {
    episodes?: SeasonViewEpisode[];
  };
};

function mapEpisode(ep: SeasonViewEpisode, seasonId: number): BilibiliEpisode | null {
  if (!ep.id) return null;
  const pageUrl = ep.share_url || ep.link || buildBilibiliEpisodeUrl(ep.id);
  const embedUrl = buildBilibiliEmbedUrl({ episodeId: ep.id, seasonId });
  return {
    epId: ep.id,
    indexLabel: ep.title?.trim() || String(ep.id),
    title: ep.long_title?.trim() || undefined,
    pageUrl,
    embedUrl,
    badge: ep.badge?.trim() || undefined,
  };
}

async function enrichPlayback(match: BilibiliMatch): Promise<BilibiliMatchResponse> {
  try {
    const url = new URL(BILI_SEASON_VIEW);
    url.searchParams.set("season_id", String(match.seasonId));
    const fetched = await fetchJson(url.toString(), AbortSignal.timeout(SEARCH_TIMEOUT_MS));
    if (!("ok" in fetched)) return { match: null, status: fetched.status };

    const json = fetched.body as SeasonViewResponse;
    const classified = classifyApiCode(json.code ?? -1);
    if (classified) return { match: null, status: classified };

    const episodes = (json.result?.episodes ?? [])
      .map((ep) => mapEpisode(ep, match.seasonId))
      .filter((ep): ep is BilibiliEpisode => ep !== null);
    if (!episodes.length) return { match, status: "matched" };

    const first = episodes[0];
    return {
      status: "matched",
      match: { ...match, pageUrl: first.pageUrl, episodes },
    };
  } catch {
    return { match: null, status: "unavailable" };
  }
}

/** 已知正版平台 mediaId 时精确查询，不走搜索，也不将失败回退到相似番剧。 */
export async function resolveBilibiliMedia(mediaId: number): Promise<BilibiliMatchResponse> {
  if (!Number.isSafeInteger(mediaId) || mediaId <= 0) return { match: null, status: "empty" };
  try {
    const match = await withCache(
      mediaCache,
      `bilibili:media:v2:${mediaId}`,
      async () => {
        const url = new URL(BILI_MEDIA_VIEW);
        url.searchParams.set("media_id", String(mediaId));
        const fetched = await fetchJson(url.toString(), AbortSignal.timeout(SEARCH_TIMEOUT_MS));
        if (!("ok" in fetched)) throw new PlaybackLookupError(fetched.status);
        const json = fetched.body as {
          code?: number;
          result?: { media?: { season_id?: number; title?: string } };
        };
        const classified = classifyApiCode(json.code ?? -1);
        if (classified) throw new PlaybackLookupError(classified);
        const media = json.result?.media;
        const seasonId = media?.season_id;
        if (!seasonId) throw new PlaybackLookupError("empty");
        const seasonUrl = buildBilibiliBangumiUrl(seasonId);
        const result = await enrichPlayback({
          seasonId,
          title: stripHtml(media.title || "B 站番剧"),
          seasonUrl,
          pageUrl: seasonUrl,
          episodes: [],
        });
        // 风控/网络失败不能当作成功缓存，也不能缓存没有分集的临时结果。
        if (!result.match?.episodes.length) {
          throw new PlaybackLookupError(
            result.status === "matched" ? "unavailable" : result.status,
          );
        }
        return result.match;
      },
      { useEdge: true },
    );
    return { match, status: "matched" };
  } catch (error) {
    return {
      match: null,
      status: error instanceof PlaybackLookupError ? error.status : "unavailable",
    };
  }
}

const SEARCH_TIMEOUT_MS = 4000;

function stripHtml(text: string): string {
  return text
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function toMatch(item: BangumiSearchItem, fallbackTitle: string): BilibiliMatch | null {
  const seasonId = item.season_id ?? item.pgc_season_id;
  if (!seasonId) return null;
  const title = stripHtml(item.title || item.org_title || fallbackTitle);
  const seasonUrl = buildBilibiliBangumiUrl(seasonId);
  const firstEpId = item.eps?.find((ep) => ep.id)?.id;
  return {
    seasonId,
    title,
    seasonUrl,
    pageUrl: firstEpId ? buildBilibiliEpisodeUrl(firstEpId) : (item.url ?? seasonUrl),
    episodes: [],
  };
}

function pickHit(
  items: BangumiSearchItem[] | undefined,
  fallbackTitle: string,
): BilibiliMatch | null {
  if (!items?.length) return null;
  const normalize = (value: string) =>
    stripHtml(value)
      .normalize("NFKC")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]/gu, "");
  const expected = normalize(fallbackTitle);
  if (!expected) return null;
  for (const item of items) {
    if (![item.title, item.org_title].some((title) => title && normalize(title) === expected))
      continue;
    const match = toMatch(item, fallbackTitle);
    if (match) return match;
  }
  return null;
}

function classifyHttp(res: Response): Exclude<BilibiliMatchStatus, "matched" | "empty"> {
  if ([403, 412, 429].includes(res.status)) return "blocked";
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return "blocked";
  return "unavailable";
}

function classifyApiCode(code: number): Exclude<BilibiliMatchStatus, "matched" | "empty"> | null {
  if (code === 0) return null;
  if (code === -412 || code === -352 || code === -3) return "blocked";
  return "unavailable";
}

async function fetchJson(
  url: string,
  signal: AbortSignal,
): Promise<
  { status: Exclude<BilibiliMatchStatus, "matched" | "empty"> } | { ok: true; body: unknown }
> {
  const res = await fetch(url, { headers: BILI_HEADERS, signal });
  if (!res.ok) return { status: classifyHttp(res) };
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return { status: "blocked" };
  return { ok: true, body: await res.json() };
}

async function searchTypedEndpoint(
  endpoint: string,
  keyword: string,
  signal: AbortSignal,
): Promise<BilibiliMatchResponse> {
  const url = new URL(endpoint);
  url.searchParams.set("search_type", "media_bangumi");
  url.searchParams.set("keyword", keyword);

  const fetched = await fetchJson(url.toString(), signal);
  if (!("ok" in fetched)) return { match: null, status: fetched.status };

  const json = fetched.body as TypedSearchResponse;
  const classified = classifyApiCode(json.code);
  if (classified) return { match: null, status: classified };

  const match = pickHit(json.data?.result, keyword);
  return match ? { match, status: "matched" } : { match: null, status: "empty" };
}

async function searchAllV2(keyword: string, signal: AbortSignal): Promise<BilibiliMatchResponse> {
  const url = new URL(BILI_ALL_V2);
  url.searchParams.set("keyword", keyword);

  const fetched = await fetchJson(url.toString(), signal);
  if (!("ok" in fetched)) return { match: null, status: fetched.status };

  const json = fetched.body as AllV2Response;
  const classified = classifyApiCode(json.code);
  if (classified) return { match: null, status: classified };

  const block = json.data?.result?.find((item) => item.result_type === "media_bangumi");
  const match = pickHit(block?.data, keyword);
  return match ? { match, status: "matched" } : { match: null, status: "empty" };
}

/**
 * 用番剧中文/日文名在 B 站搜「番剧」类目。
 * 优先 WBI 搜索（旧 search/type 常被 -412 风控）；失败再回退其它端点。
 */
export async function searchBilibiliBangumi(keyword: string): Promise<BilibiliMatchResponse> {
  const q = keyword.trim();
  if (!q) return { match: null, status: "empty" };

  const attempts = [
    () => searchTypedEndpoint(BILI_WBI_TYPE, q, AbortSignal.timeout(SEARCH_TIMEOUT_MS)),
    () => searchAllV2(q, AbortSignal.timeout(SEARCH_TIMEOUT_MS)),
    () => searchTypedEndpoint(BILI_LEGACY_TYPE, q, AbortSignal.timeout(SEARCH_TIMEOUT_MS)),
  ];

  let blocked = false;
  let unavailable = false;

  for (const attempt of attempts) {
    try {
      const result = await attempt();
      if (result.status === "matched" && result.match) {
        return enrichPlayback(result.match);
      }
      if (result.status === "empty") return result;
      if (result.status === "blocked") blocked = true;
      if (result.status === "unavailable") unavailable = true;
    } catch {
      unavailable = true;
    }
  }

  return { match: null, status: blocked ? "blocked" : unavailable ? "unavailable" : "empty" };
}

/**
 * 按中文名 → 原名串行回退。第一个命中即停。
 * 空结果才换下一个关键词；被风控/上游失败则不再浪费后续关键词。
 */
export async function matchBilibiliBangumi(keywords: string[]): Promise<BilibiliMatchResponse> {
  const seen = new Set<string>();
  let last: BilibiliMatchResponse = { match: null, status: "empty" };

  for (const keyword of keywords) {
    const q = keyword.trim();
    if (!q || seen.has(q)) continue;
    seen.add(q);
    last = await searchBilibiliBangumi(q);
    if (last.status === "matched") return last;
    if (last.status !== "empty") return last;
  }

  return last;
}
