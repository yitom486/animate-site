import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { CACHE_TTL_DETAIL_MS } from "./bangumi/constants";
import type { DetailPayload } from "./bangumi/types-detail";
import type { CommentPage, ReviewPage, SubjectComments } from "./bangumi/types-comments";
import { fetchQueryJson } from "./query-client";

export function subjectDetailQuery(id: string) {
  return queryOptions({
    queryKey: ["subject", id, "detail"],
    queryFn: ({ signal }) =>
      fetchQueryJson<DetailPayload>(`/api/anime/detail/${encodeURIComponent(id)}`, signal),
    staleTime: CACHE_TTL_DETAIL_MS,
    enabled: Boolean(id),
  });
}

export function subjectCommentsQuery(id: string) {
  return queryOptions({
    queryKey: ["subject", id, "comments", "initial"],
    queryFn: ({ signal }) =>
      fetchQueryJson<SubjectComments>(`/api/anime/comments/${encodeURIComponent(id)}`, signal),
    // 只负责提供初始种子；后续新鲜度由两个分页查询管理，避免挂载时重复刷新第一页。
    staleTime: Infinity,
    enabled: Boolean(id),
  });
}

type DiscussionPage = CommentPage | ReviewPage;

export function nextDiscussionOffset(
  lastPage: DiscussionPage,
  _pages: DiscussionPage[],
  lastOffset: number,
) {
  const offset = lastOffset + lastPage.items.length;
  // 空页必须停下，避免上游 total 过时导致反复请求同一个 offset。
  return lastPage.items.length > 0 && offset < lastPage.total ? offset : undefined;
}

export function discussionPagesQuery<K extends "comments" | "reviews">(
  id: string,
  kind: K,
  initialPage: K extends "comments" ? CommentPage : ReviewPage,
  updatedAt: number,
) {
  type Page = K extends "comments" ? CommentPage : ReviewPage;
  return infiniteQueryOptions({
    queryKey: ["subject", id, "comments", kind],
    queryFn: ({ signal, pageParam }) =>
      fetchQueryJson<Page>(
        `/api/anime/comments/${encodeURIComponent(id)}?kind=${kind}&offset=${pageParam}`,
        signal,
      ),
    initialPageParam: 0,
    getNextPageParam: nextDiscussionOffset,
    // 合并接口已返回两个第一页；这里直接接管，避免重复请求。
    initialData: { pages: [initialPage], pageParams: [0] },
    initialDataUpdatedAt: updatedAt,
  });
}
