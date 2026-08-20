import { data } from "react-router";
import type { Route } from "./+types/anime.detail.$id";
import { fetchCachedDetail } from "~/lib/bangumi/server/detail.server";
import { HTTP_CACHE, publicCacheHeaders } from "~/lib/cache";
import { throwRouteUpstreamError, upstreamFromRequest } from "~/lib/upstream";

/** 同源详情 API：并行拉取条目 + 人员 + 章节；公开缓存头供 CDN */
export async function loader({ params, request }: Route.LoaderArgs) {
  const id = params.id;
  if (!id) throw new Response("缺少 id", { status: 400 });

  try {
    const payload = await fetchCachedDetail(id, upstreamFromRequest(request));
    return data(payload, { headers: publicCacheHeaders(HTTP_CACHE.detail) });
  } catch (error) {
    throwRouteUpstreamError(error);
  }
}
