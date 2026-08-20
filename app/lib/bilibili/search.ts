import { buildBilibiliBangumiUrl, buildBilibiliEmbedUrl } from "./player";
import type { BilibiliMatch } from "./types";

const BILI_SEARCH = "https://api.bilibili.com/x/web-interface/search/type";

const BILI_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Referer: "https://www.bilibili.com",
  Accept: "application/json",
} as const;

type BangumiSearchItem = {
  season_id?: number;
  title?: string;
};

type BangumiSearchResponse = {
  code: number;
  data?: { result?: BangumiSearchItem[] };
};

const SEARCH_TIMEOUT_MS = 4000;

/**
 * 用番剧中文/日文名在 B 站搜「番剧」类目，取第一条 season_id 供 iframe 嵌入。
 * 非官方开放 API，失败时返回 null（仍可走搜索页外链）。
 */
export async function searchBilibiliBangumi(keyword: string): Promise<BilibiliMatch | null> {
  const q = keyword.trim();
  if (!q) return null;

  const url = new URL(BILI_SEARCH);
  url.searchParams.set("search_type", "media_bangumi");
  url.searchParams.set("keyword", q);

  const res = await fetch(url.toString(), {
    headers: BILI_HEADERS,
    signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS),
  });

  if (!res.ok) return null;

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return null;

  const json = (await res.json()) as BangumiSearchResponse;
  if (json.code !== 0) return null;

  const hit = json.data?.result?.find((item) => item.season_id);
  if (!hit?.season_id) return null;

  const seasonId = hit.season_id;
  return {
    seasonId,
    title: hit.title ?? q,
    pageUrl: buildBilibiliBangumiUrl(seasonId),
    embedUrl: buildBilibiliEmbedUrl(seasonId),
  };
}
