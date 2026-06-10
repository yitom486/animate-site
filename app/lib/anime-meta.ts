export type InfoboxItem = {
  key: string;
  value: string | Array<string | { v: string }>;
};

export type AnimeCardData = {
  id: number;
  name: string;
  name_cn: string;
  date?: string;
  air_date?: string;
  platform?: string;
  images?: { large?: string; common?: string; grid?: string; medium?: string };
  rating?: { score: number; rank?: number; total?: number };
  tags?: Array<{ name: string; count: number }>;
  infobox?: InfoboxItem[];
};

/** v0 API 的 medium 带 /r/800/；Legacy calendar 的 medium(/m/) 实际只有 ~100px 级，需用 large */
function isV0Medium(url: string): boolean {
  return url.includes("/r/800/");
}

/** 强制将 HTTP 协议升级为 HTTPS，避免浏览器产生 307 重定向 */
export function toHttps(url?: string): string | undefined {
  if (!url) return undefined;
  return url.replace(/^http:\/\//, "https://");
}

/** 列表封面：优先 v0 medium；Legacy 日历接口则改用 large */
export function getCoverUrl(
  images?: AnimeCardData["images"],
): string | undefined {
  if (!images) return undefined;

  let url: string | undefined;
  if (images.medium && isV0Medium(images.medium)) {
    url = images.medium;
  } else if (images.large) {
    // /calendar 返回的 medium 很小，large 才是清晰封面
    url = images.large;
  } else {
    url = images.medium || images.common || images.grid;
  }

  return toHttps(url);
}

export function getYear(date?: string, airDate?: string): string {
  const d = date || airDate;
  return d ? d.slice(0, 4) : "";
}

export function getFirstTag(tags?: Array<{ name: string }>): string {
  return tags?.[0]?.name ?? "";
}

export function buildCardMeta(item: AnimeCardData) {
  const title = item.name_cn || item.name;
  const year = getYear(item.date, item.air_date);
  const platform = item.platform ?? "";
  const genre = getFirstTag(item.tags);
  const score = item.rating?.score;

  const subtitle = [year, platform, genre].filter(Boolean).join(" · ");

  return { title, subtitle, score };
}
