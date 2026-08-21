import type { BangumiDataSiteId } from "./types";

export type SiteMeta = {
  id: BangumiDataSiteId | string;
  name: string;
  category: "domestic" | "hktw" | "overseas" | "download" | "db";
  badge: string;
  themeColor: {
    bg: string;
    text: string;
    border: string;
    hover: string;
  };
  buildUrl: (id: string) => string;
};

export const SITE_METAS: Record<string, SiteMeta> = {
  bilibili: {
    id: "bilibili",
    name: "哔哩哔哩 (大陆)",
    category: "domestic",
    badge: "B站",
    themeColor: {
      bg: "bg-pink-50",
      text: "text-pink-700",
      border: "border-pink-200",
      hover: "hover:bg-pink-100",
    },
    buildUrl: (id) =>
      id.startsWith("http") ? id : `https://www.bilibili.com/bangumi/media/md${id}`,
  },
  bilibili_hk_mo_tw: {
    id: "bilibili_hk_mo_tw",
    name: "哔哩哔哩 (港澳台)",
    category: "hktw",
    badge: "B站港澳台",
    themeColor: {
      bg: "bg-pink-50",
      text: "text-pink-700",
      border: "border-pink-200",
      hover: "hover:bg-pink-100",
    },
    buildUrl: (id) =>
      id.startsWith("http") ? id : `https://www.bilibili.com/bangumi/media/md${id}`,
  },
  gamer: {
    id: "gamer",
    name: "巴哈姆特動畫瘋",
    category: "hktw",
    badge: "動畫瘋",
    themeColor: {
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      border: "border-emerald-200",
      hover: "hover:bg-emerald-100",
    },
    buildUrl: (id) =>
      id.startsWith("http")
        ? id
        : `https://ani.gamer.com.tw/animeVideo.php?sn=${id}`,
  },
  gamer_hk: {
    id: "gamer_hk",
    name: "巴哈姆特 (香港)",
    category: "hktw",
    badge: "動畫瘋(港)",
    themeColor: {
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      border: "border-emerald-200",
      hover: "hover:bg-emerald-100",
    },
    buildUrl: (id) =>
      id.startsWith("http")
        ? id
        : `https://ani.gamer.com.tw/animeVideo.php?sn=${id}`,
  },
  mikan: {
    id: "mikan",
    name: "蜜柑计划",
    category: "download",
    badge: "蜜柑专属",
    themeColor: {
      bg: "bg-amber-50",
      text: "text-amber-700",
      border: "border-amber-200",
      hover: "hover:bg-amber-100",
    },
    buildUrl: (id) =>
      id.startsWith("http") ? id : `https://mikanani.me/Home/Bangumi/${id}`,
  },
  iqiyi: {
    id: "iqiyi",
    name: "爱奇艺",
    category: "domestic",
    badge: "爱奇艺",
    themeColor: {
      bg: "bg-green-50",
      text: "text-green-700",
      border: "border-green-200",
      hover: "hover:bg-green-100",
    },
    buildUrl: (id) =>
      id.startsWith("http") ? id : `https://www.iqiyi.com/a_${id}.html`,
  },
  tencent: {
    id: "tencent",
    name: "腾讯视频",
    category: "domestic",
    badge: "腾讯视频",
    themeColor: {
      bg: "bg-orange-50",
      text: "text-orange-700",
      border: "border-orange-200",
      hover: "hover:bg-orange-100",
    },
    buildUrl: (id) =>
      id.startsWith("http") ? id : `https://v.qq.com/detail/${id}.html`,
  },
  youku: {
    id: "youku",
    name: "优酷",
    category: "domestic",
    badge: "优酷",
    themeColor: {
      bg: "bg-sky-50",
      text: "text-sky-700",
      border: "border-sky-200",
      hover: "hover:bg-sky-100",
    },
    buildUrl: (id) =>
      id.startsWith("http") ? id : `https://list.youku.com/show/id_z${id}.html`,
  },
  netflix: {
    id: "netflix",
    name: "Netflix",
    category: "overseas",
    badge: "Netflix",
    themeColor: {
      bg: "bg-rose-50",
      text: "text-rose-700",
      border: "border-rose-200",
      hover: "hover:bg-rose-100",
    },
    buildUrl: (id) =>
      id.startsWith("http") ? id : `https://www.netflix.com/title/${id}`,
  },
  crunchyroll: {
    id: "crunchyroll",
    name: "Crunchyroll",
    category: "overseas",
    badge: "Crunchyroll",
    themeColor: {
      bg: "bg-amber-50",
      text: "text-amber-700",
      border: "border-amber-200",
      hover: "hover:bg-amber-100",
    },
    buildUrl: (id) =>
      id.startsWith("http") ? id : `https://www.crunchyroll.com/series/${id}`,
  },
  danime: {
    id: "danime",
    name: "dアニメストア",
    category: "overseas",
    badge: "dAnime",
    themeColor: {
      bg: "bg-orange-50",
      text: "text-orange-700",
      border: "border-orange-200",
      hover: "hover:bg-orange-100",
    },
    buildUrl: (id) =>
      id.startsWith("http")
        ? id
        : `https://animestore.docomo.ne.jp/animestore/ci_pc?partId=${id}`,
  },
  abema: {
    id: "abema",
    name: "ABEMA",
    category: "overseas",
    badge: "ABEMA",
    themeColor: {
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      border: "border-emerald-200",
      hover: "hover:bg-emerald-100",
    },
    buildUrl: (id) =>
      id.startsWith("http") ? id : `https://abema.tv/video/title/${id}`,
  },
  unext: {
    id: "unext",
    name: "U-NEXT",
    category: "overseas",
    badge: "U-NEXT",
    themeColor: {
      bg: "bg-blue-50",
      text: "text-blue-700",
      border: "border-blue-200",
      hover: "hover:bg-blue-100",
    },
    buildUrl: (id) =>
      id.startsWith("http")
        ? id
        : `https://video.unext.jp/title/${id}`,
  },
  disneyplus: {
    id: "disneyplus",
    name: "Disney+",
    category: "overseas",
    badge: "Disney+",
    themeColor: {
      bg: "bg-indigo-50",
      text: "text-indigo-700",
      border: "border-indigo-200",
      hover: "hover:bg-indigo-100",
    },
    buildUrl: (id) =>
      id.startsWith("http")
        ? id
        : `https://www.disneyplus.com/series/title/${id}`,
  },
};

export function getSiteMeta(siteId: string): SiteMeta | null {
  return SITE_METAS[siteId] ?? null;
}

export function buildSiteHref(siteId: string, id: string): string | null {
  const meta = getSiteMeta(siteId);
  if (!meta) return null;
  return meta.buildUrl(id);
}
