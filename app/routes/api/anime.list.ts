import type { Route } from "./+types/anime.list";
import { loadCachedAnimeListFromRequest } from "~/lib/bangumi/server/list-load.server";
import { throwRouteUpstreamError, upstreamFromRequest } from "~/lib/upstream";

/** 同源列表 API：聚合 Bangumi 多接口，带内存缓存（上线可换 KV） */
export async function loader({ request }: Route.LoaderArgs) {
  try {
    return await loadCachedAnimeListFromRequest(request, upstreamFromRequest(request));
  } catch (error) {
    throwRouteUpstreamError(error);
  }
}
