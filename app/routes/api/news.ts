import { data } from "react-router";
import type { Route } from "./+types/news";
import { HTTP_CACHE, publicCacheHeaders } from "~/lib/cache";
import { parseNewsChannel } from "~/lib/news/config";
import { newsDbFromContext, readHomeNews, readNewsFeed } from "~/lib/news/db.server";

/** 同源资讯 API：只读本站 D1，不在访客请求中访问 RSS。 */
export async function loader({ request, context }: Route.LoaderArgs) {
  const url = new URL(request.url);
  if (url.searchParams.get("view") === "home") {
    return data(await readHomeNews(newsDbFromContext(context)), {
      headers: publicCacheHeaders(HTTP_CACHE.news),
    });
  }
  const payload = await readNewsFeed(newsDbFromContext(context), {
    channel: parseNewsChannel(url.searchParams.get("channel")),
    limit: Number(url.searchParams.get("limit")) || 24,
    page: Number(url.searchParams.get("page")) || 1,
  });
  return data(payload, { headers: publicCacheHeaders(HTTP_CACHE.news) });
}
