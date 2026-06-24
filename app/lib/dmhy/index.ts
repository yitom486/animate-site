import { createCache, withCache } from "~/lib/bangumi/cache";
import { rssDateToIso } from "~/lib/news/parse-rss";

/** 動漫花園（dmhy）关键词 RSS 搜索：支持服务器端直连、无验证码 */
const DMHY_RSS = "https://share.dmhy.org/topics/rss/rss.xml";
/** 分类 2 = 動畫 */
const DMHY_SORT_ANIME = "2";
const FETCH_TIMEOUT_MS = 10_000;
const CACHE_TTL_MS = 30 * 60 * 1000;
/** 单部番最多用几个关键词查（控制上游请求数） */
const MAX_KEYWORDS = 4;
const RESULT_LIMIT = 10;

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (compatible; yhang/anime-site; +https://github.com/yitom486/animate-site)",
  Accept: "application/rss+xml, application/xml, text/xml, */*",
} as const;

export type DmhyItem = {
  id: string;
  title: string;
  link: string;
  magnet?: string;
  resolution?: string;
  publishedAt?: string;
};

const cache = createCache<DmhyItem[]>(CACHE_TTL_MS);

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

function parseResolution(title: string): string | undefined {
  return title.match(/\b(\d{3,4}[pP])\b/)?.[1]?.toUpperCase();
}

function parseDmhyRss(xml: string): DmhyItem[] {
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];
  return blocks
    .map((block): DmhyItem | null => {
      const title = extractTag(block, "title");
      const link = extractTag(block, "link");
      if (!title || !link) return null;
      const magnet = block.match(/<enclosure\s+[^>]*url="([^"]+)"/i)?.[1];
      return {
        id: link,
        title: decodeEntities(title),
        link,
        magnet: magnet ? decodeEntities(magnet) : undefined,
        resolution: parseResolution(title),
        publishedAt: rssDateToIso(extractTag(block, "pubDate")),
      };
    })
    .filter((x): x is DmhyItem => x !== null);
}

async function searchByKeyword(keyword: string): Promise<DmhyItem[]> {
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

function publishedTime(item: DmhyItem): number {
  const t = item.publishedAt ? Date.parse(item.publishedAt) : 0;
  return Number.isNaN(t) ? 0 : t;
}

/**
 * 用番剧中文名 / 原名 / 别名等多个关键词在 dmhy 搜索，合并去重。
 * 关键词通常含多种译名（如「海贼王 / 航海王 / ONE PIECE」），命中率更高。
 */
export async function fetchDmhyForAnime(
  keywords: string[],
  limit = RESULT_LIMIT,
): Promise<DmhyItem[]> {
  const terms = [
    ...new Set(keywords.map((k) => k.trim()).filter((k) => k.length >= 2)),
  ].slice(0, MAX_KEYWORDS);
  if (!terms.length) return [];

  const lists = await Promise.all(
    terms.map((kw) => searchByKeyword(kw).catch(() => [] as DmhyItem[])),
  );

  const seen = new Set<string>();
  const merged: DmhyItem[] = [];
  for (const item of lists.flat()) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    merged.push(item);
  }

  return merged
    .sort((a, b) => publishedTime(b) - publishedTime(a))
    .slice(0, limit);
}
