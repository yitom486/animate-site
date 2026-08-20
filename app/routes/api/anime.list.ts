import { data } from "react-router";
import type { Route } from "./+types/anime.list";
import { loadCachedAnimeListFromRequest } from "~/lib/bangumi/server/list-load.server";
import { HTTP_CACHE, publicCacheHeaders } from "~/lib/cache";
import { throwRouteUpstreamError, upstreamFromRequest } from "~/lib/upstream";

/** 同源列表 API：聚合 Bangumi 多接口，带内存 + 边缘缓存；响应可被 CDN 共享 */
export async function loader({ request }: Route.LoaderArgs) {
  try {
    const payload = await loadCachedAnimeListFromRequest(request, upstreamFromRequest(request));
    return data(payload, { headers: publicCacheHeaders(HTTP_CACHE.list) });
  } catch (error) {
    throwRouteUpstreamError(error);
  }
}
