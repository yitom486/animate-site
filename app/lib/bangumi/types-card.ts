/** Bangumi 收藏分布（想看 / 在看 / 看过 / 搁置 / 抛弃） */
export type SubjectCollection = {
  wish?: number;
  doing?: number;
  collect?: number;
  on_hold?: number;
  dropped?: number;
};

/** 卡片增强数据：补足日历接口缺失的简介 / staff / 收藏 / 元数据 */
export type CardExtra = {
  nameJa: string;
  summary: string;
  tags: string[];
  metaTags: string[];
  collection: SubjectCollection;
  staff: { 原作: string; 导演: string; 制作: string };
};
