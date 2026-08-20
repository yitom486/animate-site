import type { Route } from "./+types/anime.downloads.$id";
import { fetchCachedDetail } from "~/lib/bangumi/server/detail.server";
import type { InfoboxItem } from "~/lib/anime-meta";
import { fetchDownloads } from "~/lib/downloads";
import { throwRouteUpstreamError, upstreamFromRequest } from "~/lib/upstream";

/** 从 infobox「别名」取各类译名作为补充搜索关键词 */
function aliases(infobox?: InfoboxItem[]): string[] {
  const item = infobox?.find((i) => i.key === "别名");
  if (!item) return [];
  const { value } = item;
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) {
    return value.map((v) => (typeof v === "string" ? v : v.v)).filter(Boolean);
  }
  return [];
}

/** 同源下载 API：漫猫 + 動漫花園 双源搜索，懒加载 */
export async function loader({ params, request }: Route.LoaderArgs) {
  const id = params.id;
  if (!id) throw new Response("缺少 id", { status: 400 });

  try {
    const { subject } = await fetchCachedDetail(id, upstreamFromRequest(request));
    const keywords = [subject.name_cn, subject.name, ...aliases(subject.infobox)].filter(
      Boolean,
    ) as string[];

    return fetchDownloads(keywords);
  } catch (error) {
    throwRouteUpstreamError(error);
  }
}
