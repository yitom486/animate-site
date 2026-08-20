import { buildBilibiliBangumiUrl, buildBilibiliEmbedUrl, buildBilibiliEpisodeUrl } from "./player";
import type {
  BilibiliEpisode,
  BilibiliMatch,
  BilibiliMatchResponse,
  BilibiliMatchStatus,
} from "./types";

const BILI_WBI_TYPE = "https://api.bilibili.com/x/web-interface/wbi/search/type";
const BILI_ALL_V2 = "https://api.bilibili.com/x/web-interface/search/all/v2";
const BILI_LEGACY_TYPE = "https://api.bilibili.com/x/web-interface/search/type";
const BILI_SEASON_VIEW = "https://api.bilibili.com/pgc/view/web/season";

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
  aid?: number;
  bvid?: string;
  cid?: number;
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

function mapEpisode(ep: SeasonViewEpisode): BilibiliEpisode | null {
  if (!ep.id) return null;
  const pageUrl = ep.share_url || ep.link || buildBilibiliEpisodeUrl(ep.id);
  const embedUrl =
    ep.aid && ep.bvid && ep.cid
      ? buildBilibiliEmbedUrl({ aid: ep.aid, bvid: ep.bvid, cid: ep.cid })
      : undefined;
  return {
    epId: ep.id,
    indexLabel: ep.title?.trim() || String(ep.id),
    title: ep.long_title?.trim() || undefined,
    pageUrl,
    embedUrl,
    badge: ep.badge?.trim() || undefined,
  };
}

async function enrichPlayback(match: BilibiliMatch): Promise<BilibiliMatch> {
  try {
    const url = new URL(BILI_SEASON_VIEW);
    url.searchParams.set("season_id", String(match.seasonId));
    const fetched = await fetchJson(url.toString(), AbortSignal.timeout(SEARCH_TIMEOUT_MS));
    if (!("ok" in fetched)) return match;

    const json = fetched.body as SeasonViewResponse;
    if (json.code !== 0) return match;

    const episodes = (json.result?.episodes ?? [])
      .map(mapEpisode)
      .filter((ep): ep is BilibiliEpisode => ep !== null);
    if (!episodes.length) return match;

    const first = episodes[0];
    return {
      ...match,
      pageUrl: first.pageUrl,
      episodes,
    };
  } catch {
    return match;
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
  for (const item of items) {
    const match = toMatch(item, fallbackTitle);
    if (match) return match;
  }
  return null;
}

function classifyHttp(res: Response): Exclude<BilibiliMatchStatus, "matched" | "empty"> {
  if (res.status === 412) return "blocked";
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
        return { ...result, match: await enrichPlayback(result.match) };
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
