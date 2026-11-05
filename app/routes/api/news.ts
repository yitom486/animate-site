import { data } from "react-router";
import type { Route } from "./+types/news";
import { HTTP_CACHE, publicCacheHeaders, type CacheStatus } from "~/lib/cache";
import { fetchNewsFeed } from "~/lib/news";

/** 同源资讯 API：RSSHub（中文）+ AniNews（英文） */
export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const limit = Math.min(40, Math.max(1, Number(url.searchParams.get("limit")) || 20));
  let cacheStatus: CacheStatus = "MISS";
  const payload = await fetchNewsFeed(limit, (status) => {
    cacheStatus = status;
  });
  return data(payload, { headers: publicCacheHeaders(HTTP_CACHE.news, cacheStatus) });
}
