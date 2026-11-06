import type { Route } from "./+types/anime.bilibili.$id";
import { fetchCachedDetail } from "~/lib/bangumi/server/detail.server";
import { matchBilibiliBangumi, parseBilibiliMediaId, resolveBilibiliMedia } from "~/lib/bilibili";
import type { BilibiliMatchResponse } from "~/lib/bilibili";
import { throwRouteUpstreamError, upstreamFromRequest } from "~/lib/upstream";
import { readBilibiliCatalog } from "~/lib/bilibili/catalog.server";

/** 同源 B 站匹配：不进详情主 loader，避免阻塞封面/简介 */
export async function loader({
  params,
  request,
}: Route.LoaderArgs): Promise<BilibiliMatchResponse> {
  const id = params.id;
  if (!id) throw new Response("缺少 id", { status: 400 });

  const rawMediaId = new URL(request.url).searchParams.get("mediaId");
  if (rawMediaId !== null) {
    const mediaId = parseBilibiliMediaId(rawMediaId);
    if (!mediaId) throw new Response("无效的 mediaId", { status: 400 });
    const saved = readBilibiliCatalog(mediaId);
    if (saved) return { match: saved, status: "matched" };
    return resolveBilibiliMedia(mediaId);
  }

  try {
    const { subject } = await fetchCachedDetail(id, upstreamFromRequest(request));
    const keywords = [subject.name_cn, subject.name].filter(Boolean) as string[];
    return matchBilibiliBangumi(keywords);
  } catch (error) {
    throwRouteUpstreamError(error);
  }
}
