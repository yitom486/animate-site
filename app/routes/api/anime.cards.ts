import { data } from "react-router";
import type { Route } from "./+types/anime.cards";
import { CARD_BATCH_MAX_IDS, fetchCardExtrasBatch } from "~/lib/bangumi/server/card-extra.server";
import { HTTP_CACHE, publicCacheHeaders } from "~/lib/cache";
import { throwRouteUpstreamError, upstreamFromRequest } from "~/lib/upstream";

/**
 * 同源批量卡片增强 API。
 * Bangumi 无官方批量 subject；本端聚合并限并发，部分失败按 id 返回。
 */
export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const idsParam = url.searchParams.get("ids") ?? "";
  const rawIds = idsParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (rawIds.length === 0) {
    throw new Response("缺少 ids", { status: 400 });
  }
  if (rawIds.length > CARD_BATCH_MAX_IDS) {
    throw new Response(`ids 最多 ${CARD_BATCH_MAX_IDS} 个`, { status: 400 });
  }

  try {
    const payload = await fetchCardExtrasBatch(rawIds, upstreamFromRequest(request));
    return data(payload, { headers: publicCacheHeaders(HTTP_CACHE.card) });
  } catch (error) {
    throwRouteUpstreamError(error);
  }
}
