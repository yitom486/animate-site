export type InfoboxItem = {
  key: string;
  value: string | Array<string | { v: string }>;
};

export type AnimeCardData = {
  id: number;
  name: string;
  name_cn: string;
  type?: number;
  date?: string;
  air_date?: string;
  platform?: string;
  images?: {
    large?: string;
    common?: string;
    grid?: string;
    medium?: string;
    small?: string;
  };
  rating?: { score: number; rank?: number; total?: number };
  tags?: Array<{ name: string; count: number }>;
  infobox?: InfoboxItem[];
};

export type CoverSources = {
  /** 无 srcset 支持时的回退；列表默认偏 common（400） */
  src: string;
  srcSet?: string;
};

/** 列表首屏高优先级封面数量（eager + fetchPriority=high） */
export const COVER_PRIORITY_COUNT = 2;

/**
 * 普通网格卡片 sizes：与 layout `grid-cols-2 … 2xl:grid-cols-7` 对齐的近似 CSS 宽度。
 * 浏览器据此从 srcset 选档，避免手机两列仍下 /r/800/。
 */
export const COVER_SIZES_GRID =
  "(max-width: 640px) 45vw, (max-width: 768px) 30vw, (max-width: 1024px) 22vw, (max-width: 1280px) 18vw, (max-width: 1536px) 14vw, 12vw";

/** 日历大卡片封面：移动端较宽，桌面约 sm:w-28 / md:w-32 */
export const COVER_SIZES_SCHEDULE = "(max-width: 640px) 40vw, 8rem";

/** 已验证：lain.bgm.tv 对 /pic/cover/l/ 支持 /r/{200,400,800}/ 宽度变体（2026-08 实测） */
const COVER_SRCSET_WIDTHS = [200, 400, 800] as const;

/** v0 API 的 medium 带 /r/800/；Legacy calendar 的 medium(/m/) 实际只有 ~100px 级，需用 large */
function isV0Medium(url: string): boolean {
  return url.includes("/r/800/");
}

/** 强制将 HTTP 协议升级为 HTTPS，避免浏览器产生 307 重定向 */
export function toHttps(url?: string): string | undefined {
  if (!url) return undefined;
  return url.replace(/^http:\/\//, "https://");
}

/**
 * 从 lain.bgm.tv 封面 URL 提取 `pic/cover/l/...` 路径。
 * 仅 large（/l/）可套 /r/N/；/c/ /m/ 等变体不可靠，不推导。
 */
function extractLainLargePath(url: string): string | null {
  const https = toHttps(url);
  if (!https) return null;
  try {
    const { hostname, pathname } = new URL(https);
    if (hostname !== "lain.bgm.tv") return null;
    const match = pathname.match(/^(?:\/r\/\d+)?\/(pic\/cover\/l\/.+)$/i);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

function lainResizeUrl(largePath: string, width: number): string {
  return `https://lain.bgm.tv/r/${width}/${largePath}`;
}

/** 列表封面：优先 v0 medium；Legacy 日历接口则改用 large */
export function getCoverUrl(images?: AnimeCardData["images"]): string | undefined {
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

/**
 * 列表/日历封面：在可验证的 lain `/r/N/` 规则下提供 srcset。
 * 默认 src 用 400 档，减少无 srcset 浏览器的过度下载。
 */
export function getCoverSources(images?: AnimeCardData["images"]): CoverSources | undefined {
  const fallback = getCoverUrl(images);
  if (!fallback) return undefined;

  const pathCandidates = [
    images?.large,
    images?.medium,
    images?.common,
    images?.small,
    images?.grid,
    fallback,
  ];

  let largePath: string | null = null;
  for (const candidate of pathCandidates) {
    if (!candidate) continue;
    largePath = extractLainLargePath(candidate);
    if (largePath) break;
  }

  if (!largePath) {
    return { src: fallback };
  }

  const srcSet = COVER_SRCSET_WIDTHS.map((w) => `${lainResizeUrl(largePath, w)} ${w}w`).join(", ");
  return {
    src: lainResizeUrl(largePath, 400),
    srcSet,
  };
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
  const ratingTotal = item.rating?.total;

  const subtitle = [year, platform, genre].filter(Boolean).join(" · ");

  return { title, subtitle, score, ratingTotal };
}
