import { QueryClient } from "@tanstack/react-query";

export class ApiQueryError extends Error {
  constructor(public readonly status: number) {
    super(`HTTP ${status}`);
  }
}

export async function fetchQueryJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new ApiQueryError(response.status);
  return response.json() as Promise<T>;
}

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,
        // SSR 依赖请求作用域回收，不创建跨请求存活的 GC 定时器。
        gcTime: typeof window === "undefined" ? Infinity : 30 * 60 * 1000,
        refetchOnWindowFocus: false,
        // 只读 GET 最多重试一次；不存在、无权限等确定性失败不重试。
        retry: (count, error) =>
          count < 1 &&
          (!(error instanceof ApiQueryError) || error.status === 429 || error.status >= 500),
      },
    },
  });
}
