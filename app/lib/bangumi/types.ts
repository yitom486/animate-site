import type { AnimeCardData } from "~/lib/anime-meta";

/** Bangumi SubjectType */
export const SUBJECT_TYPE = {
  book: "1",
  anime: "2",
  music: "3",
  game: "4",
  real: "6",
} as const;

export type SubjectTypeValue =
  (typeof SUBJECT_TYPE)[keyof typeof SUBJECT_TYPE];

/** 动画分类 SubjectAnimeCategory */
export const ANIME_CAT = {
  tv: "1",
  ova: "2",
  movie: "3",
  web: "5",
} as const;

export const ANIME_CAT_LABEL: Record<string, string> = {
  "1": "TV",
  "2": "OVA",
  "3": "剧场版",
  "5": "WEB",
};

/** 列表视图模式 */
export type ListView =
  | ""
  | "calendar"
  | "heat"
  | "cat"
  | "tag"
  | "search"
  | "season";

export type ListQuery = {
  type: SubjectTypeValue;
  sort: "rank" | "date";
  view: ListView;
  page: number;
  cat: string;
  tag: string;
  q: string;
  year: string;
  month: string;
};

export type RawSubject = AnimeCardData & {
  summary?: string;
  infobox?: unknown;
  collection?: unknown;
  meta_tags?: unknown;
};

export type SubjectListResponse = {
  data: RawSubject[];
  total: number;
  limit?: number;
  offset?: number;
};

export type CalendarWeekday = {
  id: number;
  cn: string;
  en: string;
  ja: string;
};

export type CalendarDayGroup = {
  weekday: CalendarWeekday;
  items: AnimeCardData[];
};

export type AnimeListResult = {
  items: AnimeCardData[];
  /** 每日放送：按星期分组（view=calendar 时有值） */
  schedule?: CalendarDayGroup[];
  type: string;
  sort: string;
  view: string;
  page: number;
  pageSize: number;
  total: number;
  baseParams: Record<string, string>;
  typeLabel: string;
  viewLabel: string;
};

export type SearchSubjectsBody = {
  keyword?: string;
  sort?: "match" | "heat" | "rank";
  filter?: {
    type?: number[];
    tag?: string[];
    air_date?: string[];
  };
};
