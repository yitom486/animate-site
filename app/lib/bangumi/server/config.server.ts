/** Bangumi API User-Agent，必填，格式：开发者/项目名 (主页URL) */
export const BGM_USER_AGENT = "yhang/anime-site (https://github.com/yhang)";

export const BGM_V0 = "https://api.bgm.tv/v0";
export const BGM_LEGACY = "https://api.bgm.tv";
/** 新版前端私有 API（p1）：吐槽 / 评论等，GET 无需登录 */
export const BGM_NEXT = "https://next.bgm.tv";

/** POST /search/subjects 单次最多 20 条；limit/offset 须放在 URL query */
export const BGM_SEARCH_PAGE_SIZE = 20;

/** 全类型搜索每个分类预览条数（不超过 BGM_SEARCH_PAGE_SIZE） */
export const SEARCH_GROUP_PAGE_SIZE = 10;

export { CACHE_TTL_LIST_MS, CACHE_TTL_DETAIL_MS, CACHE_MAX_ENTRIES } from "../constants";

/** Bangumi 上游请求超时（毫秒）；后续可按 P95 采样调整 */
export const BGM_TIMEOUT_MS = {
  detail: 8_000,
  list: 10_000,
  search: 10_000,
  calendar: 10_000,
  comments: 8_000,
} as const;
