import sanitizeHtml from "sanitize-html";
import { createCache, withCache } from "~/lib/cache";
import { BGM_USER_AGENT, CACHE_TTL_DETAIL_MS } from "../config.server";
import { CACHE_MAX_ENTRIES } from "../../constants";
import type { BgmBlogDetail } from "../../types-blog";
import { BGM_WEB } from "../../web-urls";
const FETCH_TIMEOUT_MS = 10_000;

const HEADERS = {
  "User-Agent": BGM_USER_AGENT,
  Accept: "text/html,application/xhtml+xml,*/*",
  Referer: `${BGM_WEB}/anime/blog`,
} as const;

const detailCache = createCache<BgmBlogDetail>({
  ttlMs: CACHE_TTL_DETAIL_MS,
  maxEntries: CACHE_MAX_ENTRIES.blog,
});

/** 正文是第三方用户 HTML：白名单消毒，去脚本/事件/危险协议，规范图片与外链 */
const SANITIZE_OPTS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p",
    "br",
    "span",
    "strong",
    "b",
    "em",
    "i",
    "u",
    "s",
    "del",
    "sub",
    "sup",
    "blockquote",
    "pre",
    "code",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "ul",
    "ol",
    "li",
    "hr",
    "img",
    "a",
    "div",
    "table",
    "thead",
    "tbody",
    "tr",
    "td",
    "th",
  ],
  allowedAttributes: {
    a: ["href", "title", "target", "rel"],
    img: ["src", "alt", "width", "height", "loading", "referrerpolicy"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  transformTags: {
    a: (tagName, attribs) => ({
      tagName,
      attribs: { ...attribs, target: "_blank", rel: "noreferrer nofollow" },
    }),
    img: (tagName, attribs) => {
      let src = attribs.src ?? "";
      if (src.startsWith("//")) src = `https:${src}`;
      return {
        tagName,
        attribs: { ...attribs, src, loading: "lazy", referrerpolicy: "no-referrer" },
      };
    },
  },
};

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

/** "2026-6-23 20:22"（CST / UTC+8）→ ISO */
function bgmTimeToIso(raw: string): string | undefined {
  const m = raw.match(/(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{2})/);
  if (!m) return undefined;
  const [, y, mo, d, h, mi] = m;
  const ms = Date.UTC(+y, +mo - 1, +d, +h - 8, +mi);
  return Number.isNaN(ms) ? undefined : new Date(ms).toISOString();
}

function extractContent(html: string): string {
  const start = html.indexOf('<div id="entry_content"');
  if (start < 0) return "";
  const open = html.indexOf(">", start);
  if (open < 0) return "";

  let end = html.indexOf('<div class="entry-actions"', open);
  if (end < 0) end = html.indexOf('<div id="comment', open);
  if (end < 0) end = html.length;

  // entry_content 自身的闭合 </div> 会落在末尾，去掉后交给消毒器补全
  const raw = html.slice(open + 1, end).replace(/<\/div>\s*$/, "");
  return sanitizeHtml(raw, SANITIZE_OPTS).trim();
}

/** 抓单篇日志正文（HTML 爬取 + 消毒；Bangumi 无日志 API/单篇 RSS） */
export async function fetchBgmBlogDetail(id: string | number): Promise<BgmBlogDetail> {
  const numId = String(id).replace(/\D/g, "");
  const link = `${BGM_WEB}/blog/${numId}`;

  return withCache(detailCache, `bgm:blog:detail:${numId}`, async () => {
    const fallback: BgmBlogDetail = { id: numId, title: "动画日志", link, contentHtml: "" };

    try {
      const res = await fetch(link, {
        headers: HEADERS,
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (!res.ok) return fallback;

      const html = await res.text();

      const titleM = html.match(/<div class="header">[\s\S]*?<h1 class="title">([\s\S]*?)<\/h1>/);
      const title =
        (titleM && stripTags(titleM[1])) ||
        stripTags(html.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "") ||
        "动画日志";

      const card = html.match(/<div class="author user-card">([\s\S]*?)<div class="header">/);
      const cardHtml = card?.[1] ?? "";
      const avatarM = cardHtml.match(/<img[^>]+src="([^"]+)"/);
      const authorM = cardHtml.match(
        /<div class="title">\s*<p>\s*<a href="(\/user\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/,
      );
      const timeM = html.match(
        /<div class="time">\s*([\d]{4}-[\d]{1,2}-[\d]{1,2}\s+[\d]{1,2}:[\d]{2})/,
      );

      return {
        id: numId,
        title,
        link,
        contentHtml: extractContent(html),
        author: authorM ? stripTags(authorM[2]) : undefined,
        authorUrl: authorM ? absolutize(authorM[1]) : undefined,
        avatar: avatarM ? absolutize(avatarM[1]) : undefined,
        publishedAt: timeM ? bgmTimeToIso(timeM[1]) : undefined,
      };
    } catch {
      return fallback;
    }
  });
}
