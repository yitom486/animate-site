import { bgmGet } from "./client";
import { BGM_API_ROUTES } from "./urls";
import { createCache } from "./cache";
import { CACHE_TTL_DETAIL_MS } from "./constants";
import type { InfoboxItem } from "~/lib/anime-meta";

/** Bangumi 收藏分布（想看 / 在看 / 看过 / 搁置 / 抛弃） */
export type SubjectCollection = {
  wish?: number;
  doing?: number;
  collect?: number;
  on_hold?: number;
  dropped?: number;
};

/** 详情接口里卡片需要的原始字段（/calendar 不返回，需单独取 /v0/subjects/{id}） */
type RawCardSubject = {
  name?: string;
  summary?: string;
  tags?: Array<{ name: string; count: number }>;
  infobox?: InfoboxItem[];
  collection?: SubjectCollection;
  meta_tags?: string[];
};

/** 卡片增强数据：补足日历接口缺失的简介 / staff / 收藏 / 元数据 */
export type CardExtra = {
  nameJa: string;
  summary: string;
  tags: string[];
  metaTags: string[];
  collection: SubjectCollection;
  staff: { 原作: string; 导演: string; 制作: string };
};

const cardExtraCache = createCache<CardExtra>(CACHE_TTL_DETAIL_MS);

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

/** GET /v0/subjects/{id} — 仅取卡片增强字段，单次上游调用，带服务端缓存 */
export async function fetchCardExtra(id: string): Promise<CardExtra> {
  const cacheKey = `card:${id}`;
  const cached = cardExtraCache.get(cacheKey);
  if (cached) return cached;

  const raw = await bgmGet<RawCardSubject>(BGM_API_ROUTES.subjectDetail(id));

  const extra: CardExtra = {
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

  cardExtraCache.set(cacheKey, extra);
  return extra;
}
