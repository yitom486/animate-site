import { FETCH_TIMEOUT_MS } from "./constants";
import { parseRss2, rssDateToIso, stripHtml } from "./parse-rss";
import type { NewsItem, NewsSourceStatus } from "./types";

const UA =
  "yhang/anime-site (https://github.com/yitom486/animate-site)";

/** 巴哈 GNN 主 feed 游戏占多数，用 ACG 关键词只留动漫/漫画相关 */
const ACG_KEYWORDS =
  /動畫|动画|動漫|动漫|漫畫|漫画|聲優|声优|新番|劇場版|剧场版|TV動畫|OVA|OAD|アニメ|動畫化|动画化|第\s*[一二三四五六七八九十\d]+\s*季/;

/** 巴哈姆特 GNN 新闻（台湾繁中，RSS 2.0；过滤掉纯游戏条目） */
const BAHAMUT_FEED = {
  id: "bahamut-gnn",
  label: "巴哈 GNN",
  url: "https://gnn.gamer.com.tw/rss.xml",
} as const;

export async function fetchBahamutNews(): Promise<{
  items: NewsItem[];
  sources: NewsSourceStatus[];
}> {
  try {
    const res = await fetch(BAHAMUT_FEED.url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { "User-Agent": UA, Accept: "application/rss+xml, application/xml" },
    });

    if (!res.ok) {
      throw new Error(`巴哈 GNN HTTP ${res.status}`);
    }

    const xml = await res.text();
    const items = parseRss2(xml)
      .filter((row) => ACG_KEYWORDS.test(row.title))
      .map((row, i) => ({
        id: `${BAHAMUT_FEED.id}:${i}:${row.link}`,
        title: row.title,
        link: row.link,
        excerpt: stripHtml(row.description),
        publishedAt: rssDateToIso(row.pubDate),
        source: BAHAMUT_FEED.label,
        locale: "zh" as const,
      }));

    return {
      items,
      sources: [
        { id: BAHAMUT_FEED.id, label: BAHAMUT_FEED.label, ok: true, count: items.length },
      ],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "未知错误";
    return {
      items: [],
      sources: [
        { id: BAHAMUT_FEED.id, label: BAHAMUT_FEED.label, ok: false, count: 0, error: message },
      ],
    };
  }
}
