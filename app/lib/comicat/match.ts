import type { ComicatItem } from "./types";

function normalizeKeyword(text: string): string {
  return text.trim().replace(/\s+/g, "").toLowerCase();
}

/** 去掉字幕组、清晰度等方括号，便于标题匹配 */
function normalizeTitle(text: string): string {
  return text
    .replace(/\[[^\]]*\]/g, "")
    .replace(/[【】()（）·:：\-_/\\|]/g, "")
    .replace(/\s+/g, "")
    .toLowerCase();
}

function publishedTime(item: ComicatItem): number {
  if (!item.publishedAt) return 0;
  const t = Date.parse(item.publishedAt);
  return Number.isNaN(t) ? 0 : t;
}

/**
 * 用番剧中文/日文名在 RSS 标题里模糊匹配。
 * 无官方 id 映射，可能漏匹配或误匹配，仅作「可能相关」展示。
 */
export function matchComicatItems(
  items: ComicatItem[],
  keywords: string[],
  limit = 8,
): ComicatItem[] {
  const terms = [...new Set(keywords.map(normalizeKeyword).filter((t) => t.length >= 2))].sort(
    (a, b) => b.length - a.length,
  );

  if (!terms.length) return [];

  const scored = items
    .map((item) => {
      const hay = normalizeTitle(item.title);
      let score = 0;
      for (const term of terms) {
        if (hay.includes(term)) {
          score = Math.max(score, term.length);
        }
      }
      return { item, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return publishedTime(b.item) - publishedTime(a.item);
    });

  const seen = new Set<string>();
  const out: ComicatItem[] = [];
  for (const { item } of scored) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
    if (out.length >= limit) break;
  }
  return out;
}

/** 详情页只展示动画类资源 */
export function filterAnimationItems(items: ComicatItem[]): ComicatItem[] {
  return items.filter((item) => !item.category || item.category === "动画");
}
