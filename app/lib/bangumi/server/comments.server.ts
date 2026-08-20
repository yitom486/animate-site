import { bgmGetNext } from "./client.server";
import { BGM_API_ROUTES } from "./api-routes.server";
import { BGM_TIMEOUT_MS } from "./config.server";
import { isAbortLike } from "~/lib/upstream";
import type { UpstreamRequestOptions } from "~/lib/upstream";
import type {
  CommentPage,
  ReviewPage,
  SubjectComment,
  SubjectComments,
  SubjectReview,
} from "../types-comments";

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

type ListResp<T> = { data: T[]; total: number };

const commentOpts = (options?: UpstreamRequestOptions): UpstreamRequestOptions => ({
  ...options,
  timeoutMs: options?.timeoutMs ?? BGM_TIMEOUT_MS.comments,
});

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
  options?: UpstreamRequestOptions,
): Promise<CommentPage> {
  try {
    const c = await bgmGetNext<ListResp<RawComment>>(
      BGM_API_ROUTES.subjectComments(id),
      { limit, offset },
      commentOpts(options),
    );
    return {
      items: (c.data ?? []).filter((x) => x.comment?.trim()).map(trimComment),
      total: c.total ?? 0,
    };
  } catch (error) {
    if (isAbortLike(error)) throw error;
    return { items: [], total: 0 };
  }
}

/** GET next p1：评论分页 */
export async function fetchReviewsPage(
  id: string,
  offset = 0,
  limit = REVIEW_PAGE_SIZE,
  options?: UpstreamRequestOptions,
): Promise<ReviewPage> {
  try {
    const r = await bgmGetNext<ListResp<RawReview>>(
      BGM_API_ROUTES.subjectReviews(id),
      { limit, offset },
      commentOpts(options),
    );
    return { items: (r.data ?? []).map(trimReview), total: r.total ?? 0 };
  } catch (error) {
    if (isAbortLike(error)) throw error;
    return { items: [], total: 0 };
  }
}

/** 初始合并：吐槽 + 评论 第一页并行 */
export async function fetchSubjectComments(
  id: string,
  options?: UpstreamRequestOptions,
): Promise<SubjectComments> {
  const [c, r] = await Promise.all([
    fetchCommentsPage(id, 0, COMMENT_PAGE_SIZE, options),
    fetchReviewsPage(id, 0, REVIEW_PAGE_SIZE, options),
  ]);
  return {
    comments: c.items,
    commentsTotal: c.total,
    reviews: r.items,
    reviewsTotal: r.total,
  };
}
