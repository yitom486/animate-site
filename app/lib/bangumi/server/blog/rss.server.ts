import { parseRss2, rssDateToIso, stripHtml } from "~/lib/rss";
import { createCache, withCache } from "~/lib/cache";
import { BGM_USER_AGENT, CACHE_TTL_DETAIL_MS } from "../config.server";
import { CACHE_MAX_ENTRIES } from "../../constants";
import type { BgmBlogItem } from "../../types-blog";
import { BGM_WEB, BGM_WEB_ROUTES_BLOG } from "../../web-urls";

/** 全站动画日志 RSS（页面 head autodiscovery 给的正确路径；旧 /blog/rss/2 已返回空） */
export const BGM_ANIME_BLOG_RSS = `${BGM_WEB}/feed/blog/anime`;

const blogCache = createCache<BgmBlogItem[]>({
  ttlMs: CACHE_TTL_DETAIL_MS,
  maxEntries: CACHE_MAX_ENTRIES.blog,
});

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
export async function fetchBgmSubjectBlog(subjectId: string, limit = 6): Promise<BgmBlogItem[]> {
  try {
    return await withCache(blogCache, `bgm:blog:subject:${subjectId}`, async () => {
      const xml = await fetchRssXml(BGM_WEB_ROUTES_BLOG.subjectBlogRss(subjectId));
      return toBlogItems(xml, limit, subjectId);
    });
  } catch {
    return [];
  }
}
