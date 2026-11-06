import snapshot from "./catalog.json";
import { buildBilibiliBangumiUrl, buildBilibiliEmbedUrl, buildBilibiliEpisodeUrl } from "./player";
import type { BilibiliEpisode, BilibiliMatch } from "./types";

export type BilibiliCatalogEntry = {
  updatedAt: string;
  seasonId: number;
  title: string;
  episodes: Array<Pick<BilibiliEpisode, "epId" | "indexLabel" | "title" | "badge">>;
};

const catalog: Record<string, BilibiliCatalogEntry> = snapshot;

/** 发布时同步的公开分集元数据；读取不需要 Cloudflare 再访问 B 站 API。 */
export function readBilibiliCatalog(mediaId: number): BilibiliMatch | null {
  const entry = catalog[String(mediaId)];
  if (!entry?.episodes.length) return null;
  const episodes = entry.episodes.map((ep) => ({
    ...ep,
    pageUrl: buildBilibiliEpisodeUrl(ep.epId),
    embedUrl: buildBilibiliEmbedUrl({ episodeId: ep.epId, seasonId: entry.seasonId }),
  }));
  return {
    seasonId: entry.seasonId,
    title: entry.title,
    updatedAt: entry.updatedAt,
    seasonUrl: buildBilibiliBangumiUrl(entry.seasonId),
    pageUrl: episodes[0].pageUrl,
    episodes,
  };
}
