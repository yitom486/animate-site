import type { CacheStatus, HttpCachePolicy } from "./types";
import { secondsUntilShanghaiMidnightCapped } from "~/lib/bangumi/calendar-utils";

/**
 * HTTP / CDN 层：声明「这份 Response 可被浏览器与边缘缓存多久」。
 * 与 memory.withCache 互补——后者管 Worker 进程内 key，这里管 loader 返回的整段响应。
 *
 * 无 R2：公开 JSON 走 Cloudflare CDN（s-maxage）+ Cache API L2；静态 bangumi-data 走 Pages/_headers。
 */
/** 公开资源推荐策略（秒）；与业务 TTL 大致对齐 */
export const HTTP_CACHE = {
  /** 默认列表：浏览器 1 分钟，CDN 5 分钟 */
  list: {
    maxAge: 60,
    sMaxAge: 300,
    staleWhileRevalidate: 60,
  },
  /**
   * 每日放送：周表本身可共享；CDN 最长不超过到上海午夜，
   * 避免跨日后边缘仍把「今日」相关聚合当成同一份（完整周表本身可更久，取保守上限）。
   */
  calendar: {
    maxAge: 120,
    sMaxAge: 600,
    staleWhileRevalidate: 300,
  },
  /** 排行榜等高命中：浏览器 2 分钟，CDN 15 分钟 */
  rank: {
    maxAge: 120,
    sMaxAge: 900,
    staleWhileRevalidate: 300,
  },
  /** 详情 / 关联：浏览器 2 分钟，CDN 30 分钟 */
  detail: {
    maxAge: 120,
    sMaxAge: 1800,
    staleWhileRevalidate: 300,
  },
  card: {
    maxAge: 120,
    sMaxAge: 1800,
    staleWhileRevalidate: 300,
  },
  /** 评论相对易变：短共享 */
  comments: {
    maxAge: 60,
    sMaxAge: 300,
    staleWhileRevalidate: 120,
  },
  /** 下载源波动大 */
  downloads: {
    maxAge: 60,
    sMaxAge: 180,
    staleWhileRevalidate: 60,
  },
  /** 资讯：浏览器 30 秒，CDN 60 秒（push 后尽快可见） */
  news: {
    maxAge: 30,
    sMaxAge: 60,
    staleWhileRevalidate: 30,
  },
  /** Bangumi 日志列表 */
  blog: {
    maxAge: 60,
    sMaxAge: 300,
    staleWhileRevalidate: 120,
  },
} as const satisfies Record<string, HttpCachePolicy>;

export function buildCacheControl(policy: HttpCachePolicy): string {
  const parts = [policy.scope ?? "public", `max-age=${policy.maxAge}`];
  if (policy.sMaxAge != null) parts.push(`s-maxage=${policy.sMaxAge}`);
  if (policy.staleWhileRevalidate != null) {
    parts.push(`stale-while-revalidate=${policy.staleWhileRevalidate}`);
  }
  return parts.join(", ");
}

/** 供 loader / Response 使用的公开缓存头 */
export function publicCacheHeaders(policy: HttpCachePolicy, status?: CacheStatus): HeadersInit {
  return {
    "Cache-Control": buildCacheControl(policy),
    ...(status ? { "X-App-Cache": status } : {}),
  };
}

/**
 * 放送类响应：把 s-maxage / max-age 压到「不超过上海午夜」，
 * 这样 CDN 不会跨日继续命中昨日边缘副本。
 */
export function calendarCacheHeaders(status?: CacheStatus): HeadersInit {
  const base = HTTP_CACHE.calendar;
  const until = secondsUntilShanghaiMidnightCapped(base.sMaxAge ?? 600);
  const policy: HttpCachePolicy = {
    ...base,
    maxAge: Math.min(base.maxAge, until),
    sMaxAge: until,
  };
  return publicCacheHeaders(policy, status);
}

/** 按列表 query 选择 CDN 策略（排行 / 放送 / 默认）。 */
export function listHttpCacheHeaders(
  searchParams: URLSearchParams,
  status?: CacheStatus,
): HeadersInit {
  const view = searchParams.get("view") ?? "";
  const sort = searchParams.get("sort") ?? "";
  if (view === "calendar") return calendarCacheHeaders(status);
  if (sort === "rank" && !view) return publicCacheHeaders(HTTP_CACHE.rank, status);
  return publicCacheHeaders(HTTP_CACHE.list, status);
}
