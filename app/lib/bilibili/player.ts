/** 构建 B 站官方 iframe：必须用稿件 aid/bvid/cid，season_id 对 player.html 无效 */
export function buildBilibiliEmbedUrl(params: { aid: number; bvid: string; cid: number }): string {
  const url = new URL("https://player.bilibili.com/player.html");
  url.searchParams.set("isOutside", "true");
  url.searchParams.set("aid", String(params.aid));
  url.searchParams.set("bvid", params.bvid);
  url.searchParams.set("cid", String(params.cid));
  url.searchParams.set("p", "1");
  url.searchParams.set("autoplay", "0");
  url.searchParams.set("high_quality", "1");
  url.searchParams.set("danmaku", "0");
  return url.toString();
}

export function buildBilibiliBangumiUrl(seasonId: number): string {
  return `https://www.bilibili.com/bangumi/play/ss${seasonId}`;
}

export function buildBilibiliEpisodeUrl(epId: number): string {
  return `https://www.bilibili.com/bangumi/play/ep${epId}`;
}
