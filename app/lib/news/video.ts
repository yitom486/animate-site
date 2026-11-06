const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com"]);
const VIDEO_ID = /^[a-zA-Z0-9_-]{11}$/;

/** 仅接受契约指定的两个官方来源，校验 URL 解析后的实际主机、路径和视频标识。 */
export function parseNewsIframeUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
    if (url.hostname === "www.youtube-nocookie.com") {
      const videoId = url.pathname.match(/^\/embed\/([^/]+)$/)?.[1];
      if (!videoId || !VIDEO_ID.test(videoId)) return null;
      return { platform: "YouTube", src: url.href };
    }
    if (url.hostname === "player.bilibili.com" && url.pathname === "/player.html") {
      const positiveId = (name: string) => {
        const raw = url.searchParams.get(name) ?? "";
        return /^\d+$/.test(raw) && Number.isSafeInteger(Number(raw)) && Number(raw) > 0;
      };
      const bvid = url.searchParams.get("bvid") ?? "";
      if (!/^BV[a-zA-Z0-9]{10}$/.test(bvid) && !positiveId("aid") && !positiveId("episodeId"))
        return null;
      return { platform: "B 站", src: url.href };
    }
    return null;
  } catch {
    return null;
  }
}

export function isNewsVideoLink(value: string) {
  try {
    const url = new URL(value);
    return (
      ["https:", "http:"].includes(url.protocol) &&
      !url.username &&
      !url.password &&
      (YOUTUBE_HOSTS.has(url.hostname) ||
        url.hostname === "www.youtube-nocookie.com" ||
        ["youtu.be", "bilibili.com", "www.bilibili.com", "b23.tv"].includes(url.hostname))
    );
  } catch {
    return false;
  }
}
