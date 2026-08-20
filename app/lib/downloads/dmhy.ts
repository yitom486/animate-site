import { createCache, withCache } from "~/lib/cache";
import {
  btihFromMagnet,
  classifyBatch,
  normalizeHash,
  parseResolution,
  type DownloadItem,
} from "./types";

/** 動漫花園关键词 RSS 搜索：服务器端直连、无验证码 */
const DMHY_RSS = "https://share.dmhy.org/topics/rss/rss.xml";
/** 分类 2 = 動畫 */
const DMHY_SORT_ANIME = "2";
const FETCH_TIMEOUT_MS = 10_000;
const CACHE_TTL_MS = 30 * 60 * 1000;

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (compatible; yhang/anime-site; +https://github.com/yitom486/animate-site)",
  Accept: "application/rss+xml, application/xml, text/xml, */*",
} as const;

const cache = createCache<DownloadItem[]>(CACHE_TTL_MS);

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function extractTag(block: string, tag: string): string | undefined {
  const re = new RegExp(
    `<${tag}[^>]*>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([^<]*))<\\/${tag}>`,
    "i",
  );
  const m = block.match(re);
  const raw = (m?.[1] ?? m?.[2] ?? "").trim();
  return raw || undefined;
}

function parseDmhyRss(xml: string): DownloadItem[] {
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];
  const out: DownloadItem[] = [];

  for (const block of blocks) {
    const title = extractTag(block, "title");
    const link = extractTag(block, "link");
    if (!title || !link) continue;

    const rawMagnet = block.match(/<enclosure\s+[^>]*url="([^"]+)"/i)?.[1];
    const magnet = rawMagnet ? decodeEntities(rawMagnet) : undefined;
    const btih = magnet ? btihFromMagnet(magnet) : undefined;
    if (!magnet || !btih) continue;

    out.push({
      hash: normalizeHash(btih),
      title: decodeEntities(title),
      magnet,
      detailUrl: link,
      resolution: parseResolution(title),
      sources: ["dmhy"],
      isBatch: classifyBatch(title),
    });
  }
  return out;
}

async function searchByKeyword(keyword: string): Promise<DownloadItem[]> {
  return withCache(cache, `dmhy:${keyword}`, async () => {
    const url = new URL(DMHY_RSS);
    url.searchParams.set("sort_id", DMHY_SORT_ANIME);
    url.searchParams.set("keyword", keyword);
    const res = await fetch(url.toString(), {
      headers: HEADERS,
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`dmhy RSS HTTP ${res.status}`);
    return parseDmhyRss(await res.text());
  });
}

export async function fetchDmhyDownloads(keywords: string[]): Promise<DownloadItem[]> {
  const lists = await Promise.all(
    keywords.map((kw) => searchByKeyword(kw).catch(() => [] as DownloadItem[])),
  );
  return lists.flat();
}
