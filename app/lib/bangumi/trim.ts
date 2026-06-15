import type { AnimeCardData } from "~/lib/anime-meta";
import type { RawSubject } from "./types";

/** 只保留卡片所需字段，缩小传输体积（利于 HTML 嵌入与 KV 缓存） */
export function trimSubject(raw: RawSubject): AnimeCardData {
  return {
    id: raw.id,
    name: raw.name,
    name_cn: raw.name_cn,
    date: raw.date,
    air_date: raw.air_date,
    platform: raw.platform,
    images: raw.images
      ? {
          large: raw.images.large,
          common: raw.images.common,
          medium: raw.images.medium,
          grid: raw.images.grid,
        }
      : undefined,
    rating: raw.rating
      ? {
          score: raw.rating.score,
          rank: raw.rating.rank,
          total: raw.rating.total,
        }
      : undefined,
    tags: raw.tags?.slice(0, 1),
  };
}

export function trimSubjects(list: RawSubject[]): AnimeCardData[] {
  return list.map(trimSubject);
}
