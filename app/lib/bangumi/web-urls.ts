export const BGM_WEB = "https://bgm.tv";

export const BGM_WEB_ROUTES_BLOG = {
  animeBlog: () => `${BGM_WEB}/anime/blog`,
  subjectBlog: (id: string | number) => `${BGM_WEB}/subject/${id}/blog`,
  subjectBlogRss: (id: string | number) => `${BGM_WEB}/subject/${id}/blog/rss`,
} as const;
