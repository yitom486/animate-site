import {
  BookOpen,
  CalendarDays,
  Clapperboard,
  Flame,
  Gamepad2,
  Music,
  Sparkles,
  TrendingUp,
  Tv,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SUBJECT_TYPE } from "./types";

export type MenuLink = {
  to: string;
  title: string;
  desc?: string;
  icon: LucideIcon;
};

export type MenuGroup = {
  type: string;
  label: string;
  links: MenuLink[];
};

const now = new Date();
const CURRENT_YEAR = String(now.getFullYear());
const CURRENT_MONTH = String(now.getMonth() + 1);

function animeLinks(): MenuLink[] {
  const links: MenuLink[] = [
    {
      to: `/anime?type=${SUBJECT_TYPE.anime}`,
      title: "每日放送",
      desc: "按星期 · 首页",
      icon: CalendarDays,
    },
    {
      to: `/anime?type=${SUBJECT_TYPE.anime}&view=heat`,
      title: "近期注目",
      desc: "当季收藏热度",
      icon: Flame,
    },
    {
      to: `/anime?type=${SUBJECT_TYPE.anime}&sort=rank`,
      title: "排行榜",
      desc: "评分最高",
      icon: TrendingUp,
    },
    {
      to: `/anime?type=${SUBJECT_TYPE.anime}&sort=date`,
      title: "最新发布",
      desc: "按放送时间",
      icon: Sparkles,
    },
    {
      to: `/anime?type=${SUBJECT_TYPE.anime}&view=season&year=${CURRENT_YEAR}&month=${CURRENT_MONTH}`,
      title: "当季新番",
      desc: `${CURRENT_YEAR}年${CURRENT_MONTH}月`,
      icon: Tv,
    },
  ];

  for (const [cat, label] of [
    ["1", "TV"],
    ["2", "OVA"],
    ["3", "剧场版"],
    ["5", "WEB"],
  ] as const) {
    links.push({
      to: `/anime?type=${SUBJECT_TYPE.anime}&view=cat&cat=${cat}`,
      title: label,
      desc: "分类浏览",
      icon: Clapperboard,
    });
  }

  return links;
}

function simpleLinks(type: string): MenuLink[] {
  return [
    {
      to: `/anime?type=${type}&sort=rank`,
      title: "排行榜",
      desc: "评分最高 · 首页",
      icon: TrendingUp,
    },
    {
      to: `/anime?type=${type}&view=heat`,
      title: "近期注目",
      icon: Flame,
    },
    {
      to: `/anime?type=${type}&sort=date`,
      title: "最新发布",
      icon: Sparkles,
    },
  ];
}

export const BGM_MENUS: MenuGroup[] = [
  { type: SUBJECT_TYPE.anime, label: "动画", links: animeLinks() },
  { type: SUBJECT_TYPE.book, label: "书籍", links: simpleLinks(SUBJECT_TYPE.book) },
  { type: SUBJECT_TYPE.music, label: "音乐", links: simpleLinks(SUBJECT_TYPE.music) },
  { type: SUBJECT_TYPE.game, label: "游戏", links: simpleLinks(SUBJECT_TYPE.game) },
  {
    type: SUBJECT_TYPE.real,
    label: "三次元",
    links: simpleLinks(SUBJECT_TYPE.real),
  },
];

export const BGM_MENU_ICONS = {
  book: BookOpen,
  music: Music,
  game: Gamepad2,
} as const;
