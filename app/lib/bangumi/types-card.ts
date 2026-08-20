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
  /** 按条目类型从 infobox 抽取的职员字段（键为展示名） */
  staff: Record<string, string>;
};

/** 批量卡片增强响应：部分失败按 id 隔离 */
export type CardExtraBatchResult = {
  dataById: Record<string, CardExtra>;
  errorsById: Record<string, string>;
};
