export type BangumiDataSiteId =
  | "bilibili"
  | "bilibili_hk_mo_tw"
  | "gamer"
  | "gamer_hk"
  | "mikan"
  | "iqiyi"
  | "tencent"
  | "youku"
  | "netflix"
  | "crunchyroll"
  | "disneyplus"
  | "danime"
  | "abema"
  | "unext"
  | "prime"
  | "nicovideo"
  | "mal"
  | "anidb"
  | "aniList"
  | "tmdb";

export type BangumiDataSite = {
  site: BangumiDataSiteId | string;
  id: string;
};

export type BangumiDataItem = {
  title?: string;
  sites: BangumiDataSite[];
  begin?: string;
};

export type BangumiDataShard = Record<string, BangumiDataItem>;
