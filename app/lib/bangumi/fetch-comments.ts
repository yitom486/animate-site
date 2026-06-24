import { bgmGetNext } from "./client";
import { BGM_API_ROUTES } from "./urls";

/** 每页条数 */
export const COMMENT_PAGE_SIZE = 20;
export const REVIEW_PAGE_SIZE = 10;

/** next p1 用户片段 */
type NextUser = {
  id: number;
  nickname: string;
  username: string;
  avatar?: { small?: string; medium?: string; large?: string };
};

type RawComment = {
  id: number;
  user: NextUser;
  rate: number;
  comment: string;
  updatedAt: number;
};

type RawReview = {
  id: number;
  user: NextUser;
  entry: {
    id: number;
    title: string;
    summary: string;
    replies: number;
    createdAt: number;
  };
};

/** 裁剪后的吐槽 */
export type SubjectComment = {
  id: number;
  nickname: string;
  avatar?: string;
  rate: number;
  comment: string;
  date: number;
};

/** 裁剪后的评论（关联 bgm 日志，entryId 可接站内 /anime/blog/:id） */
export type SubjectReview = {
  id: number;
  nickname: string;
  avatar?: string;
  entryId: number;
  title: string;
  summary: string;
  replies: number;
  date: number;
};

export type CommentPage = { items: SubjectComment[]; total: number };
export type ReviewPage = { items: SubjectReview[]; total: number };

/** 初始合并载荷（吐槽 + 评论 第一页） */
export type SubjectComments = {
  comments: SubjectComment[];
  commentsTotal: number;
  reviews: SubjectReview[];
  reviewsTotal: number;
};

type ListResp<T> = { data: T[]; total: number };

function trimComment(x: RawComment): SubjectComment {
  return {
    id: x.id,
    nickname: x.user?.nickname ?? "匿名",
    avatar: x.user?.avatar?.small,
    rate: x.rate ?? 0,
    comment: x.comment.trim(),
    date: x.updatedAt,
  };
}

function trimReview(x: RawReview): SubjectReview {
  return {
    id: x.id,
    nickname: x.user?.nickname ?? "匿名",
    avatar: x.user?.avatar?.small,
    entryId: x.entry.id,
    title: x.entry.title,
    summary: x.entry.summary,
    replies: x.entry.replies ?? 0,
    date: x.entry.createdAt,
  };
}

/** GET next p1：吐槽分页 */
export async function fetchCommentsPage(
  id: string,
  offset = 0,
  limit = COMMENT_PAGE_SIZE,
): Promise<CommentPage> {
  const c = await bgmGetNext<ListResp<RawComment>>(
    BGM_API_ROUTES.subjectComments(id),
    { limit, offset },
  ).catch(() => ({ data: [], total: 0 }));
  return {
    items: (c.data ?? []).filter((x) => x.comment?.trim()).map(trimComment),
    total: c.total ?? 0,
  };
}

/** GET next p1：评论分页 */
export async function fetchReviewsPage(
  id: string,
  offset = 0,
  limit = REVIEW_PAGE_SIZE,
): Promise<ReviewPage> {
  const r = await bgmGetNext<ListResp<RawReview>>(
    BGM_API_ROUTES.subjectReviews(id),
    { limit, offset },
  ).catch(() => ({ data: [], total: 0 }));
  return { items: (r.data ?? []).map(trimReview), total: r.total ?? 0 };
}

/** 初始合并：吐槽 + 评论 第一页并行 */
export async function fetchSubjectComments(
  id: string,
): Promise<SubjectComments> {
  const [c, r] = await Promise.all([
    fetchCommentsPage(id, 0),
    fetchReviewsPage(id, 0),
  ]);
  return {
    comments: c.items,
    commentsTotal: c.total,
    reviews: r.items,
    reviewsTotal: r.total,
  };
}
