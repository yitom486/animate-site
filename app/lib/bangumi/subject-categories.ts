/**
 * Bangumi SubjectCategory / platform 常量（经 api.bgm.tv 抽样校验，2026-08-20）。
 * 游戏部分次级 cat（软件/DLC/桌游）当前接口 total=0，菜单不挂空分类。
 */

export const BOOK_CAT = {
  comic: "1001",
  novel: "1002",
  illustration: "1003",
} as const;

export const BOOK_CAT_LABEL: Record<string, string> = {
  "1001": "漫画",
  "1002": "小说",
  "1003": "画集",
};

/** 游戏主分类；4002/4003/4005 抽样为空故不暴露 */
export const GAME_CAT = {
  games: "4001",
} as const;

export const GAME_CAT_LABEL: Record<string, string> = {
  "4001": "游戏",
};

/** 经 platform= 参数校验有结果的平台 */
export const GAME_PLATFORMS = [
  { id: "PC", label: "PC" },
  { id: "PS5", label: "PS5" },
  { id: "PS4", label: "PS4" },
  { id: "Android", label: "Android" },
  { id: "iOS", label: "iOS" },
  { id: "PSP", label: "PSP" },
] as const;

export const REAL_CAT = {
  jp: "1",
  en: "2",
  cn: "3",
  tv: "6001",
  movie: "6002",
  live: "6003",
  show: "6004",
} as const;

export const REAL_CAT_LABEL: Record<string, string> = {
  "1": "日剧",
  "2": "欧美剧",
  "3": "华语剧",
  "6001": "电视剧",
  "6002": "电影",
  "6003": "演出",
  "6004": "综艺",
};

/** 按条目类型解析 cat 文案（避免 anime「1=TV」与 real「1=日剧」冲突） */
export function subjectCatLabel(type: string, cat: string): string | undefined {
  if (!cat) return undefined;
  switch (type) {
    case "1":
      return BOOK_CAT_LABEL[cat];
    case "2":
      return ({ "1": "TV", "2": "OVA", "3": "剧场版", "5": "WEB" } as Record<string, string>)[cat];
    case "4":
      return GAME_CAT_LABEL[cat];
    case "6":
      return REAL_CAT_LABEL[cat];
    default:
      return BOOK_CAT_LABEL[cat] ?? GAME_CAT_LABEL[cat] ?? REAL_CAT_LABEL[cat];
  }
}
