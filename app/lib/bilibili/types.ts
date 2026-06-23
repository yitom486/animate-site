/** B 站番剧匹配结果（用于官方 iframe 播放器） */
export type BilibiliMatch = {
  seasonId: number;
  title: string;
  /** B 站番剧播放页 */
  pageUrl: string;
  /** 官方外链播放器 */
  embedUrl: string;
};
