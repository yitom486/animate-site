/**
 * Shared cover-image policy for news cards, RSS ingest, and D1 writes.
 * Decorative site chrome (QR codes, templates, share icons, logos) is not a usable cover.
 */

/** Patterns kept in sync with migrations/0006_clear_decorative_news_covers.sql */
export const DECORATIVE_NEWS_IMAGE_LIKE = [
  "%/template/%",
  "%dean_nova%",
  "%/deancss/%",
  "%ewm.png%",
  "%/ewm.%",
  "%qrcode%",
  "%qr-code%",
  "%qr_code%",
  "%weibo.png%",
  "%weixin.png%",
  "%/share/%",
  "%/social/%",
  "%/icons/%",
  "%/icon/%",
  "%noimage%",
  "%no-image%",
  "%no_image%",
  "%placeholder%",
] as const;

const DECORATIVE_PATH_HINT =
  /\/template\/|dean_nova|\/deancss\/|(?:^|[\\/_-])ewm(?:[\\/_.-]|$)|(?:^|[\\/_-])(?:qr|qrcode|qr[_-]?code)(?:[\\/_.-]|$)|(?:^|[\\/_-])(?:no[_-]?image|noimage|placeholder|spacer|blank|1x1|pixel)(?:[\\/_.-]|$)|\/(?:share|social|icons?)\//i;

const SHARE_IMAGE_HINT =
  /facebook|twitter|x\.com|line\.me|hatena|googleplus|google\+?plus|linkedin|pinterest|reddit|whatsapp|telegram|weibo|weixin|share[_-]?button|sharer|bookmark|sns[_/-]|icon[_-]?share/i;

const DECORATIVE_FILENAME =
  /^(?:ewm|qr|qrcode|qr-code|qr_code|weibo|weixin|logo|icon|noimage|no-image|placeholder)(?:\.[a-z0-9]+)?$/i;

export function decorativeNewsImageSql(column: string): string {
  if (!/^[a-z_][a-z0-9_.]*$/i.test(column)) throw new Error("Invalid SQL column");
  return DECORATIVE_NEWS_IMAGE_LIKE.map((pattern) => `lower(${column}) LIKE '${pattern}'`).join(
    " OR ",
  );
}

export function hasDecorativeNewsImageHint(text: string): boolean {
  const value = text.trim();
  if (!value) return false;
  let name = value.split("/").pop() ?? value;
  try {
    name = decodeURIComponent(name);
  } catch {
    // keep raw filename
  }
  return (
    DECORATIVE_PATH_HINT.test(value) ||
    SHARE_IMAGE_HINT.test(value) ||
    DECORATIVE_FILENAME.test(name)
  );
}

export function isDecorativeNewsImageUrl(url: string): boolean {
  const src = url.trim();
  if (!src) return true;
  let pathname = src;
  try {
    pathname = new URL(src).pathname;
  } catch {
    // keep raw src for filename checks
  }
  return hasDecorativeNewsImageHint(`${src} ${pathname}`) || hasDecorativeNewsImageHint(pathname);
}

/** Return a https cover URL, or undefined when missing / decorative. */
export function usableNewsCoverUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;
  try {
    if (new URL(trimmed).protocol !== "https:") return undefined;
  } catch {
    return undefined;
  }
  if (isDecorativeNewsImageUrl(trimmed)) return undefined;
  return trimmed;
}
