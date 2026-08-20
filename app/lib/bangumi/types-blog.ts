export type BgmBlogItem = {
  id: string;
  title: string;
  link: string;
  excerpt?: string;
  publishedAt?: string;
  /** 以下字段仅 HTML 列表抓取（/{section}/blog）填充，RSS 源没有 */
  author?: string;
  authorUrl?: string;
  /** 左侧图：有关联条目时多为封面，否则可能是用户头像 */
  cover?: string;
  /** @deprecated 同 cover；兼容旧字段名 */
  avatar?: string;
  replies?: number;
  /** 关联条目（「评论 xxx」） */
  subjectId?: number;
  subjectName?: string;
};

export type BgmBlogPage = {
  items: BgmBlogItem[];
  page: number;
  hasMore: boolean;
};

export type BgmBlogRelatedSubject = {
  id: number;
  name: string;
  nameCn?: string;
  image?: string;
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
  /** 日志关联条目（Bangumi「关联条目」区） */
  relatedSubjects?: BgmBlogRelatedSubject[];
};
