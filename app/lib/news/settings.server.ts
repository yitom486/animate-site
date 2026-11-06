import type { NewsEnv } from "./db.server";
import type { NewsChannel } from "./config";

export type NewsSourceSecrets = {
  NEWS_ANIME_RSS_URL?: string;
  NEWS_EVENTS_RSS_URL?: string;
  NEWS_ANIME_RSS_URL_SECONDARY?: string;
  NEWS_EVENTS_RSS_URL_SECONDARY?: string;
  NEWS_ANIME_RSS_URLS?: string;
  NEWS_EVENTS_RSS_URLS?: string;
  NEWS_RSS_BEARER_TOKEN?: string;
};
export type NewsSyncEnv = NewsEnv & NewsSourceSecrets;

export class NewsSyncError extends Error {}

function parseHttpsUrl(value: string, label: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new NewsSyncError(`${label} 格式无效`);
  }
  if (url.protocol !== "https:" || url.username || url.password) {
    throw new NewsSyncError(`${label} 必须为无用户名和密码的 HTTPS 地址`);
  }
  return url.href;
}

function splitUrlList(raw: string | undefined) {
  if (!raw?.trim()) return [];
  return raw
    .split(/[\n,]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

/** Collect unique HTTPS feed URLs for a channel from primary / secondary / list secrets. */
export function newsSourceUrls(channel: NewsChannel, secrets: NewsSourceSecrets): string[] {
  const primaryKey = channel === "anime" ? "NEWS_ANIME_RSS_URL" : "NEWS_EVENTS_RSS_URL";
  const secondaryKey =
    channel === "anime" ? "NEWS_ANIME_RSS_URL_SECONDARY" : "NEWS_EVENTS_RSS_URL_SECONDARY";
  const listKey = channel === "anime" ? "NEWS_ANIME_RSS_URLS" : "NEWS_EVENTS_RSS_URLS";
  const candidates = [
    secrets[primaryKey]?.trim(),
    secrets[secondaryKey]?.trim(),
    ...splitUrlList(secrets[listKey]),
  ].filter((value): value is string => Boolean(value));

  if (!candidates.length) throw new NewsSyncError(`未配置 ${primaryKey} / ${listKey}`);

  const seen = new Set<string>();
  const urls: string[] = [];
  for (const candidate of candidates) {
    const href = parseHttpsUrl(candidate, primaryKey);
    if (seen.has(href)) continue;
    seen.add(href);
    urls.push(href);
  }
  return urls;
}

/** @deprecated Prefer newsSourceUrls; kept for single-URL call sites and clearer errors. */
export function newsSourceUrl(channel: NewsChannel, secrets: NewsSourceSecrets) {
  return newsSourceUrls(channel, secrets)[0]!;
}

export function newsChannelFromFeedId(id: string): NewsChannel | null {
  if (id === "anime" || id.startsWith("anime:")) return "anime";
  if (id === "events" || id.startsWith("events:")) return "events";
  return null;
}

export async function newsFeedSourceId(
  channel: NewsChannel,
  url: string,
  allUrls: string[],
): Promise<string> {
  if (allUrls.length === 1) return channel;
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(url));
  const hex = Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
  return `${channel}:${hex.slice(0, 16)}`;
}

export function newsSyncErrorMessage(error: unknown) {
  if (error instanceof NewsSyncError) return error.message;
  if (error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name))
    return "RSS 请求超时";
  // fetch / D1 的底层异常可能带完整地址、令牌或正文，不向日志和公开 API 透传。
  return "资讯同步失败，请检查服务端配置、网络或存储状态";
}
