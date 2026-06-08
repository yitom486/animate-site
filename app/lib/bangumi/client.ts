import { BGM_LEGACY, BGM_USER_AGENT, BGM_V0 } from "./constants";

const JSON_HEADERS = {
  "User-Agent": BGM_USER_AGENT,
  Accept: "application/json",
} as const;

export function bgmHeaders(extra?: HeadersInit): HeadersInit {
  return { ...JSON_HEADERS, ...extra };
}

export async function bgmGet<T>(
  path: string,
  params?: Record<string, string | number | undefined>,
): Promise<T> {
  const url = new URL(path.startsWith("http") ? path : `${BGM_V0}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
    }
  }
  const res = await fetch(url.toString(), { headers: bgmHeaders() });
  if (!res.ok) {
    throw new Response(`Bangumi 请求失败: ${path}`, { status: res.status });
  }
  return res.json() as Promise<T>;
}

export async function bgmGetLegacy<T>(path: string): Promise<T> {
  const res = await fetch(`${BGM_LEGACY}${path}`, { headers: bgmHeaders() });
  if (!res.ok) {
    throw new Response(`Bangumi 请求失败: ${path}`, { status: res.status });
  }
  return res.json() as Promise<T>;
}

export async function bgmPost<T>(
  path: string,
  body: unknown,
  params?: Record<string, string | number | undefined>,
): Promise<T> {
  const url = new URL(`${BGM_V0}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
    }
  }
  const res = await fetch(url.toString(), {
    method: "POST",
    headers: {
      ...bgmHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Response(`Bangumi 请求失败: ${path}`, { status: res.status });
  }
  return res.json() as Promise<T>;
}
