/**
 * L2：Cloudflare / Worker Cache API。
 * 由 memory.withCache 在 useEdge: true 时调用，不对外导出，避免与 HTTP Cache-Control 混用。
 */
const EDGE_CACHE_NAME = "yhang-l2-v1";

function edgeRequest(key: string): Request {
  return new Request(`https://cache.internal/l2/${encodeURIComponent(key)}`);
}

function canUseEdge(): boolean {
  return typeof caches !== "undefined" && typeof caches.open === "function";
}

/** L2：从 Cache API 读；不支持或失败时返回 null */
export async function edgeGet<T>(key: string): Promise<T | null> {
  if (!canUseEdge()) return null;
  try {
    const store = await caches.open(EDGE_CACHE_NAME);
    const res = await store.match(edgeRequest(key));
    if (!res?.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/** L2：写入 Cache API；ttl 用 Cache-Control max-age */
export async function edgeSet<T>(key: string, data: T, ttlSeconds: number): Promise<void> {
  if (!canUseEdge() || ttlSeconds <= 0) return;
  try {
    const store = await caches.open(EDGE_CACHE_NAME);
    const res = new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": `max-age=${Math.floor(ttlSeconds)}`,
      },
    });
    await store.put(edgeRequest(key), res);
  } catch {
    // 边缘层失败不影响主路径
  }
}
