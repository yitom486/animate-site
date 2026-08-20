/** 创建内存缓存时的选项 */
export type CreateCacheOptions = {
  /** 条目存活时间；默认 5 分钟 */
  ttlMs?: number;
  /** 最大条目数；超出时按 LRU 淘汰。默认 256 */
  maxEntries?: number;
};

export type CacheStore<T> = {
  get(key: string): T | null;
  set(key: string, data: T): void;
  delete(key: string): void;
  /** 当前条目数（不含 in-flight） */
  size(): number;
  clear(): void;
};

/** HTTP / CDN 层策略（秒） */
export type HttpCachePolicy = {
  /** 浏览器 max-age */
  maxAge: number;
  /** 共享缓存（CDN）s-maxage；缺省时不写 */
  sMaxAge?: number;
  /** stale-while-revalidate */
  staleWhileRevalidate?: number;
  /** 默认 public；含用户态时用 private */
  scope?: "public" | "private";
};

/**
 * withCache 统一选项。
 * - signal：只取消「等待」，不取消共享上游任务
 * - useEdge：启用 L2 Cache API（Worker/支持环境）；读 L1→L2→fetcher，写回 L1+L2
 */
export type WithCacheOptions = {
  signal?: AbortSignal;
  /** 启用边缘 Cache API 作为 L2；默认 false，保持纯内存行为 */
  useEdge?: boolean;
};
