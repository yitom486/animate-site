import { SUBJECT_TYPE, type SubjectTypeValue } from "./types";

/** 与 bgm.tv 路径 /feed 一致的板块日志分区 */
export const BLOG_SECTIONS = ["anime", "book", "music", "game", "real"] as const;

export type BlogSection = (typeof BLOG_SECTIONS)[number];

export const BLOG_SECTION_LABEL: Record<BlogSection, string> = {
  anime: "动画日志",
  book: "图书日志",
  music: "音乐日志",
  game: "游戏日志",
  real: "三次元日志",
};

export const BLOG_SECTION_DESC: Record<BlogSection, string> = {
  anime: "Bangumi 用户撰写的观后感、吐槽与讨论 · 来自动画板块",
  book: "Bangumi 用户撰写的阅读笔记与书评 · 来自书籍板块",
  music: "Bangumi 用户撰写的听感与乐评 · 来自音乐板块",
  game: "Bangumi 用户撰写的通关感想与讨论 · 来自游戏板块",
  real: "Bangumi 用户撰写的影视综观后感 · 来自三次元板块",
};

const SECTION_TO_SUBJECT_TYPE: Record<BlogSection, SubjectTypeValue> = {
  anime: SUBJECT_TYPE.anime,
  book: SUBJECT_TYPE.book,
  music: SUBJECT_TYPE.music,
  game: SUBJECT_TYPE.game,
  real: SUBJECT_TYPE.real,
};

const SUBJECT_TYPE_TO_SECTION: Record<SubjectTypeValue, BlogSection> = {
  [SUBJECT_TYPE.anime]: "anime",
  [SUBJECT_TYPE.book]: "book",
  [SUBJECT_TYPE.music]: "music",
  [SUBJECT_TYPE.game]: "game",
  [SUBJECT_TYPE.real]: "real",
};

export function isBlogSection(value: string | undefined | null): value is BlogSection {
  return !!value && (BLOG_SECTIONS as readonly string[]).includes(value);
}

export function parseBlogSection(value: string | undefined | null): BlogSection | undefined {
  return isBlogSection(value) ? value : undefined;
}

export function blogSectionToSubjectType(section: BlogSection): SubjectTypeValue {
  return SECTION_TO_SUBJECT_TYPE[section];
}

export function subjectTypeToBlogSection(type: string | undefined): BlogSection | undefined {
  if (!type) return undefined;
  return SUBJECT_TYPE_TO_SECTION[type as SubjectTypeValue];
}

/** 站内列表路径 */
export function blogListPath(section: BlogSection): string {
  return `/${section}/blog`;
}

/** 站内详情路径（保留 section 前缀，便于返回列表） */
export function blogDetailPath(section: BlogSection, id: string | number): string {
  const num = String(id).replace(/\D/g, "");
  return `/${section}/blog/${num}`;
}
