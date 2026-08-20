import { createCache, withCache } from "~/lib/cache";
import { CACHE_MAX_ENTRIES, CACHE_TTL_DETAIL_MS } from "~/lib/bangumi/constants";
import type { CardExtra, CardExtraBatchResult } from "~/lib/bangumi/types-card";

/** 与服务端 CARD_BATCH_MAX_IDS 对齐 */
const BATCH_MAX_IDS = 20;
/** 短窗口合并同屏多卡请求 */
const BATCH_WINDOW_MS = 40;

const clientCache = createCache<CardExtra>({
  ttlMs: CACHE_TTL_DETAIL_MS,
  maxEntries: CACHE_MAX_ENTRIES.card,
});

type Waiter = {
  resolve: (value: CardExtra) => void;
  reject: (reason?: unknown) => void;
};

const pending = new Map<number, Waiter[]>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function cacheKey(id: number): string {
  return `card:${id}`;
}

/** 单卡回退（批量失败或单测用） */
async function fetchOneCard(id: number): Promise<CardExtra> {
  return withCache(clientCache, cacheKey(id), async () => {
    const res = await fetch(`/api/anime/card/${id}`);
    if (!res.ok) throw new Error(`card ${id} failed: ${res.status}`);
    return res.json() as Promise<CardExtra>;
  });
}

async function flushBatch(): Promise<void> {
  flushTimer = null;
  if (pending.size === 0) return;

  const batchIds = [...pending.keys()].slice(0, BATCH_MAX_IDS);
  const waitersById = new Map<number, Waiter[]>();
  for (const id of batchIds) {
    waitersById.set(id, pending.get(id) ?? []);
    pending.delete(id);
  }
  if (pending.size > 0) {
    flushTimer = setTimeout(() => {
      void flushBatch();
    }, BATCH_WINDOW_MS);
  }

  const needNetwork = batchIds.filter((id) => !clientCache.get(cacheKey(id)));

  const settle = (id: number, data: CardExtra | null, error?: unknown) => {
    const waiters = waitersById.get(id) ?? [];
    if (data) {
      for (const w of waiters) w.resolve(data);
    } else {
      for (const w of waiters) w.reject(error ?? new Error(`card ${id} missing`));
    }
  };

  // 窗口内已命中缓存的直接解决
  for (const id of batchIds) {
    if (needNetwork.includes(id)) continue;
    const hit = clientCache.get(cacheKey(id));
    if (hit) settle(id, hit);
  }

  if (needNetwork.length === 0) return;

  if (needNetwork.length === 1) {
    const id = needNetwork[0]!;
    try {
      settle(id, await fetchOneCard(id));
    } catch (error) {
      settle(id, null, error);
    }
    return;
  }

  try {
    const res = await fetch(`/api/anime/cards?ids=${needNetwork.join(",")}`);
    if (!res.ok) throw new Error(`cards batch failed: ${res.status}`);
    const payload = (await res.json()) as CardExtraBatchResult;

    for (const id of needNetwork) {
      const key = String(id);
      const row = payload.dataById[key];
      if (row) {
        clientCache.set(cacheKey(id), row);
        settle(id, row);
        continue;
      }
      // 单项失败：回退单卡一次
      try {
        settle(id, await fetchOneCard(id));
      } catch (error) {
        settle(id, null, error ?? payload.errorsById[key]);
      }
    }
  } catch {
    // 整批失败：逐个回退
    await Promise.all(
      needNetwork.map(async (id) => {
        try {
          settle(id, await fetchOneCard(id));
        } catch (error) {
          settle(id, null, error);
        }
      }),
    );
  }
}

/**
 * 请求卡片增强：短窗口合并为批量 API，带客户端缓存。
 * 同 id 多次订阅会并入同一批 waiter。
 */
export function requestCardExtra(id: number): Promise<CardExtra> {
  const hit = clientCache.get(cacheKey(id));
  if (hit) return Promise.resolve(hit);

  return new Promise<CardExtra>((resolve, reject) => {
    const list = pending.get(id) ?? [];
    list.push({ resolve, reject });
    pending.set(id, list);
    if (!flushTimer) {
      flushTimer = setTimeout(() => {
        void flushBatch();
      }, BATCH_WINDOW_MS);
    }
  });
}

export function peekCardExtra(id: number): CardExtra | null {
  return clientCache.get(cacheKey(id));
}
