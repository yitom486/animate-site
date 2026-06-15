/**
 * Bangumi API 路径配置 (均为相对路径，在 client.ts 中拼接)
 */
export const BGM_API_ROUTES = {
  /** 条目详情 */
  subjectDetail: (id: string | number) => `/subjects/${id}`,

  /** 制作人员 / 声优 */
  subjectPersons: (id: string | number) => `/subjects/${id}/persons`,

  /** 章节列表 */
  episodes: () => `/episodes`,

  /** 搜索 */
  searchSubjects: () => `/search/subjects`,

  /** 排行榜 / 最新 / 分类 / 季度 */
  subjects: () => `/subjects`,

  /** 每日放送 */
  calendar: () => `/calendar`,
} as const;
