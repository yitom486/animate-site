import { XMLParser, XMLValidator } from "fast-xml-parser";
import sanitizeHtml from "sanitize-html";
import { decodeHTML } from "entities";
import type { NewsChannel } from "./config";
import { looksLikeMarkdown, renderNewsMarkdown } from "./markdown.server";

export type ParsedArticle = {
  guid: string;
  channel: NewsChannel;
  title: string;
  sourceUrl: string;
  contentHtml: string;
  excerpt: string;
  imageUrl?: string;
  publishedAt: number;
};

function isHttpsUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

/** 资讯正文消毒：镜像社区日志白名单，额外允许 figure / figcaption；图片仅 https。 */
export function sanitizeNewsHtml(html: string) {
  return sanitizeHtml(html, {
    allowedTags: [
      "p",
      "br",
      "div",
      "span",
      "h2",
      "h3",
      "h4",
      "strong",
      "b",
      "em",
      "i",
      "ul",
      "ol",
      "li",
      "blockquote",
      "a",
      "hr",
      "pre",
      "code",
      "img",
      "figure",
      "figcaption",
      "table",
      "thead",
      "tbody",
      "tr",
      "th",
      "td",
      "video",
      "source",
    ],
    allowedAttributes: {
      a: ["href", "title", "target", "rel", "class"],
      img: ["src", "alt", "loading", "decoding", "width", "height", "referrerpolicy"],
      video: ["src", "controls", "preload", "poster", "width", "height"],
      source: ["src", "type"],
      th: ["colspan", "rowspan"],
      td: ["colspan", "rowspan"],
    },
    allowedSchemes: ["https", "http"],
    allowProtocolRelative: false,
    transformTags: {
      a: (_tag, attrs) => {
        const href = attrs.href ?? "";
        const next: Record<string, string> = {
          ...attrs,
          target: "_blank",
          rel: "noopener noreferrer nofollow",
        };
        if (/youtube\.com|youtu\.be|bilibili\.com|b23\.tv/i.test(href)) {
          next.class = [attrs.class, "news-video-link"].filter(Boolean).join(" ");
        }
        return { tagName: "a", attribs: next };
      },
      img: (_tag, attrs) => {
        const src = (attrs.src ?? "").trim();
        if (!isHttpsUrl(src)) return { tagName: "span", attribs: {} };
        const next: Record<string, string> = {
          src,
          loading: "lazy",
          decoding: "async",
          referrerpolicy: "no-referrer",
        };
        if (attrs.alt) next.alt = attrs.alt;
        if (attrs.width) next.width = attrs.width;
        if (attrs.height) next.height = attrs.height;
        return { tagName: "img", attribs: next };
      },
      video: (_tag, attrs) => {
        const src = (attrs.src ?? "").trim();
        if (src && !isHttpsUrl(src)) return { tagName: "span", attribs: {} };
        const next: Record<string, string> = {
          controls: "controls",
          preload: "metadata",
        };
        if (src) next.src = src;
        if (attrs.poster && isHttpsUrl(attrs.poster)) next.poster = attrs.poster;
        if (attrs.width) next.width = attrs.width;
        if (attrs.height) next.height = attrs.height;
        return { tagName: "video", attribs: next };
      },
      source: (_tag, attrs) => {
        const src = (attrs.src ?? "").trim();
        if (!isHttpsUrl(src)) return { tagName: "span", attribs: {} };
        const next: Record<string, string> = { src };
        if (attrs.type) next.type = attrs.type;
        return { tagName: "source", attribs: next };
      },
    },
  }).trim();
}

/** 纯 Markdown 或 HTML：Markdown 先渲染再消毒；HTML 直接消毒。 */
export function prepareNewsContent(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (looksLikeMarkdown(trimmed)) return sanitizeNewsHtml(renderNewsMarkdown(trimmed));
  return sanitizeNewsHtml(trimmed);
}

function text(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record["#text"] === "string") return record["#text"].trim();
    if (typeof record.__cdata === "string") return record.__cdata.trim();
  }
  return "";
}

