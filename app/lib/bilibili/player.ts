/** 番剧使用 OGV 参数，注意官方要求 camelCase，不能传 mediaId 或 season_id。 */
export function buildBilibiliEmbedUrl(params: { episodeId: number; seasonId?: number }): string {
  const url = new URL("https://player.bilibili.com/player.html");
  url.searchParams.set("episodeId", String(params.episodeId));
  if (params.seasonId) url.searchParams.set("seasonId", String(params.seasonId));
  url.searchParams.set("autoplay", "0");
  url.searchParams.set("danmaku", "0");
  return url.toString();
}

/** bangumi-data 的 B 站 ID 是 mediaId，不能假定它与 seasonId 相同。 */
export function parseBilibiliMediaId(value?: string): number | undefined {
  if (!value) return undefined;
  let digits = value;
  if (!/^\d+$/.test(digits)) {
    try {
      const url = new URL(value);
      if (url.protocol !== "https:" || url.hostname !== "www.bilibili.com") return undefined;
      const match = url.pathname.match(/^\/bangumi\/media\/md(\d+)\/?$/);
      if (!match) return undefined;
      digits = match[1];
    } catch {
      return undefined;
    }
  }
  const id = Number(digits);
  return Number.isSafeInteger(id) && id > 0 ? id : undefined;
}

export function buildBilibiliBangumiUrl(seasonId: number): string {
  return `https://www.bilibili.com/bangumi/play/ss${seasonId}`;
}

export function buildBilibiliEpisodeUrl(epId: number): string {
  return `https://www.bilibili.com/bangumi/play/ep${epId}`;
}
