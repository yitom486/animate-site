import type { Route } from "./+types/img";
import { createCache } from "~/lib/cache";

const ALLOWED_HOSTS = new Set(["lain.bgm.tv", "bgm.tv", "lain.chii.in", "chii.in"]);

function isAllowedHost(hostname: string): boolean {
  return (
    ALLOWED_HOSTS.has(hostname) || hostname.endsWith(".bgm.tv") || hostname.endsWith(".chii.in")
  );
}

type CachedImage = {
  body: ArrayBuffer;
  contentType: string;
};

// 1. 进程内内存 LRU 缓存（L1 缓存）：在本地开发与 Worker Isolate 内提供 0ms 响应，避免频繁穿透到 Bangumi 源站
const imgMemoryCache = createCache<CachedImage>({
  ttlMs: 24 * 60 * 60 * 1000, // 24 小时
  maxEntries: 400,
});

// 2. 并发请求合并：多个卡片并发请求相同图片时共享同一个 upstream promise，防止突发流量触发源站断开
const inFlightFetches = new Map<string, Promise<CachedImage>>();

/**
 * 带有重试与超时的上游图片抓取
 * 处理上游 Bangumi CDN 的偶尔瞬时 TLS 断开（SSL unexpected eof）与抖动超时
 */
async function fetchImageWithRetry(
  url: string,
  maxRetries = 2,
): Promise<{ buffer: ArrayBuffer; contentType: string }> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          Referer: "https://bgm.tv/",
          Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        },
        signal: AbortSignal.timeout(8000),
      });

      if (res.ok) {
        const buffer = await res.arrayBuffer();
        const contentType = res.headers.get("content-type") || "image/jpeg";
        return { buffer, contentType };
      }

      // 若源站明确返回 404 或 403，说明图片不存在或已删除，不再无谓重试
      if (res.status === 404 || res.status === 403) {
        throw new Error(`Upstream returned ${res.status}`);
      }

      throw new Error(`Upstream HTTP ${res.status}: ${res.statusText}`);
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        // 短暂退避后重试，平滑瞬时网络抖动
        await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
      }
    }
  }

  throw lastError;
}

/**
 * Bangumi 资源图片边缘反向代理
 * - 解决国内直连 lain.bgm.tv 被阻断（SNI 重置/无法连接）的问题
 * - 进程内 L1 LRU 缓存 + 并发合并 + 自动容错重试
 * - Cloudflare 边缘 CDN 缓存（L2 caches.default）
 * - 仅白名单放行 Bangumi 静态资源域名，防止被当成开放代理滥用
 */
export async function loader({ request }: Route.LoaderArgs) {
  const reqUrl = new URL(request.url);
  const target = reqUrl.searchParams.get("url");

  if (!target) {
    return new Response("Missing url param", { status: 400 });
  }

  let targetParsed: URL;
  try {
    targetParsed = new URL(target);
  } catch {
    return new Response("Invalid target URL", { status: 400 });
  }

  if (!isAllowedHost(targetParsed.hostname)) {
    return new Response("Forbidden target host", { status: 403 });
  }

  const targetStr = targetParsed.toString();

  // 1. 尝试从内存 L1 缓存中直出
  const memCached = imgMemoryCache.get(targetStr);
  if (memCached) {
    return new Response(memCached.body, {
      status: 200,
      headers: {
        "Content-Type": memCached.contentType,
        "Cache-Control": "public, max-age=2592000, s-maxage=31536000, immutable",
        "Access-Control-Allow-Origin": "*",
        "X-Content-Type-Options": "nosniff",
        "X-Img-Cache": "MEM_HIT",
      },
    });
  }

  // 2. 尝试从 Cloudflare 边缘缓存（L2）读取
  const cacheStorage =
    typeof caches === "undefined" ? undefined : (caches as CacheStorage & { default?: Cache });
  const cfCache = cacheStorage?.default ?? null;
  if (cfCache) {
    try {
      const cached = await cfCache.match(request);
      if (cached) {
        return cached;
      }
    } catch {
      // 忽略边缘缓存异常降级穿透
    }
  }

  // 3. 并发合并与上游拉取（带自动重试）
  let fetchPromise = inFlightFetches.get(targetStr);
  if (!fetchPromise) {
    fetchPromise = (async () => {
      const { buffer, contentType } = await fetchImageWithRetry(targetStr, 2);
      const cachedData: CachedImage = {
        body: buffer,
        contentType,
      };
      imgMemoryCache.set(targetStr, cachedData);
      return cachedData;
    })();

    inFlightFetches.set(targetStr, fetchPromise);
  }

  try {
    const { body, contentType } = await fetchPromise;

    const headers = new Headers();
    headers.set("Content-Type", contentType);
    headers.set("Cache-Control", "public, max-age=2592000, s-maxage=31536000, immutable");
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Content-Length", String(body.byteLength));
    headers.set("X-Img-Cache", "MISS");

    const response = new Response(body, {
      status: 200,
      headers,
    });

    // 写入 Cloudflare 边缘缓存
    if (cfCache) {
      try {
        const responseToCache = response.clone();
        await cfCache.put(request, responseToCache);
      } catch {
        // 忽略写入缓存失败
      }
    }

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Fetch error";
    return new Response(`Failed to fetch upstream image: ${message}`, { status: 504 });
  } finally {
    inFlightFetches.delete(targetStr);
  }
}
