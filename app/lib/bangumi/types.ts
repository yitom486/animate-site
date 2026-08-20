import type { AnimeCardData } from "~/lib/anime-meta";

/** Bangumi SubjectType */
export const SUBJECT_TYPE = {
  book: "1",
  anime: "2",
  music: "3",
  game: "4",
  real: "6",
} as const;

export type SubjectTypeValue = (typeof SUBJECT_TYPE)[keyof typeof SUBJECT_TYPE];

/** 搜索未限定类型时使用；不是 Bangumi 的 type 枚举 */
export const SUBJECT_TYPE_ALL = "all" as const;

export type ListTypeValue = SubjectTypeValue | typeof SUBJECT_TYPE_ALL;

/** 分块展示顺序（与导航分类一致） */
export const SUBJECT_TYPE_ORDER = [
  SUBJECT_TYPE.anime,
  SUBJECT_TYPE.book,
  SUBJECT_TYPE.music,
  SUBJECT_TYPE.game,
  SUBJECT_TYPE.real,
] as const;

export const SUBJECT_TYPE_LABEL: Record<SubjectTypeValue, string> = {
  [SUBJECT_TYPE.book]: "书籍",
  [SUBJECT_TYPE.anime]: "动画",
  [SUBJECT_TYPE.music]: "音乐",
  [SUBJECT_TYPE.game]: "游戏",
  [SUBJECT_TYPE.real]: "三次元",
};

export const SUBJECT_TYPE_OPTIONS: Array<{
  value: ListTypeValue;
  label: string;
}> = [
  { value: SUBJECT_TYPE_ALL, label: "全部类型" },
  ...SUBJECT_TYPE_ORDER.map((value) => ({
    value,
    label: SUBJECT_TYPE_LABEL[value],
  })),
];

export function isSubjectType(type: string): type is SubjectTypeValue {
  return Object.values(SUBJECT_TYPE).includes(type as SubjectTypeValue);
}

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
export type ListView = "" | "calendar" | "heat" | "cat" | "tag" | "search" | "season" | "links";

export type ListQuery = {
  type: ListTypeValue;
  sort: "rank" | "date";
  view: ListView;
  page: number;
  cat: string;
  tag: string;
  q: string;
  year: string;
  month: string;
  /** 仅书籍：系列主条目 */
  series: boolean;
  /** 仅游戏：平台筛选 */
  platform: string;
};

export type SearchGroup = {
  type: SubjectTypeValue;
  label: string;
  items: AnimeCardData[];
  total: number;
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
  /** 全类型搜索：按条目类型分块（view=search 且 type=all 时有值） */
  groups?: SearchGroup[];
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
