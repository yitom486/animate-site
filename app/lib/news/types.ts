import type { NewsChannel } from "./config";

export type NewsLocale = "zh" | "en";

export type NewsItem = {
  id: string;
  channel: NewsChannel;
  title: string;
  link: string;
  excerpt?: string;
  publishedAt?: string;
  source: string;
  locale: NewsLocale;
  /** 封面图 HTTPS URL；旧数据或无图条目可为 undefined */
  image?: string;
};

export type NewsSourceStatus = {
  id: string;
  label: string;
  ok: boolean;
  count: number;
  error?: string;
  lastSuccessAt?: string;
};

export type NewsFeed = {
  items: NewsItem[];
  fetchedAt: string;
  sources: NewsSourceStatus[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
};

export type NewsArticle = NewsItem & { guid: string; contentHtml: string };
