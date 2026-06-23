export type NewsLocale = "zh" | "en";

export type NewsItem = {
  id: string;
  title: string;
  link: string;
  excerpt?: string;
  publishedAt?: string;
  source: string;
  locale: NewsLocale;
  image?: string;
};

export type NewsSourceStatus = {
  id: string;
  label: string;
  ok: boolean;
  count: number;
  error?: string;
};

export type NewsFeed = {
  items: NewsItem[];
  fetchedAt: string;
  sources: NewsSourceStatus[];
};
