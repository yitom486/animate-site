export type RssRow = {
  title: string;
  link: string;
  pubDate?: string;
  description?: string;
};

function extractTag(block: string, tag: string): string | undefined {
  const re = new RegExp(
    `<${tag}[^>]*>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([^<]*))<\\/${tag}>`,
    "i",
  );
  const m = block.match(re);
  const raw = (m?.[1] ?? m?.[2] ?? "").trim();
  return raw || undefined;
}

/** 轻量 RSS 2.0 解析（足够处理 Google News / 站点原生 RSS） */
export function parseRss2(xml: string): RssRow[] {
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];

  return blocks
    .map((block): RssRow | null => {
      const title = extractTag(block, "title");
      const link = extractTag(block, "link");
      if (!title || !link) return null;
      return {
        title: decodeEntities(title),
        link,
        pubDate: extractTag(block, "pubDate"),
        description: extractTag(block, "description"),
      };
    })
    .filter((x): x is RssRow => x !== null);
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export function stripHtml(html?: string): string | undefined {
  if (!html) return undefined;
  const decoded = decodeEntities(html);
  const text = decoded
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  // Google News description 常只剩跳转链接，不展示
  if (!text || /^https?:\/\//i.test(text) || /news\.google\.com/i.test(text)) {
    return undefined;
  }
  return text.slice(0, 200);
}

export function rssDateToIso(pubDate?: string): string | undefined {
  if (!pubDate) return undefined;
  const t = Date.parse(pubDate);
  return Number.isNaN(t) ? undefined : new Date(t).toISOString();
}
