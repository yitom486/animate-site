/**
 * Bangumi API 路径配置（均为相对路径，在 client.server.ts 中拼接）
 */
export const BGM_API_ROUTES = {
  /** 条目详情 */
  subjectDetail: (id: string | number) => `/subjects/${id}`,

  /** 制作人员 / 声优 */
  subjectPersons: (id: string | number) => `/subjects/${id}/persons`,

  /** 关联条目 */
  subjectRelated: (id: string | number) => `/subjects/${id}/subjects`,

  /** 角色 */
  subjectCharacters: (id: string | number) => `/subjects/${id}/characters`,

  /** 章节列表 */
  episodes: () => `/episodes`,

  /** 搜索 */
  searchSubjects: () => `/search/subjects`,

  /** 排行榜 / 最新 / 分类 / 季度 */
  subjects: () => `/subjects`,

  /** 每日放送 */
  calendar: () => `/calendar`,

  /** 吐槽 / 短评（next p1 接口） */
  subjectComments: (id: string | number) => `/p1/subjects/${id}/comments`,

  /** 评论 / 长评（next p1 接口，entry 关联 bgm 日志） */
  subjectReviews: (id: string | number) => `/p1/subjects/${id}/reviews`,
} as const;
