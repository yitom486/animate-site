import type { HttpCachePolicy } from "./types";

/**
 * HTTP / CDN 层：声明「这份 Response 可被浏览器与边缘缓存多久」。
 * 与 memory.withCache 互补——后者管 Worker 进程内 key，这里管 loader 返回的整段响应。
 */
/** 公开资源推荐策略（秒）；与业务 TTL 大致对齐 */
export const HTTP_CACHE = {
  /** 列表：浏览器 1 分钟，CDN 5 分钟 */
  list: {
    maxAge: 60,
    sMaxAge: 300,
    staleWhileRevalidate: 60,
  },
  /** 详情 / 卡片：浏览器 2 分钟，CDN 30 分钟 */
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
  /** 资讯：浏览器 1 分钟，CDN 10 分钟 */
  news: {
    maxAge: 60,
    sMaxAge: 600,
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
export function publicCacheHeaders(policy: HttpCachePolicy): HeadersInit {
  return {
    "Cache-Control": buildCacheControl(policy),
  };
}
