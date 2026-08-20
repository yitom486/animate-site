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
