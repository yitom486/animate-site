import { BGM_LEGACY, BGM_NEXT, BGM_USER_AGENT, BGM_V0 } from "./config.server";
import {
  getAbortKind,
  isUpstreamError,
  mergeUpstreamSignal,
  UpstreamError,
  type UpstreamRequestOptions,
} from "~/lib/upstream";

const JSON_HEADERS = {
  "User-Agent": BGM_USER_AGENT,
  Accept: "application/json",
} as const;

const BGM_UPSTREAM = "bangumi";

export function bgmHeaders(extra?: HeadersInit): HeadersInit {
  return { ...JSON_HEADERS, ...extra };
}

type FetchContext = {
  operation: string;
  path: string;
  options?: UpstreamRequestOptions;
};

async function bgmFetch(url: string, init: RequestInit, ctx: FetchContext): Promise<Response> {
  const { signal, cleanup } = mergeUpstreamSignal(ctx.options);
  try {
    const res = await fetch(url, { ...init, signal, headers: bgmHeaders(init.headers) });
    if (!res.ok) {
      throw new UpstreamError({
        kind: "http",
        upstream: BGM_UPSTREAM,
        operation: ctx.operation,
        message: `Bangumi 请求失败: ${ctx.path}`,
        status: res.status,
      });
    }
    return res;
  } catch (error) {
    if (isUpstreamError(error)) throw error;
    if (signal?.aborted || (error instanceof Error && error.name === "AbortError")) {
      throw new UpstreamError({
        kind: getAbortKind(signal, error),
        upstream: BGM_UPSTREAM,
        operation: ctx.operation,
        message: `Bangumi 请求已取消: ${ctx.path}`,
        cause: error,
      });
    }
    throw new UpstreamError({
      kind: "network",
      upstream: BGM_UPSTREAM,
      operation: ctx.operation,
      message: `Bangumi 网络错误: ${ctx.path}`,
      cause: error,
    });
  } finally {
    cleanup();
  }
}

async function bgmJson<T>(url: string, init: RequestInit, ctx: FetchContext): Promise<T> {
  const res = await bgmFetch(url, init, ctx);
  try {
    return (await res.json()) as T;
  } catch (error) {
    if (isUpstreamError(error)) throw error;
    throw new UpstreamError({
      kind: "parse",
      upstream: BGM_UPSTREAM,
      operation: ctx.operation,
      message: `Bangumi 响应解析失败: ${ctx.path}`,
      cause: error,
    });
  }
}

export async function bgmGet<T>(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
  options?: UpstreamRequestOptions,
): Promise<T> {
  const url = new URL(path.startsWith("http") ? path : `${BGM_V0}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== "" && v !== false) url.searchParams.set(k, String(v));
    }
  }
  return bgmJson<T>(url.toString(), {}, { operation: "bgmGet", path, options });
}

export async function bgmGetLegacy<T>(path: string, options?: UpstreamRequestOptions): Promise<T> {
  return bgmJson<T>(`${BGM_LEGACY}${path}`, {}, { operation: "bgmGetLegacy", path, options });
}

/** 新版前端 p1 接口（next.bgm.tv）：吐槽 / 评论等 */
export async function bgmGetNext<T>(
  path: string,
  params?: Record<string, string | number | undefined>,
  options?: UpstreamRequestOptions,
): Promise<T> {
  const url = new URL(`${BGM_NEXT}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
    }
  }
  return bgmJson<T>(url.toString(), {}, { operation: "bgmGetNext", path, options });
}

export async function bgmPost<T>(
  path: string,
  body: unknown,
  params?: Record<string, string | number | undefined>,
  options?: UpstreamRequestOptions,
): Promise<T> {
  const url = new URL(`${BGM_V0}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
    }
  }
  return bgmJson<T>(
    url.toString(),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    { operation: "bgmPost", path, options },
  );
}
