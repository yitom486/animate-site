import { FETCH_TIMEOUT_MS } from "./constants";
import {
  parseRss2,
  rssDateToIso,
  stripHtml,
} from "./parse-rss";
import type { NewsItem } from "./types";

const UA =
  "yhang/anime-site (https://github.com/yitom486/animate-site)";

type GoogleLocale = "cn" | "tw";

/** 按地区拼 Google News 搜索 RSS 链接（query 用 OR 扩大召回） */
function gnewsUrl(query: string, locale: GoogleLocale): string {
  const region =
    locale === "tw"
      ? { hl: "zh-TW", gl: "TW", ceid: "TW:zh-Hant" }
      : { hl: "zh-CN", gl: "CN", ceid: "CN:zh-Hans" };
  const params = new URLSearchParams({
    q: query,
    hl: region.hl,
    gl: region.gl,
    ceid: region.ceid,
  });
  return `https://news.google.com/rss/search?${params.toString()}`;
}

/** Google News 中文 RSS（不依赖 RSSHub，个人非商用；多关键词 OR 召回） */
const GOOGLE_NEWS_FEEDS = [
  {
    id: "gnews-anime-cn",
    label: "Google 动漫",
    url: gnewsUrl("动画 OR 新番 OR 动画化 OR 声优 OR 剧场版", "cn"),
  },
  {
    id: "gnews-manga-cn",
    label: "Google 漫画",
    url: gnewsUrl("漫画 连载 OR 漫画 改编 OR 轻小说 动画", "cn"),
  },
  {
    id: "gnews-event-cn",
    label: "Google 漫展",
    url: gnewsUrl("漫展 OR 同人展 OR COMICUP OR 萤火虫动漫 OR Bilibili World", "cn"),
  },
  {
    id: "gnews-anime-tw",
    label: "Google 動漫(台)",
    url: gnewsUrl("動畫 OR 新番 OR 劇場版 OR 漫畫", "tw"),
  },
] as const;

async function fetchGoogleFeed(
  feed: (typeof GOOGLE_NEWS_FEEDS)[number],
): Promise<NewsItem[]> {
  const res = await fetch(feed.url, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: { "User-Agent": UA, Accept: "application/rss+xml, application/xml" },
  });

  if (!res.ok) {
    throw new Error(`Google News HTTP ${res.status}`);
  }

  const xml = await res.text();
  const rows = parseRss2(xml);

  return rows.map((row, i) => ({
    id: `${feed.id}:${i}:${row.link}`,
    title: row.title,
    link: row.link,
    excerpt: stripHtml(row.description),
    publishedAt: rssDateToIso(row.pubDate),
    source: feed.label,
    locale: "zh" as const,
  }));
}

export async function fetchGoogleNewsZh(): Promise<{
  items: NewsItem[];
  sources: Array<{
    id: string;
    label: string;
    ok: boolean;
    count: number;
    error?: string;
  }>;
}> {
  const results = await Promise.all(
    GOOGLE_NEWS_FEEDS.map(async (feed) => {
      try {
        const items = await fetchGoogleFeed(feed);
        return {
          status: { id: feed.id, label: feed.label, ok: true, count: items.length },
          items,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : "未知错误";
        return {
          status: {
            id: feed.id,
            label: feed.label,
            ok: false,
            count: 0,
            error: message,
          },
          items: [] as NewsItem[],
        };
      }
    }),
  );

  return {
    items: results.flatMap((r) => r.items),
    sources: results.map((r) => r.status),
  };
}
