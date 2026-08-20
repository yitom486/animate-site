import type { BlogSection } from "./blog-section";

export const BGM_WEB = "https://bgm.tv";

export const BGM_WEB_ROUTES_BLOG = {
  sectionBlog: (section: BlogSection) => `${BGM_WEB}/${section}/blog`,
  /** @deprecated 使用 sectionBlog("anime") */
  animeBlog: () => `${BGM_WEB}/anime/blog`,
  subjectBlog: (id: string | number) => `${BGM_WEB}/subject/${id}/blog`,
  subjectBlogRss: (id: string | number) => `${BGM_WEB}/subject/${id}/blog/rss`,
} as const;
