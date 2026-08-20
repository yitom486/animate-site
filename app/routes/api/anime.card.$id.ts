import { data } from "react-router";
import type { Route } from "./+types/anime.card.$id";
import { fetchCardExtra } from "~/lib/bangumi/server/card-extra.server";
import { HTTP_CACHE, publicCacheHeaders } from "~/lib/cache";
import { throwRouteUpstreamError, upstreamFromRequest } from "~/lib/upstream";

/** 同源卡片增强 API：单部番补足简介 / staff / 收藏 / 元数据（懒加载用） */
export async function loader({ params, request }: Route.LoaderArgs) {
  const id = params.id;
  if (!id) throw new Response("缺少 id", { status: 400 });

  try {
    const payload = await fetchCardExtra(id, upstreamFromRequest(request));
    return data(payload, { headers: publicCacheHeaders(HTTP_CACHE.card) });
  } catch (error) {
    throwRouteUpstreamError(error);
  }
}
