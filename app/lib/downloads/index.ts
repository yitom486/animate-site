import { fetchComicatDownloads } from "./comicat";
import { fetchDmhyDownloads } from "./dmhy";
import type { DownloadItem, GroupedDownloads } from "./types";

export type { DownloadItem, GroupedDownloads, DownloadSource } from "./types";

/** 单部番最多用几个关键词查（控制上游请求数） */
const MAX_KEYWORDS = 4;
/** 每组最多展示多少条 */
const GROUP_LIMIT = 15;

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

  // 漫猫在前 → 同 hash 优先保留漫猫条目（有大小信息）
  const map = new Map<string, DownloadItem>();
  for (const item of [...comicat, ...dmhy]) {
    if (!map.has(item.hash)) map.set(item.hash, item);
  }
  const all = [...map.values()];

  return {
    batch: all.filter((i) => i.isBatch).slice(0, GROUP_LIMIT),
    single: all.filter((i) => !i.isBatch).slice(0, GROUP_LIMIT),
    total: all.length,
  };
}
