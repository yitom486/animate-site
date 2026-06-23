import { parseRss2, rssDateToIso, stripHtml } from "~/lib/news/parse-rss";
import { createCache, withCache } from "./cache";
import { BGM_USER_AGENT, CACHE_TTL_DETAIL_MS } from "./constants";

const BGM_WEB = "https://bgm.tv";

/** 全站动画日志 RSS（页面 head autodiscovery 给的正确路径；旧 /blog/rss/2 已返回空） */
export const BGM_ANIME_BLOG_RSS = `${BGM_WEB}/feed/blog/anime`;

export const BGM_WEB_ROUTES_BLOG = {
  animeBlog: () => `${BGM_WEB}/anime/blog`,
  subjectBlog: (id: string | number) => `${BGM_WEB}/subject/${id}/blog`,
  subjectBlogRss: (id: string | number) => `${BGM_WEB}/subject/${id}/blog/rss`,
} as const;

export type BgmBlogItem = {
  id: string;
  title: string;
  link: string;
  excerpt?: string;
  publishedAt?: string;
  /** 以下字段仅 HTML 列表抓取（/anime/blog）填充，RSS 源没有 */
  author?: string;
  authorUrl?: string;
  avatar?: string;
  replies?: number;
};

const blogCache = createCache<BgmBlogItem[]>(CACHE_TTL_DETAIL_MS);

const BGM_RSS_HEADERS = {
  "User-Agent": BGM_USER_AGENT,
  Accept: "application/rss+xml, application/xml, text/xml, */*",
  Referer: `${BGM_WEB}/anime/blog`,
} as const;

const FETCH_TIMEOUT_MS = 10_000;

async function fetchRssXml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: BGM_RSS_HEADERS,
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!res.ok) {
    throw new Error(`Bangumi RSS HTTP ${res.status}`);
  }

  const xml = await res.text();
  if (!xml.includes("<item")) {
    throw new Error("Bangumi RSS 无有效条目");
  }

  return xml;
}

function absolutizeLink(link: string): string {
  if (link.startsWith("http")) return link;
  return `${BGM_WEB}${link.startsWith("/") ? "" : "/"}${link}`;
}

function toBlogItems(xml: string, limit: number, prefix: string): BgmBlogItem[] {
  return parseRss2(xml)
    .slice(0, limit)
    .map((row, i) => ({
      id: `${prefix}:${row.link || i}`,
      title: row.title,
      link: absolutizeLink(row.link),
      excerpt: stripHtml(row.description),
      publishedAt: rssDateToIso(row.pubDate),
    }));
}

/** 全站动画板块社区日志 */
export async function fetchBgmAnimeBlog(limit = 8): Promise<BgmBlogItem[]> {
  try {
    const all = await withCache(blogCache, "bgm:blog:anime", async () => {
      const xml = await fetchRssXml(BGM_ANIME_BLOG_RSS);
      return toBlogItems(xml, 40, "anime");
    });
    return all.slice(0, limit);
  } catch {
    return [];
  }
}

/** 单条目下的用户日志（无帖子时 RSS 可能为空） */
export async function fetchBgmSubjectBlog(
  subjectId: string,
  limit = 6,
): Promise<BgmBlogItem[]> {
  try {
    return await withCache(blogCache, `bgm:blog:subject:${subjectId}`, async () => {
      const xml = await fetchRssXml(BGM_WEB_ROUTES_BLOG.subjectBlogRss(subjectId));
      return toBlogItems(xml, limit, subjectId);
    });
  } catch {
    return [];
  }
}
