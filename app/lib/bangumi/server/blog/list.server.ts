import { createCache, withCache } from "~/lib/cache";
import { BGM_USER_AGENT, CACHE_TTL_DETAIL_MS } from "../config.server";
import { CACHE_MAX_ENTRIES } from "../../constants";
import type { BgmBlogItem, BgmBlogPage } from "../../types-blog";
import { BGM_WEB } from "../../web-urls";
import type { BlogSection } from "../../blog-section";

const FETCH_TIMEOUT_MS = 10_000;

/** 全站板块日志列表页每页约 24 条；满页即判定还有下一页 */
const PAGE_SIZE = 24;

const pageCache = createCache<BgmBlogPage>({
  ttlMs: CACHE_TTL_DETAIL_MS,
  maxEntries: CACHE_MAX_ENTRIES.blog,
});

function headersFor(section: BlogSection) {
  return {
    "User-Agent": BGM_USER_AGENT,
    Accept: "text/html,application/xhtml+xml,*/*",
    Referer: `${BGM_WEB}/${section}/blog`,
  } as const;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function stripTags(s: string): string {
  return decodeEntities(s.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function absolutize(url: string): string {
  if (url.startsWith("//")) return `https:${url}`;
  if (url.startsWith("/")) return `${BGM_WEB}${url}`;
  return url;
}

/** Bangumi 时间 "2026-6-23 21:53"（CST / UTC+8）→ ISO */
function bgmTimeToIso(raw: string): string | undefined {
  const m = raw.match(/(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{2})/);
  if (!m) return undefined;
  const [, y, mo, d, h, mi] = m;
  const ms = Date.UTC(+y, +mo - 1, +d, +h - 8, +mi);
  return Number.isNaN(ms) ? undefined : new Date(ms).toISOString();
}

/** 解析 `/{section}/blog` 列表页 HTML（每个日志是一个 .item.clearit 块） */
function parseBlogList(html: string, section: BlogSection): BgmBlogItem[] {
  const blocks = html.split('<div class="item clearit"').slice(1);
  const items: BgmBlogItem[] = [];

  for (const block of blocks) {
    const idM = block.match(/\/blog\/(\d+)/);
    if (!idM) continue;
    const id = idM[1];

    const titleM = block.match(/<h2 class="title">\s*<a[^>]*>([\s\S]*?)<\/a>/);
    const title = titleM ? stripTags(titleM[1]) : "";
    if (!title) continue;

    const contentM = block.match(/<div class="content">\s*<a[^>]*>([\s\S]*?)<\/a>/);
    const excerpt = contentM
      ? stripTags(contentM[1])
          .replace(/\[https?:\/\/[^\]]+\]/g, "")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 140) || undefined
      : undefined;

    const avatarM = block.match(/<img[^>]+src="([^"]+)"[^>]*class="avatarCover"/);
    const avatar = avatarM ? absolutize(avatarM[1]) : undefined;

    const timeM = block.match(/<div class="time">([\s\S]*?)<\/div>/);
    const timeBlock = timeM ? timeM[1] : "";
    const authorM = timeBlock.match(/<a href="(\/user\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/);
    const timeText = stripTags(timeBlock);
    const repliesM = timeText.match(/(\d+)\s*回复/);

    items.push({
      id: `${section}:${id}`,
      title,
      link: `${BGM_WEB}/blog/${id}`,
      excerpt,
      publishedAt: bgmTimeToIso(timeText),
      author: authorM ? stripTags(authorM[2]) : undefined,
      authorUrl: authorM ? absolutize(authorM[1]) : undefined,
      avatar,
      replies: repliesM ? Number(repliesM[1]) : undefined,
    });
  }

  return items;
}

/** 板块日志分页（HTML；RSS 窗口太短，无限滚动必须用网页） */
export async function fetchBlogListPage(section: BlogSection, page = 1): Promise<BgmBlogPage> {
  const safePage = Math.max(1, Math.floor(Number(page) || 1));

  return withCache(pageCache, `bgm:blog:html:${section}:${safePage}`, async () => {
    const res = await fetch(`${BGM_WEB}/${section}/blog?page=${safePage}`, {
      headers: headersFor(section),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!res.ok) {
      throw new Error(`Bangumi blog HTTP ${res.status}`);
    }

    const html = await res.text();
    const items = parseBlogList(html, section);

    return { items, page: safePage, hasMore: items.length >= PAGE_SIZE };
  });
}

/** @deprecated 使用 fetchBlogListPage("anime", page) */
export async function fetchBgmAnimeBlogPage(page = 1): Promise<BgmBlogPage> {
  return fetchBlogListPage("anime", page);
}
