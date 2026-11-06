import { queryOptions } from "@tanstack/react-query";
import { CACHE_TTL_DETAIL_MS, CACHE_TTL_LIST_MS } from "../bangumi/constants";
import { fetchQueryJson, getBrowserQueryClient } from "../query-client";
import type { NewsArticle, NewsFeed } from "./types";
import type { NewsChannel } from "./config";

export type NewsArticleView = NewsArticle & { contentHtml: string };

export function homeNewsQuery() {
  return queryOptions({
    queryKey: ["news", "home"] as const,
    queryFn: ({ signal }) => fetchQueryJson<NewsFeed>("/api/news?view=home", signal),
    staleTime: CACHE_TTL_LIST_MS,
  });
}

export function newsListQuery(channel: NewsChannel | undefined, page: number) {
  const channelKey = channel ?? "all";
  const params = new URLSearchParams({ page: String(page), limit: "20" });
  if (channel) params.set("channel", channel);
  return queryOptions({
    queryKey: ["news", "list", channelKey, page] as const,
    queryFn: ({ signal }) => fetchQueryJson<NewsFeed>(`/api/news?${params}`, signal),
    staleTime: CACHE_TTL_LIST_MS,
  });
}

export function newsDetailQuery(id: string) {
  return queryOptions<NewsArticleView>({
    queryKey: ["news", "detail", id] as const,
    queryFn: async () => {
      throw new Error("news detail is seeded by the route loader; no public detail API");
    },
    staleTime: CACHE_TTL_DETAIL_MS,
    enabled: false,
  });
}

/** 把路由 loader 结果写入 QueryClient，回退 / 首页资讯面板可直接命中。 */
export function seedNewsListQuery(channel: NewsChannel | undefined, page: number, feed: NewsFeed) {
  const client = getBrowserQueryClient();
  if (!client) return;
  client.setQueryData(newsListQuery(channel, page).queryKey, feed);
}

export function seedNewsDetailQuery(article: NewsArticleView) {
  const client = getBrowserQueryClient();
  if (!client) return;
  client.setQueryData<NewsArticleView>(newsDetailQuery(article.id).queryKey, article);
}
