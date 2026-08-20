/** 上游 HTTP 请求选项：调用方取消 + 本地超时 */
export type UpstreamRequestOptions = {
  signal?: AbortSignal;
  timeoutMs?: number;
};

export type UpstreamErrorKind = "aborted" | "timeout" | "http" | "network" | "parse";

export class UpstreamError extends Error {
  readonly kind: UpstreamErrorKind;
  readonly upstream: string;
  readonly operation: string;
  readonly status?: number;

  constructor(params: {
    kind: UpstreamErrorKind;
    upstream: string;
    operation: string;
    message: string;
    status?: number;
    cause?: unknown;
  }) {
    super(params.message, { cause: params.cause });
    this.name = "UpstreamError";
    this.kind = params.kind;
    this.upstream = params.upstream;
    this.operation = params.operation;
    this.status = params.status;
  }
}

export function isUpstreamError(error: unknown): error is UpstreamError {
  return error instanceof UpstreamError;
}

export function isAbortLike(error: unknown): boolean {
  if (isUpstreamError(error) && (error.kind === "aborted" || error.kind === "timeout")) {
    return true;
  }
  if (error instanceof DOMException && error.name === "AbortError") return true;
  if (error instanceof Error && error.name === "AbortError") return true;
  return false;
}

function isTimeoutReason(reason: unknown): boolean {
  if (reason instanceof DOMException && reason.name === "TimeoutError") return true;
  if (typeof reason === "object" && reason !== null && "name" in reason) {
    return (reason as { name?: string }).name === "TimeoutError";
  }
  return false;
}

export function getAbortKind(signal?: AbortSignal, error?: unknown): "aborted" | "timeout" {
  const reason = signal?.reason ?? (error instanceof DOMException ? error : undefined);
  return isTimeoutReason(reason) ? "timeout" : "aborted";
}

type MergedSignal = {
  signal?: AbortSignal;
  cleanup: () => void;
};

/** 合并调用方 signal 与 timeout；无二者时返回 undefined signal */
export function mergeUpstreamSignal(options?: UpstreamRequestOptions): MergedSignal {
  const caller = options?.signal;
  const timeoutMs = options?.timeoutMs;

  if (!caller && !timeoutMs) {
    return { signal: undefined, cleanup: () => {} };
  }

  if (caller?.aborted) {
    const controller = new AbortController();
    controller.abort(caller.reason);
    return { signal: controller.signal, cleanup: () => {} };
  }

  if (
    timeoutMs &&
    caller &&
    typeof AbortSignal !== "undefined" &&
    "any" in AbortSignal &&
    typeof AbortSignal.any === "function" &&
    typeof AbortSignal.timeout === "function"
  ) {
    return {
      signal: AbortSignal.any([caller, AbortSignal.timeout(timeoutMs)]),
      cleanup: () => {},
    };
  }

  const controller = new AbortController();
  const cleanups: Array<() => void> = [];

  if (caller) {
    const onAbort = () => controller.abort(caller.reason);
    caller.addEventListener("abort", onAbort);
    cleanups.push(() => caller.removeEventListener("abort", onAbort));
  }

  if (timeoutMs) {
    const timer = setTimeout(() => {
      controller.abort(new DOMException("Upstream timeout", "TimeoutError"));
    }, timeoutMs);
    cleanups.push(() => clearTimeout(timer));
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      for (const fn of cleanups) fn();
    },
  };
}

/** 将 UpstreamError 转为路由层 Response；用户取消则原样抛出 */
export function throwRouteUpstreamError(error: unknown): never {
  if (isUpstreamError(error)) {
    if (error.kind === "aborted") throw error;
    if (error.kind === "timeout") {
      throw new Response("上游请求超时", { status: 504 });
    }
    if (error.kind === "http") {
      throw new Response(error.message, { status: error.status ?? 502 });
    }
    throw new Response(error.message, { status: 502 });
  }
  throw error;
}

/** 从 React Router request 提取上游 options */
export function upstreamFromRequest(request: Request): UpstreamRequestOptions {
  return { signal: request.signal };
}
