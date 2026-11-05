export const NEWS_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
export const NEWS_FEEDS = [
  {
    id: "anime",
    label: "日本动漫资讯",
    url: "https://tomy.wutsuu0577.sbs/feeds/anime.xml",
    intervalMs: 15 * 60 * 1000,
  },
  {
    id: "events",
    label: "国内漫展资讯",
    url: "https://tomy.wutsuu0577.sbs/feeds/events.xml",
    intervalMs: 60 * 60 * 1000,
  },
] as const;

export type NewsChannel = (typeof NEWS_FEEDS)[number]["id"];

export function parseNewsChannel(value: string | null): NewsChannel | undefined {
  return value === "anime" || value === "events" ? value : undefined;
}

export function newsListHref(channel?: NewsChannel, page = 1) {
  const query = new URLSearchParams();
  if (channel) query.set("channel", channel);
  if (page > 1) query.set("page", String(page));
  return `/news${query.size ? `?${query}` : ""}`;
}

export function formatNewsDate(iso?: string) {
  if (!iso || !Number.isFinite(Date.parse(iso))) return "";
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}
