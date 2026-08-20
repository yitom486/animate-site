/**
 * Bangumi 网页版跳转链接
 */
export const BGM_WEB_ROUTES = {
  /** 条目主页 */
  subject: (id: string | number) => `https://bgm.tv/subject/${id}`,
} as const;

/**
 * 第三方搜索/资源链接配置
 */
export const THIRD_PARTY_SEARCH = {
  online: {
    label: "B站搜索",
    build: (kw: string) => `https://search.bilibili.com/bangumi?keyword=${encodeURIComponent(kw)}`,
  },
  download: {
    label: "漫猫搜索",
    build: (kw: string) => `https://www.comicat.org/search.php?keyword=${encodeURIComponent(kw)}`,
  },
  subtitle: {
    label: "字幕网站",
    build: (kw: string) =>
      `https://bbs.acgrip.com/search.php?mod=forum&srchtxt=${encodeURIComponent(kw)}`,
  },
} as const;
