import { bgmGet } from "./client.server";
import { BGM_API_ROUTES } from "./api-routes.server";
import { createCache, withCache } from "~/lib/cache";
import type { UpstreamRequestOptions } from "~/lib/upstream";
import { BGM_TIMEOUT_MS, CACHE_MAX_ENTRIES, CACHE_TTL_DETAIL_MS } from "./config.server";
import type { InfoboxItem } from "~/lib/anime-meta";
import type { CardExtra, CardExtraBatchResult, SubjectCollection } from "../types-card";

/** 单批最多 ID 数；与客户端批大小对齐 */
export const CARD_BATCH_MAX_IDS = 20;
/** 未命中缓存时，同时打 Bangumi 的上限 */
export const CARD_BATCH_UPSTREAM_CONCURRENCY = 4;

/** 详情接口里卡片需要的原始字段（/calendar 不返回，需单独取 /v0/subjects/{id}） */
type RawCardSubject = {
  name?: string;
  summary?: string;
  tags?: Array<{ name: string; count: number }>;
  infobox?: InfoboxItem[];
  collection?: SubjectCollection;
  meta_tags?: string[];
};

const cardExtraCache = createCache<CardExtra>({
  ttlMs: CACHE_TTL_DETAIL_MS,
  maxEntries: CACHE_MAX_ENTRIES.card,
});

/** 将 infobox 某一项的值拍平成字符串（值可能是字符串或 {v} 数组） */
function infoboxValue(infobox: InfoboxItem[] | undefined, ...keys: string[]): string {
  if (!infobox) return "";
  for (const key of keys) {
    const item = infobox.find((i) => i.key === key);
    if (!item) continue;
    const { value } = item;
    if (typeof value === "string") return value;
    if (Array.isArray(value)) {
      return value
        .map((v) => (typeof v === "string" ? v : v.v))
        .filter(Boolean)
        .join("、");
    }
  }
  return "";
}

function toCardExtra(raw: RawCardSubject): CardExtra {
  return {
    nameJa: raw.name ?? "",
    summary: raw.summary?.trim() ?? "",
    tags: (raw.tags ?? []).slice(0, 3).map((t) => t.name),
    metaTags: raw.meta_tags ?? [],
    collection: raw.collection ?? {},
    staff: {
      原作: infoboxValue(raw.infobox, "原作"),
      导演: infoboxValue(raw.infobox, "导演", "監督", "监督"),
      制作: infoboxValue(raw.infobox, "动画制作", "動畫制作", "製作", "动画制作公司"),
    },
  };
}

/** GET /v0/subjects/{id} — 仅取卡片增强字段，单次上游调用，带 LRU + single-flight */
export async function fetchCardExtra(
  id: string,
  options?: UpstreamRequestOptions,
): Promise<CardExtra> {
  return withCache(
    cardExtraCache,
    `card:${id}`,
    async () => {
      const raw = await bgmGet<RawCardSubject>(BGM_API_ROUTES.subjectDetail(id), undefined, {
        timeoutMs: options?.timeoutMs ?? BGM_TIMEOUT_MS.detail,
      });
      return toCardExtra(raw);
    },
    { signal: options?.signal, useEdge: true },
  );
}

async function mapPool<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  if (items.length === 0) return;
  const limit = Math.max(1, concurrency);
  let next = 0;

  async function run(): Promise<void> {
    while (next < items.length) {
      const index = next;
      next += 1;
      await worker(items[index]!);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => run()));
}

/**
 * 批量卡片增强：去重、截断后复用单卡缓存；未命中项限并发打上游。
 * Bangumi 无官方批量 subject 接口，故服务端聚合。
 */
export async function fetchCardExtrasBatch(
  rawIds: string[],
  options?: UpstreamRequestOptions,
): Promise<CardExtraBatchResult> {
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const raw of rawIds) {
    const id = raw.trim();
    if (!/^\d+$/.test(id) || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
    if (ids.length >= CARD_BATCH_MAX_IDS) break;
  }

  const dataById: Record<string, CardExtra> = {};
  const errorsById: Record<string, string> = {};

  await mapPool(ids, CARD_BATCH_UPSTREAM_CONCURRENCY, async (id) => {
    if (options?.signal?.aborted) {
      errorsById[id] = "aborted";
      return;
    }
    try {
      dataById[id] = await fetchCardExtra(id, options);
    } catch (error) {
      errorsById[id] = error instanceof Error ? error.message : "failed";
    }
  });

  return { dataById, errorsById };
}
