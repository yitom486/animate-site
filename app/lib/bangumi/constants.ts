/** Bangumi API User-Agent，必填，格式：开发者/项目名 (主页URL) */
export const BGM_USER_AGENT = "yhang/anime-site (https://github.com/yhang)";

export const BGM_V0 = "https://api.bgm.tv/v0";
export const BGM_LEGACY = "https://api.bgm.tv";
/** 新版前端私有 API（p1）：吐槽 / 评论等，GET 无需登录 */
export const BGM_NEXT = "https://next.bgm.tv";

/** 列表网格：桌面端 7 列，分页尽量保持完整 6 行 */
export const LIST_GRID_DESKTOP_COLUMNS = 7;
export const LIST_GRID_ROWS_PER_PAGE = 6;
export const LIST_PAGE_SIZE_MIN = 24;

/** 列表每页条数（GET /subjects）；按网格计算，24 作为移动端最低数量兜底 */
export const LIST_PAGE_SIZE = Math.max(
  LIST_PAGE_SIZE_MIN,
  LIST_GRID_DESKTOP_COLUMNS * LIST_GRID_ROWS_PER_PAGE,
);

/** POST /search/subjects 单次最多 20 条；limit/offset 须放在 URL query */
export const BGM_SEARCH_PAGE_SIZE = 20;

/** 本地 / Worker 内存缓存 TTL（部署 Cloudflare 后可换 KV，TTL 建议保持一致） */
export const CACHE_TTL_LIST_MS = 5 * 60 * 1000;
export const CACHE_TTL_DETAIL_MS = 30 * 60 * 1000;
