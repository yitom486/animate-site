/** 列表网格：桌面端 7 列，分页尽量保持完整 6 行 */
export const LIST_GRID_DESKTOP_COLUMNS = 7;
export const LIST_GRID_ROWS_PER_PAGE = 6;
export const LIST_PAGE_SIZE_MIN = 24;

/** 列表每页条数（GET /subjects）；按网格计算，24 作为移动端最低数量兜底 */
export const LIST_PAGE_SIZE = Math.max(
  LIST_PAGE_SIZE_MIN,
  LIST_GRID_DESKTOP_COLUMNS * LIST_GRID_ROWS_PER_PAGE,
);

/** 内存缓存 TTL（浏览器 / Worker 共用语义） */
export const CACHE_TTL_LIST_MS = 5 * 60 * 1000;
export const CACHE_TTL_DETAIL_MS = 30 * 60 * 1000;

/** 内存缓存容量上限（条目数）；后续可按命中/淘汰率调参 */
export const CACHE_MAX_ENTRIES = {
  list: 200,
  detail: 400,
  card: 400,
  blog: 120,
  downloads: 100,
  news: 32,
  clientList: 80,
  clientDetail: 60,
} as const;
