import { ANINEWS_API, FETCH_TIMEOUT_MS } from "./constants";
import type { NewsItem } from "./types";

type AniNewsRow = {
  title: string;
  slug: string;
  source: string;
  excerpt?: string;
  date?: string;
  image?: string;
  link: string;
};

type AniNewsResponse = {
  success?: boolean;
  data?: AniNewsRow[];
};

/** AniNewsAPI — 国际动漫媒体头条 */
export async function fetchAniNews(limit = 10): Promise<NewsItem[]> {
  const url = `${ANINEWS_API}?limit=${limit}`;
  const res = await fetch(url, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error(`AniNews HTTP ${res.status}`);
  }

  const json = (await res.json()) as AniNewsResponse;
  const rows = json.data ?? [];

  return rows.map((row) => ({
    id: `aninews:${row.slug}`,
    title: row.title,
    link: row.link,
    excerpt: row.excerpt,
    publishedAt: row.date,
    source: row.source,
    locale: "en",
    image: row.image,
  }));
}
