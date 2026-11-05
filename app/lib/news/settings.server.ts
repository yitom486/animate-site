import type { NewsEnv } from "./db.server";
import type { NewsChannel } from "./config";

export type NewsSourceSecrets = {
  NEWS_ANIME_RSS_URL?: string;
  NEWS_EVENTS_RSS_URL?: string;
  NEWS_RSS_BEARER_TOKEN?: string;
};
export type NewsSyncEnv = NewsEnv & NewsSourceSecrets;

export class NewsSyncError extends Error {}

export function newsSourceUrl(channel: NewsChannel, secrets: NewsSourceSecrets) {
  const key = channel === "anime" ? "NEWS_ANIME_RSS_URL" : "NEWS_EVENTS_RSS_URL";
  const value = secrets[key]?.trim();
  if (!value) throw new NewsSyncError(`未配置 ${key}`);
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new NewsSyncError(`${key} 格式无效`);
  }
  if (url.protocol !== "https:" || url.username || url.password) {
    throw new NewsSyncError(`${key} 必须为无用户名和密码的 HTTPS 地址`);
  }
  return url.href;
}

export function newsSyncErrorMessage(error: unknown) {
  if (error instanceof NewsSyncError) return error.message;
  if (error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name))
    return "RSS 请求超时";
  // fetch / D1 的底层异常可能带完整地址、令牌或正文，不向日志和公开 API 透传。
  return "资讯同步失败，请检查服务端配置、网络或存储状态";
}
