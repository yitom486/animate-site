import { parseRss2, rssDateToIso, stripHtml } from "~/lib/rss";
import { createCache, withCache } from "~/lib/cache";
import { BGM_USER_AGENT, CACHE_TTL_DETAIL_MS } from "../config.server";
import { CACHE_MAX_ENTRIES } from "../../constants";
import type { BgmBlogItem } from "../../types-blog";
import { BGM_WEB, BGM_WEB_ROUTES_BLOG } from "../../web-urls";
import type { BlogSection } from "../../blog-section";

const blogCache = createCache<BgmBlogItem[]>({
  ttlMs: CACHE_TTL_DETAIL_MS,
  maxEntries: CACHE_MAX_ENTRIES.blog,
});

const FETCH_TIMEOUT_MS = 10_000;

function headersFor(section: BlogSection | "subject") {
  const referer = section === "subject" ? `${BGM_WEB}/` : `${BGM_WEB}/${section}/blog`;
  return {
    "User-Agent": BGM_USER_AGENT,
    Accept: "application/rss+xml, application/xml, text/xml, */*",
    Referer: referer,
  } as const;
}

async function fetchRssXml(url: string, section: BlogSection | "subject"): Promise<string> {
  const res = await fetch(url, {
    headers: headersFor(section),
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

export function blogSectionRssUrl(section: BlogSection): string {
  return `${BGM_WEB}/feed/blog/${section}`;
}

/** 板块最新日志 RSS（短窗口；列表无限滚动请用 HTML） */
export async function fetchBlogSectionRss(section: BlogSection, limit = 8): Promise<BgmBlogItem[]> {
  try {
    const all = await withCache(blogCache, `bgm:blog:rss:${section}`, async () => {
      const xml = await fetchRssXml(blogSectionRssUrl(section), section);
      return toBlogItems(xml, 40, section);
    });
    return all.slice(0, limit);
  } catch {
    return [];
  }
}

/** @deprecated 使用 fetchBlogSectionRss("anime", limit) */
export async function fetchBgmAnimeBlog(limit = 8): Promise<BgmBlogItem[]> {
  return fetchBlogSectionRss("anime", limit);
}

/** 单条目下的用户日志（无帖子时 RSS 可能为空） */
export async function fetchBgmSubjectBlog(subjectId: string, limit = 6): Promise<BgmBlogItem[]> {
  try {
    return await withCache(blogCache, `bgm:blog:subject:${subjectId}`, async () => {
      const xml = await fetchRssXml(BGM_WEB_ROUTES_BLOG.subjectBlogRss(subjectId), "subject");
      return toBlogItems(xml, limit, subjectId);
    });
  } catch {
    return [];
  }
}
