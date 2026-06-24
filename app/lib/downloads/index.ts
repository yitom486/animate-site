import { fetchComicatDownloads } from "./comicat";
import { fetchDmhyDownloads } from "./dmhy";
import type { DownloadItem, GroupedDownloads } from "./types";

export type { DownloadItem, GroupedDownloads, DownloadSource } from "./types";

/** 单部番最多用几个关键词查（控制上游请求数） */
const MAX_KEYWORDS = 4;
/** 每组最多展示多少条（双源交错，按来源筛选后仍有足够条数） */
const GROUP_LIMIT = 24;

/** 交错合并两个数组，让两源在前列都有代表 */
function interleave<T>(a: T[], b: T[]): T[] {
  const out: T[] = [];
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) {
    if (i < a.length) out.push(a[i]);
    if (i < b.length) out.push(b[i]);
  }
  return out;
}

/**
 * 漫猫 + 動漫花園 双源搜索，按 info-hash 跨源去重，按「合集 / 单集」分组。
 * 漫猫优先（带文件大小、整季典藏版更全），dmhy 补充。
 */
export async function fetchDownloads(
  keywords: string[],
): Promise<GroupedDownloads> {
  const terms = [
    ...new Set(keywords.map((k) => k.trim()).filter((k) => k.length >= 2)),
  ].slice(0, MAX_KEYWORDS);
  if (!terms.length) return { batch: [], single: [], total: 0 };

  const [comicat, dmhy] = await Promise.all([
    fetchComicatDownloads(terms),
    fetchDmhyDownloads(terms),
  ]);

  // 交错合并；同 hash 保留首个(漫猫优先、含大小)，并合并来源标记
  const map = new Map<string, DownloadItem>();
  for (const item of interleave(comicat, dmhy)) {
    const ex = map.get(item.hash);
    if (!ex) {
      map.set(item.hash, { ...item, sources: [...item.sources] });
      continue;
    }
    for (const s of item.sources) {
      if (!ex.sources.includes(s)) ex.sources.push(s);
    }
    if (!ex.size && item.size) ex.size = item.size;
  }
  const all = [...map.values()];

  return {
    batch: all.filter((i) => i.isBatch).slice(0, GROUP_LIMIT),
    single: all.filter((i) => !i.isBatch).slice(0, GROUP_LIMIT),
    total: all.length,
  };
}
