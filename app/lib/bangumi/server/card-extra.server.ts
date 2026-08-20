import { bgmGet } from "./client.server";
import { BGM_API_ROUTES } from "./api-routes.server";
import { createCache, withCache } from "~/lib/cache";
import type { UpstreamRequestOptions } from "~/lib/upstream";
import { BGM_TIMEOUT_MS, CACHE_MAX_ENTRIES, CACHE_TTL_DETAIL_MS } from "./config.server";
import type { InfoboxItem } from "~/lib/anime-meta";
import type { CardExtra, SubjectCollection } from "../types-card";

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
    },
    { signal: options?.signal, useEdge: true },
  );
}
