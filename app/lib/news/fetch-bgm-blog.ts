import { fetchBlogSectionRss } from "~/lib/bangumi/server/blog/rss.server";
import type { BgmBlogItem } from "~/lib/bangumi/types-blog";
import type { NewsItem, NewsSourceStatus } from "./types";

const SOURCE_ID = "bgm-anime-blog";
const SOURCE_LABEL = "Bangumi 动画日志";

function toNewsItem(row: BgmBlogItem): NewsItem {
  return {
    id: row.id,
    title: row.title,
    link: row.link,
    excerpt: row.excerpt,
    publishedAt: row.publishedAt,
    source: SOURCE_LABEL,
    locale: "zh",
  };
}

/** Bangumi 全站动画日志 RSS → 资讯条目 */
export async function fetchBgmBlogNews(): Promise<{
  items: NewsItem[];
  sources: NewsSourceStatus[];
}> {
  try {
    const rows = await fetchBlogSectionRss("anime", 12);
    const items = rows.map(toNewsItem);

    return {
      items,
      sources: [{ id: SOURCE_ID, label: SOURCE_LABEL, ok: true, count: items.length }],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "未知错误";
    return {
      items: [],
      sources: [{ id: SOURCE_ID, label: SOURCE_LABEL, ok: false, count: 0, error: message }],
    };
  }
}
