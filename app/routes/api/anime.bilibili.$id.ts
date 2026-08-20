import type { Route } from "./+types/anime.bilibili.$id";
import { fetchCachedDetail } from "~/lib/bangumi/server/detail.server";
import { matchBilibiliBangumi } from "~/lib/bilibili";
import type { BilibiliMatchResponse } from "~/lib/bilibili";
import { throwRouteUpstreamError, upstreamFromRequest } from "~/lib/upstream";

/** 同源 B 站匹配：不进详情主 loader，避免阻塞封面/简介 */
export async function loader({
  params,
  request,
}: Route.LoaderArgs): Promise<BilibiliMatchResponse> {
  const id = params.id;
  if (!id) throw new Response("缺少 id", { status: 400 });

  try {
    const { subject } = await fetchCachedDetail(id, upstreamFromRequest(request));
    const keywords = [subject.name_cn, subject.name].filter(Boolean) as string[];
    return matchBilibiliBangumi(keywords);
  } catch (error) {
    throwRouteUpstreamError(error);
  }
}
