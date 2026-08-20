export type BgmBlogItem = {
  id: string;
  title: string;
  link: string;
  excerpt?: string;
  publishedAt?: string;
  /** 以下字段仅 HTML 列表抓取（/anime/blog）填充，RSS 源没有 */
  author?: string;
  authorUrl?: string;
  avatar?: string;
  replies?: number;
};

export type BgmBlogPage = {
  items: BgmBlogItem[];
  page: number;
  hasMore: boolean;
};

export type BgmBlogDetail = {
  id: string;
  title: string;
  link: string;
  /** 已消毒的正文 HTML，可直接 dangerouslySetInnerHTML */
  contentHtml: string;
  author?: string;
  authorUrl?: string;
  avatar?: string;
  publishedAt?: string;
};
