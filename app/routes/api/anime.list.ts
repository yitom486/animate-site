import { data } from "react-router";
import type { Route } from "./+types/anime.list";
import { loadCachedAnimeListFromRequest } from "~/lib/bangumi/server/list-load.server";
import { listHttpCacheHeaders, type CacheStatus } from "~/lib/cache";
import { throwRouteUpstreamError, upstreamFromRequest } from "~/lib/upstream";

/** 同源列表 API：聚合 Bangumi 多接口，带内存 + 边缘缓存；响应可被 CDN 共享 */
export async function loader({ request }: Route.LoaderArgs) {
  let cacheStatus: CacheStatus = "MISS";
  try {
    const url = new URL(request.url);
    const payload = await loadCachedAnimeListFromRequest(request, {
      ...upstreamFromRequest(request),
      onCacheStatus: (status) => {
        cacheStatus = status;
      },
    });
    return data(payload, { headers: listHttpCacheHeaders(url.searchParams, cacheStatus) });
  } catch (error) {
    throwRouteUpstreamError(error);
  }
}
