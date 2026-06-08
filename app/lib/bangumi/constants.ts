/** Bangumi API User-Agent，必填，格式：开发者/项目名 (主页URL) */
export const BGM_USER_AGENT = "yhang/anime-site (https://github.com/yhang)";

export const BGM_V0 = "https://api.bgm.tv/v0";
export const BGM_LEGACY = "https://api.bgm.tv";

/** 列表每页条数（GET /subjects、calendar 切片） */
export const LIST_PAGE_SIZE = 24;

/** POST /search/subjects 单次最多 20 条；limit/offset 须放在 URL query */
export const BGM_SEARCH_PAGE_SIZE = 20;

/** 本地 / Worker 内存缓存 TTL（部署 Cloudflare 后可换 KV，TTL 建议保持一致） */
export const CACHE_TTL_LIST_MS = 5 * 60 * 1000;
export const CACHE_TTL_DETAIL_MS = 30 * 60 * 1000;
