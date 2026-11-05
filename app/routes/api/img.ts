import type { Route } from "./+types/img";

const ALLOWED_HOSTS = new Set(["lain.bgm.tv", "bgm.tv", "lain.chii.in", "chii.in"]);

function isAllowedHost(hostname: string): boolean {
  return (
    ALLOWED_HOSTS.has(hostname) || hostname.endsWith(".bgm.tv") || hostname.endsWith(".chii.in")
  );
}

/**
 * Bangumi 资源图片边缘反向代理
 * - 解决国内直连 lain.bgm.tv 被阻断（SNI 重置/无法连接）的问题
 * - 利用 Cloudflare Edge Cache（caches.default）实现数据中心内缓存复用
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

  // 1. 尝试从 Cloudflare 边缘缓存中读取
  const cacheStorage =
    typeof caches === "undefined" ? undefined : (caches as CacheStorage & { default?: Cache });
  const cache = cacheStorage?.default ?? null;
  if (cache) {
    try {
      const cached = await cache.match(request);
      if (cached) {
        return cached;
      }
    } catch {
      // 边缘缓存读取异常时降级穿透
    }
  }

  // 2. 未命中时，由海外 Worker 边缘向 Bangumi 源站发起请求
  try {
    const upstream = await fetch(targetParsed.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Referer: "https://bgm.tv/",
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!upstream.ok) {
      return new Response(`Upstream error: ${upstream.status} ${upstream.statusText}`, {
        status: upstream.status,
      });
    }

    const bodyBuffer = await upstream.arrayBuffer();

    const headers = new Headers();
    const contentType = upstream.headers.get("content-type") || "image/jpeg";
    headers.set("Content-Type", contentType);
    // 浏览器端缓存 30 天，Cloudflare 边缘 CDN 缓存 1 年，标记不可变（图片永不修改）
    headers.set("Cache-Control", "public, max-age=2592000, s-maxage=31536000, immutable");
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Content-Length", String(bodyBuffer.byteLength));

    const response = new Response(bodyBuffer, {
      status: 200,
      headers,
    });

    // 3. 等待写入完成，避免 Worker 响应结束后悬空任务被取消
    if (cache) {
      try {
        const responseToCache = response.clone();
        await cache.put(request, responseToCache);
      } catch {
        // 忽略写入缓存失败
      }
    }

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Fetch error";
    return new Response(`Failed to fetch upstream image: ${message}`, { status: 504 });
  }
}
