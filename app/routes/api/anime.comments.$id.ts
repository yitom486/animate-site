import type { Route } from "./+types/anime.comments.$id";
import {
  fetchSubjectComments,
  fetchCommentsPage,
  fetchReviewsPage,
} from "~/lib/bangumi/server/comments.server";

/**
 * 同源评论 API：
 * - 无 kind：返回初始合并（吐槽 + 评论 第一页）
 * - kind=comments|reviews + offset：返回该类下一页 { items, total }
 */
export async function loader({ params, request }: Route.LoaderArgs) {
  const id = params.id;
  if (!id) throw new Response("缺少 id", { status: 400 });

  const url = new URL(request.url);
  const kind = url.searchParams.get("kind");
  const offset = Number(url.searchParams.get("offset") ?? 0) || 0;

  if (kind === "comments") return fetchCommentsPage(id, offset);
  if (kind === "reviews") return fetchReviewsPage(id, offset);

  return fetchSubjectComments(id);
}
