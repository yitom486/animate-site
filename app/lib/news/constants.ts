/** 资讯缓存 TTL（部署可换 KV）。10 分钟兼顾及时性与限流风险 */
export const CACHE_TTL_NEWS_MS = 10 * 60 * 1000;

/** AniNewsAPI — 英文动漫头条聚合 */
export const ANINEWS_API = "https://aninews.vercel.app/api/news";

/**
 * RSSHub 基址。公共 rsshub.app 已限流，生产建议自建或换镜像。
 * 例：RSSHUB_BASE=https://your-rsshub.example.com
 */
export const RSSHUB_BASE =
  (typeof process !== "undefined" && process.env?.RSSHUB_BASE) || "https://rsshub.app";

/**
 * RSSHub 路由（需自建 RSSHub 或可用镜像；公共 rsshub.app 常 403）。
 * 动漫之家新闻站近年不稳定，已改用其它 ACG 垂直源。
 * 文档：https://docs.rsshub.app/routes/anime
 */
export const RSSHUB_FEEDS = [
  {
    id: "animen",
    label: "Animen",
    path: "/animen/news/zx.json",
    locale: "zh" as const,
  },
  {
    id: "005tv",
    label: "二次元资讯",
    path: "/005tv/zx/latest.json",
    locale: "zh" as const,
  },
  {
    id: "78dm",
    label: "78动漫",
    path: "/78dm/news.json",
    locale: "zh" as const,
  },
  {
    id: "acfun-culture",
    label: "AcFun",
    path: "/acfun/article/110.json",
    locale: "zh" as const,
  },
] as const;

export const FETCH_TIMEOUT_MS = 8000;
