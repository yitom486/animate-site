/** 构建 B 站官方 iframe 播放器地址 */
export function buildBilibiliEmbedUrl(seasonId: number): string {
  const url = new URL("https://player.bilibili.com/player.html");
  url.searchParams.set("season_id", String(seasonId));
  url.searchParams.set("autoplay", "0");
  url.searchParams.set("high_quality", "1");
  url.searchParams.set("danmaku", "0");
  return url.toString();
}

export function buildBilibiliBangumiUrl(seasonId: number): string {
  return `https://www.bilibili.com/bangumi/play/ss${seasonId}`;
}
