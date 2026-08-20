/**
 * 缓存模块统一入口（`import … from "~/lib/cache"`）。
 *
 * 分层职责：
 * - L1 `createCache` / `withCache`：进程内 LRU + single-flight，按业务 key 读写
 * - L2 `edge`（内部）：withCache 在 `useEdge: true` 时走 Cache API
 * - L2 HTTP：`publicCacheHeaders` / `HTTP_CACHE` 供 loader 声明 CDN 可共享的响应
 *
 * 为何 HTTP 头单独导出：CDN 缓存的是 URL 对应的 Response，与 Map 里的 key 不是同一层；
 * 在 route loader 返回时用 `data(payload, { headers: publicCacheHeaders(…) })` 设置。
 *
 * 典型用法：
 * ```ts
 * // 服务端 / 组件内取数
 * await withCache(store, key, fetcher, { useEdge: true });
 *
 * // 公开 API loader
 * return data(payload, { headers: publicCacheHeaders(HTTP_CACHE.list) });
 * ```
 */

export type { CacheStore, CreateCacheOptions, HttpCachePolicy, WithCacheOptions } from "./types";
export { createCache, withCache } from "./memory";
export { buildCacheControl, publicCacheHeaders, HTTP_CACHE } from "./http";
