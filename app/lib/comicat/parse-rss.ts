import { parseRss2, rssDateToIso } from "~/lib/news/parse-rss";
import type { ComicatItem } from "./types";

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function extractEnclosure(block: string): string | undefined {
  const m = block.match(/<enclosure\s+[^>]*url="([^"]+)"/i);
  if (!m?.[1]) return undefined;
  return decodeEntities(m[1]);
}

function extractTag(block: string, tag: string): string | undefined {
  const re = new RegExp(
    `<${tag}[^>]*>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([^<]*))<\\/${tag}>`,
    "i",
  );
  const m = block.match(re);
  const raw = (m?.[1] ?? m?.[2] ?? "").trim();
  return raw || undefined;
}

function parseResolution(title: string, description?: string): string | undefined {
  const fromTitle = title.match(/\b(\d{3,4}[pP])\b/)?.[1];
  if (fromTitle) return fromTitle.toUpperCase();

  const fromDesc = description?.match(/Resolution:\s*(\S+)/i)?.[1];
  return fromDesc?.toUpperCase();
}

/** 解析漫猫官方 RSS（含发布组、分类、种子外链） */
export function parseComicatRss(xml: string): ComicatItem[] {
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];

  return blocks
    .map((block): ComicatItem | null => {
      const title = extractTag(block, "title");
      const link = extractTag(block, "link");
      if (!title || !link) return null;

      const description = extractTag(block, "description");
      const pubDate = extractTag(block, "pubDate");

      return {
        id: link,
        title: decodeEntities(title),
        link,
        author: extractTag(block, "author"),
        category: extractTag(block, "category"),
        resolution: parseResolution(title, description),
        torrentUrl: extractEnclosure(block),
        publishedAt: rssDateToIso(pubDate),
      };
    })
    .filter((x): x is ComicatItem => x !== null);
}

/** 复用通用 RSS 解析做冒烟校验（测试 / 降级） */
export function parseComicatRssFallback(xml: string): ComicatItem[] {
  return parseRss2(xml).map((row) => ({
    id: row.link,
    title: row.title,
    link: row.link,
    publishedAt: rssDateToIso(row.pubDate),
  }));
}
