import { createCache, withCache } from "~/lib/cache";
import {
  classifyBatch,
  magnetFromHash,
  normalizeHash,
  parseResolution,
  type DownloadItem,
} from "./types";

const COMICAT = "https://www.comicat.org";
const FETCH_TIMEOUT_MS = 10_000;
const CACHE_TTL_MS = 30 * 60 * 1000;

/**
 * 漫猫整站有 "visitor_test" 反爬门，但它不是真验证码：
 * cookie 值就是字面量 "human"，直接带上即可访问搜索页。
 */
const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Cookie: "visitor_test=human",
  Referer: `${COMICAT}/`,
  Accept: "text/html,application/xhtml+xml,*/*",
} as const;

const cache = createCache<DownloadItem[]>(CACHE_TTL_MS);

function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function parseComicatHtml(html: string): DownloadItem[] {
  const rows = html.match(/<tr class="alt[^"]*">([\s\S]*?)<\/tr>/gi) ?? [];
  const out: DownloadItem[] = [];

  for (const row of rows) {
    const tm = row.match(/show-([0-9a-f]+)\.html"[^>]*>([\s\S]*?)<\/a>/i);
    if (!tm) continue;
    const rawHash = tm[1];
    const title = stripTags(tm[2]);
    if (!title) continue;

    const size = row.match(/<td>\s*([\d.]+\s*[GMK]B)\s*<\/td>/i)?.[1]?.trim();
    const hash = normalizeHash(rawHash);

    out.push({
      hash,
      title,
      magnet: magnetFromHash(hash),
      detailUrl: `${COMICAT}/show-${rawHash}.html`,
      size,
      resolution: parseResolution(title),
      sources: ["comicat"],
      isBatch: classifyBatch(title),
    });
  }
  return out;
}

async function searchByKeyword(keyword: string): Promise<DownloadItem[]> {
  return withCache(cache, `comicat:${keyword}`, async () => {
    const url = `${COMICAT}/search.php?keyword=${encodeURIComponent(keyword)}`;
    const res = await fetch(url, {
      headers: HEADERS,
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`comicat HTTP ${res.status}`);
    return parseComicatHtml(await res.text());
  });
}

export async function fetchComicatDownloads(keywords: string[]): Promise<DownloadItem[]> {
  const lists = await Promise.all(
    keywords.map((kw) => searchByKeyword(kw).catch(() => [] as DownloadItem[])),
  );
  return lists.flat();
}