function attr(value: unknown, name: string): string {
  if (!value || typeof value !== "object") return "";
  const record = value as Record<string, unknown>;
  const prefixed = record[`@_${name}`];
  if (typeof prefixed === "string") return prefixed.trim();
  const bare = record[name];
  return typeof bare === "string" ? bare.trim() : "";
}

function asList(value: unknown): unknown[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function pickHttpsImage(candidate: string | undefined) {
  if (!candidate) return undefined;
  return isHttpsUrl(candidate) ? candidate : undefined;
}

function imageFromEnclosureOrMedia(row: Record<string, unknown>) {
  for (const enclosure of asList(row.enclosure)) {
    const url = attr(enclosure, "url");
    const type = attr(enclosure, "type").toLowerCase();
    if (pickHttpsImage(url) && (!type || type.startsWith("image/"))) return url;
  }
  for (const media of asList(row["media:content"])) {
    const url = attr(media, "url");
    const medium = attr(media, "medium").toLowerCase();
    const type = attr(media, "type").toLowerCase();
    if (
      pickHttpsImage(url) &&
      (medium === "image" || type.startsWith("image/") || (!medium && !type))
    ) {
      return url;
    }
  }
  for (const thumb of asList(row["media:thumbnail"])) {
    const url = attr(thumb, "url");
    if (pickHttpsImage(url)) return url;
  }
  return undefined;
}

export function extractCoverImageUrl(html: string, row?: Record<string, unknown>) {
  const fromFeed = row ? imageFromEnclosureOrMedia(row) : undefined;
  if (fromFeed) return fromFeed;
  const match = html.match(/<img[^>]+src=["'](https:\/\/[^"']+)["']/i);
  return match?.[1];
}

function makeExcerpt(contentHtml: string) {
  return decodeHTML(contentHtml.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 220);
}

/** 资讯单独解析，不改变 Bangumi 社区日志的 RSS 行为。 */
export function parseNewsRss(xml: string, channel: NewsChannel): ParsedArticle[] {
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error("RSS 不允许 DTD 或实体声明");
  if (XMLValidator.validate(xml) !== true) throw new Error("RSS XML 格式错误");
  const document = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    parseTagValue: false,
    trimValues: true,
    cdataPropName: "__cdata",
    isArray: (name) =>
      name === "item" ||
      name === "enclosure" ||
      name === "media:content" ||
      name === "media:thumbnail",
  }).parse(xml);
  const feed = document?.rss?.channel;
  if (!feed || typeof feed !== "object") throw new Error("未找到 RSS 2.0 channel");
  const rows: Record<string, unknown>[] = feed.item ?? [];
  const seen = new Set<string>();
  return rows
    .map((row) => {
      const guid = text(row.guid);
      const title = text(row.title);
      const sourceUrl = text(row.link);
      const publishedAt = Date.parse(text(row.pubDate));
      const rawBody = text(row["content:encoded"]) || text(row.description);
      const contentHtml = prepareNewsContent(rawBody);
      // 不保存残缺结果，也不提交该次 ETag，以便下次重新拉取完整文档。
      if (!guid || !title || !contentHtml || !Number.isFinite(publishedAt))
        throw new Error("RSS 条目缺少 GUID、标题、正文或有效日期");
      let url: URL;
      try {
        url = new URL(sourceUrl);
      } catch {
        throw new Error("RSS 来源链接无效");
      }
      if (!["http:", "https:"].includes(url.protocol)) throw new Error("RSS 来源链接协议无效");
      return {
        guid,
        channel,
        title,
        sourceUrl: url.href,
        contentHtml,
        publishedAt,
        excerpt: makeExcerpt(contentHtml),
        imageUrl: extractCoverImageUrl(contentHtml, row),
      };
    })
    .filter((row) => {
      if (seen.has(row.guid)) return false;
      seen.add(row.guid);
      return true;
    });
}

export async function newsArticleId(guid: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(guid));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
