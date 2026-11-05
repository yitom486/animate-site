import { XMLParser, XMLValidator } from "fast-xml-parser";
import sanitizeHtml from "sanitize-html";
import { decodeHTML } from "entities";
import type { NewsChannel } from "./config";

export type ParsedArticle = {
  guid: string;
  channel: NewsChannel;
  title: string;
  sourceUrl: string;
  contentHtml: string;
  excerpt: string;
  publishedAt: number;
};

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
    ],
    allowedAttributes: { a: ["href", "title", "target", "rel"] },
    allowedSchemes: ["https", "http"],
    allowProtocolRelative: false,
    transformTags: {
      a: (_tag, attrs) => ({
        tagName: "a",
        attribs: { ...attrs, target: "_blank", rel: "noopener noreferrer nofollow" },
      }),
    },
  }).trim();
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** 资讯单独解析，不改变 Bangumi 社区日志的 RSS 行为。 */
export function parseNewsRss(xml: string, channel: NewsChannel): ParsedArticle[] {
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error("RSS 不允许 DTD 或实体声明");
  if (XMLValidator.validate(xml) !== true) throw new Error("RSS XML 格式错误");
  const document = new XMLParser({
    ignoreAttributes: true,
    parseTagValue: false,
    trimValues: true,
    isArray: (name) => name === "item",
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
      const contentHtml = sanitizeNewsHtml(text(row["content:encoded"]) || text(row.description));
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
        excerpt: decodeHTML(contentHtml.replace(/<[^>]+>/g, " "))
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 180),
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
