import type { Route } from "./+types/anime.card.$id";
import { fetchCardExtra } from "~/lib/bangumi/server/card-extra.server";

/** 同源卡片增强 API：单部番补足简介 / staff / 收藏 / 元数据（懒加载用） */
export async function loader({ params }: Route.LoaderArgs) {
  const id = params.id;
  if (!id) throw new Response("缺少 id", { status: 400 });

  return fetchCardExtra(id);
}
