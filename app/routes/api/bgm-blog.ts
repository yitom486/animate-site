import type { Route } from "./+types/bgm-blog";
import { fetchBlogListPage } from "~/lib/bangumi/server/blog/list.server";
import { fetchBgmSubjectBlog } from "~/lib/bangumi/server/blog/rss.server";
import { parseBlogSection } from "~/lib/bangumi/blog-section";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const subjectId = url.searchParams.get("subject")?.trim();

  // 单条目日志（详情页用）走 RSS；全站列表走 HTML 分页（支持无限滚动）
  if (subjectId) {
    const limit = Math.min(20, Math.max(1, Number(url.searchParams.get("limit")) || 8));
    const items = await fetchBgmSubjectBlog(subjectId, limit);
    return { items, page: 1, hasMore: false, fetchedAt: new Date().toISOString() };
  }

  const section = parseBlogSection(url.searchParams.get("section") ?? "anime") ?? "anime";
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const result = await fetchBlogListPage(section, page);
  return { ...result, section, fetchedAt: new Date().toISOString() };
}
