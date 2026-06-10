import type { Route } from "./+types/anime.detail.$id";
import { fetchCachedDetail } from "~/lib/bangumi";

/** 同源详情 API：并行拉取条目 + 人员 + 章节，带缓存 */
export async function loader({ params }: Route.LoaderArgs) {
  const id = params.id;
  if (!id) throw new Response("缺少 id", { status: 400 });

  return fetchCachedDetail(id);
}
