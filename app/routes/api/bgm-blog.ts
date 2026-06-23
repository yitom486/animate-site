import type { Route } from "./+types/bgm-blog";
import { fetchBgmAnimeBlogPage } from "~/lib/bangumi/fetch-blog-html";
import { fetchBgmSubjectBlog } from "~/lib/bangumi/fetch-blog-rss";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const subjectId = url.searchParams.get("subject")?.trim();

  // 单条目日志（详情页用）走 RSS；全站列表走 HTML 分页（支持无限滚动）
  if (subjectId) {
    const limit = Math.min(20, Math.max(1, Number(url.searchParams.get("limit")) || 8));
    const items = await fetchBgmSubjectBlog(subjectId, limit);
    return { items, page: 1, hasMore: false, fetchedAt: new Date().toISOString() };
  }

  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const result = await fetchBgmAnimeBlogPage(page);
  return { ...result, fetchedAt: new Date().toISOString() };
}
