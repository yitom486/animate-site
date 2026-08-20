/** 单集播放信息 */
export type BilibiliEpisode = {
  epId: number;
  /** 集序号文案，如「1」「11.5」 */
  indexLabel: string;
  /** 集标题，如「活字辈」 */
  title?: string;
  pageUrl: string;
  embedUrl?: string;
  /** B 站角标，如「会员」 */
  badge?: string;
};

/** B 站番剧匹配结果 */
export type BilibiliMatch = {
  seasonId: number;
  title: string;
  /** 番剧季度页 */
  seasonUrl: string;
  /** 默认打开的分集页 */
  pageUrl: string;
  episodes: BilibiliEpisode[];
};

export type BilibiliMatchStatus = "matched" | "empty" | "blocked" | "unavailable";

export type BilibiliMatchResponse = {
  match: BilibiliMatch | null;
  status: BilibiliMatchStatus;
};
