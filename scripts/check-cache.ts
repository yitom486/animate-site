import assert from "node:assert/strict";
import {
  createCache,
  withCache,
  publicCacheHeaders,
  calendarCacheHeaders,
  listHttpCacheHeaders,
  HTTP_CACHE,
  type CacheStatus,
} from "../app/lib/cache";
import { listCacheKey, parseListQuery } from "../app/lib/bangumi/params";
import {
  getBangumiWeekdayId,
  msUntilNextShanghaiMidnight,
  shanghaiDateKey,
} from "../app/lib/bangumi/calendar-utils";

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

// 模拟另一个 Worker isolate 共享的边缘存储，不访问网络。
const entries = new Map<string, Response>();
let beforePut: (() => Promise<void>) | undefined;
const originalCaches = Object.getOwnPropertyDescriptor(globalThis, "caches");
Object.defineProperty(globalThis, "caches", {
  configurable: true,
  value: {
    open: async () => ({
      match: async (request: Request) => entries.get(request.url)?.clone(),
      put: async (request: Request, response: Response) => {
        await beforePut?.();
        entries.set(request.url, response.clone());
      },
    }),
  },
});

try {
  for (const value of [false, 0, ""]) {
    const cache = createCache<unknown>();
    cache.set("falsy", value);
    let status: CacheStatus | undefined;
    assert.equal(
      await withCache(
        cache,
        "falsy",
        async () => {
          throw new Error("cache miss");
        },
        {
          onStatus: (next) => {
            status = next;
          },
        },
      ),
      value,
    );
    assert.equal(status, "L1_HIT");
  }
  const expired = createCache<number>({ ttlMs: 0 });
  expired.set("expired", 1);
  assert.equal(expired.get("expired"), null);

  const lru = createCache<number>({ maxEntries: 2 });
  lru.set("a", 1);
  lru.set("b", 2);
  assert.equal(lru.get("a"), 1);
  lru.set("c", 3);
  assert.equal(lru.get("b"), null);
  assert.equal(lru.get("a"), 1);
  assert.equal(lru.get("c"), 3);

  const retry = createCache<number>();
  await assert.rejects(
    withCache(retry, "retry", () => {
      throw new Error("sync failure");
    }),
  );
  assert.equal(await withCache(retry, "retry", async () => 2), 2);

  const sharedCache = createCache<number>();
  const gate = deferred();
  let fetches = 0;
  const statuses: CacheStatus[] = [];
  const fetcher = async () => {
    fetches++;
    await gate.promise;
    return 42;
  };
  const requests = Array.from({ length: 10 }, () =>
    withCache(sharedCache, "shared", fetcher, {
      onStatus: (status) => statuses.push(status),
    }),
  );
  await Promise.resolve();
  assert.equal(fetches, 1);
  gate.resolve();
  assert.deepEqual(await Promise.all(requests), Array(10).fill(42));
  assert.equal(statuses.filter((status) => status === "MISS").length, 1);
  assert.equal(statuses.filter((status) => status === "COALESCED").length, 9);

  const caller = new AbortController();
  const survivor = createCache<number>();
  const upstream = deferred();
  const sharedFetch = async () => {
    await upstream.promise;
    return 7;
  };
  const cancelled = withCache(survivor, "cancel", sharedFetch, { signal: caller.signal });
  const kept = withCache(survivor, "cancel", sharedFetch);
  caller.abort();
  await assert.rejects(cancelled);
  upstream.resolve();
  assert.equal(await kept, 7);

  const putStarted = deferred();
  const finishPut = deferred();
  beforePut = async () => {
    putStarted.resolve();
    await finishPut.promise;
  };
  let settled = false;
  const first = withCache(createCache<{ id: number }>(), "edge-write", async () => ({ id: 1 }), {
    useEdge: true,
  });
  void first.then(() => {
    settled = true;
  });
  await putStarted.promise;
  assert.equal(settled, false, "Worker response must wait for edge write");
  finishPut.resolve();
  await first;
  beforePut = undefined;
  let edgeStatus: CacheStatus | undefined;
  assert.deepEqual(
    await withCache(
      createCache<{ id: number }>(),
      "edge-write",
      async () => {
        throw new Error("new isolate should hit L2");
      },
      {
        useEdge: true,
        onStatus: (status) => {
          edgeStatus = status;
        },
      },
    ),
    { id: 1 },
  );
  assert.equal(edgeStatus, "L2_HIT");

  beforePut = async () => {
    throw new Error("edge temporarily unavailable");
  };
  assert.equal(
    await withCache(createCache<number>(), "failed-write", async () => 9, { useEdge: true }),
    9,
  );
  beforePut = undefined;

  const key = (params: Record<string, string>) => listCacheKey(new URLSearchParams(params));
  assert.equal(
    key({ view: "search", q: "  test  ", type: "2" }),
    key({ type: "2", q: "test", view: "search", page: "1", utm_source: "ignored" }),
  );
  assert.notEqual(
    key({ view: "search", tag: "a&q=b", q: "c" }),
    key({ view: "search", tag: "a", q: "b&q=c" }),
  );
  assert.notEqual(key({ view: "search", q: "a" }), key({ view: "search", q: "b" }));
  assert.notEqual(key({ sort: "rank", page: "1" }), key({ sort: "rank", page: "2" }));
  assert.ok(key({ view: "calendar" }).includes("list:v4:"));
  assert.equal(parseListQuery(new URLSearchParams("page=Infinity")).page, 1);
  assert.equal(parseListQuery(new URLSearchParams("page=2.8")).page, 2);
  assert.equal(
    new Headers(publicCacheHeaders(HTTP_CACHE.card, "L2_HIT")).get("X-App-Cache"),
    "L2_HIT",
  );

  // 验证公开 API 能把实际数据缓存层级传到 HTTP 响应，而非固定写一个 HIT。
  const originalFetch = globalThis.fetch;
  let upstreamCalls = 0;
  globalThis.fetch = (async () => {
    upstreamCalls++;
    return Response.json({
      type: 2,
      name: "fixture",
      summary: "fixture",
      tags: [],
      infobox: [],
      collection: {},
    });
  }) as typeof fetch;
  try {
    const { loader } = await import("../app/routes/api/anime.card.$id");
    const args = {
      params: { id: "999999999" },
      request: new Request("https://example.test/api/anime/card/999999999"),
      url: new URL("https://example.test/api/anime/card/999999999"),
      pattern: "/api/anime/card/:id",
      context: {},
    };
    const cold = await loader(args);
    const warm = await loader(args);
    assert.equal(new Headers(cold.init?.headers).get("X-App-Cache"), "MISS");
    assert.equal(new Headers(warm.init?.headers).get("X-App-Cache"), "L1_HIT");
    assert.equal(upstreamCalls, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
  // Asia/Shanghai：放送日键与午夜 TTL，避免 Worker UTC 串日。
  assert.match(shanghaiDateKey(), /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(getBangumiWeekdayId() >= 1 && getBangumiWeekdayId() <= 7);
  assert.ok(msUntilNextShanghaiMidnight() > 0);
  assert.ok(msUntilNextShanghaiMidnight() <= 24 * 60 * 60 * 1000);
  const calHeaders = new Headers(calendarCacheHeaders());
  const calCc = calHeaders.get("Cache-Control") ?? "";
  assert.match(calCc, /s-maxage=\d+/);
  assert.ok(
    Number((/s-maxage=(\d+)/.exec(calCc) ?? [])[1]) <= (HTTP_CACHE.calendar.sMaxAge ?? 600),
  );
  assert.match(
    new Headers(listHttpCacheHeaders(new URLSearchParams("sort=rank"))).get("Cache-Control") ?? "",
    /s-maxage=900/,
  );

  console.log(
    "缓存检查通过：LRU/TTL、并发合并、失败重试、取消隔离、边缘写入等待、跨 isolate L2 命中、缓存键与 API 诊断头。",
  );
} finally {
  if (originalCaches) Object.defineProperty(globalThis, "caches", originalCaches);
  else Reflect.deleteProperty(globalThis, "caches");
}
