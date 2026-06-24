export type DownloadSource = "comicat" | "dmhy";

export type DownloadItem = {
  /** 归一化后的 info-hash（40 位小写 hex），跨源去重用 */
  hash: string;
  title: string;
  magnet: string;
  detailUrl: string;
  size?: string;
  resolution?: string;
  source: DownloadSource;
  /** 是否为合集 / 整季 / 区间打包 */
  isBatch: boolean;
};

export type GroupedDownloads = {
  batch: DownloadItem[];
  single: DownloadItem[];
  /** 去重后总数（可能多于分组里展示的条数） */
  total: number;
};

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/** base32(32 位) info-hash → hex(40 位)，用于和 hex 源跨源去重 */
function base32ToHex(s: string): string {
  let bits = "";
  for (const ch of s.toUpperCase()) {
    const v = B32.indexOf(ch);
    if (v < 0) return s.toLowerCase();
    bits += v.toString(2).padStart(5, "0");
  }
  let hex = "";
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    hex += parseInt(bits.slice(i, i + 8), 2).toString(16).padStart(2, "0");
  }
  return hex;
}

/** 统一 info-hash：hex 直接小写；base32 转 hex */
export function normalizeHash(btih: string): string {
  const s = btih.trim();
  if (/^[0-9a-fA-F]{40}$/.test(s)) return s.toLowerCase();
  if (/^[A-Z2-7]{32}$/i.test(s)) return base32ToHex(s);
  return s.toLowerCase();
}

/** 从磁力链接里取 info-hash */
export function btihFromMagnet(magnet: string): string | undefined {
  return magnet.match(/urn:btih:([^&]+)/i)?.[1];
}

export function magnetFromHash(hash: string): string {
  return `magnet:?xt=urn:btih:${hash}`;
}

export function parseResolution(title: string): string | undefined {
  return title.match(/\b(\d{3,4}[pP])\b/)?.[1]?.toUpperCase();
}

/** 合集判定：标题含「合集 / 全集 / 集数区间 / BD-BOX / 典藏版」等 */
const BATCH_RE =
  /合集|全集|全\d+\s*[话話集]|\[\s*\d{1,4}\s*[-~～]\s*\d{1,4}\s*\]|\d{1,4}\s*[-~～]\s*\d{1,4}\s*(?:话|話|集|fin|end|完)|BD-?BOX|典藏版|珍藏版|\bComplete\b|\bBatch\b/i;

export function classifyBatch(title: string): boolean {
  return BATCH_RE.test(title);
}
