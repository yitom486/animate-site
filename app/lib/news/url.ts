/** Normalize article / feed URLs for cross-feed dedupe. Keeps hash (漫展聚合站依赖 fragment). */
export function normalizeSourceUrl(value: string): string {
  const url = new URL(value);
  url.username = "";
  url.password = "";
  url.hostname = url.hostname.toLowerCase();
  if (
    (url.protocol === "https:" && url.port === "443") ||
    (url.protocol === "http:" && url.port === "80")
  ) {
    url.port = "";
  }
  if (url.pathname.length > 1) {
    url.pathname = url.pathname.replace(/\/+$/, "");
  }
  return url.href;
}
