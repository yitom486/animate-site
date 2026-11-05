import { data } from "react-router";
import type { Route } from "./+types/anime.detail.$id";
import { fetchCachedDetail } from "~/lib/bangumi/server/detail.server";
import { HTTP_CACHE, publicCacheHeaders, type CacheStatus } from "~/lib/cache";
import { throwRouteUpstreamError, upstreamFromRequest } from "~/lib/upstream";
import { proxySubjectImages } from "~/lib/anime-meta";
import type { DetailPayload } from "~/lib/bangumi/types-detail";

/** 同源详情 API：并行拉取条目 + 人员 + 章节；公开缓存头供 CDN */
export async function loader({ params, request }: Route.LoaderArgs) {
  const id = params.id;
  if (!id) throw new Response("缺少 id", { status: 400 });

  let cacheStatus: CacheStatus = "MISS";
  try {
    const payload = await fetchCachedDetail(id, {
      ...upstreamFromRequest(request),
      onCacheStatus: (status) => {
        cacheStatus = status;
      },
    });

    // 为客户端返回已代理的图片地址，避免直连 lain.bgm.tv 失败
    const cloned = JSON.parse(JSON.stringify(payload)) as DetailPayload;
    if (cloned.subject?.images) {
      cloned.subject.images = proxySubjectImages(cloned.subject.images) ?? cloned.subject.images;
    }

    return data(cloned, { headers: publicCacheHeaders(HTTP_CACHE.detail, cacheStatus) });
  } catch (error) {
    throwRouteUpstreamError(error);
  }
}
