import {
  BookOpen,
  CalendarDays,
  Clapperboard,
  Flame,
  Gamepad2,
  Layers,
  MessageSquareText,
  Monitor,
  Music,
  Sparkles,
  TrendingUp,
  Tv,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ANIME_CAT, SUBJECT_TYPE } from "./types";
import { buildListHref } from "./params";
import { blogListPath } from "./blog-section";
import {
  BOOK_CAT,
  BOOK_CAT_LABEL,
  GAME_PLATFORMS,
  REAL_CAT,
  REAL_CAT_LABEL,
} from "./subject-categories";

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
      to: buildListHref({ type: SUBJECT_TYPE.anime }),
      title: "每日放送",
      desc: "按星期 · 首页",
      icon: CalendarDays,
    },
    {
      to: buildListHref({ type: SUBJECT_TYPE.anime, view: "heat" }),
      title: "近期注目",
      desc: "当季收藏热度",
      icon: Flame,
    },
    {
      to: buildListHref({ type: SUBJECT_TYPE.anime, sort: "rank" }),
      title: "排行榜",
      desc: "评分最高",
      icon: TrendingUp,
    },
    {
      to: buildListHref({ type: SUBJECT_TYPE.anime, sort: "date" }),
      title: "最新发布",
      desc: "按放送时间",
      icon: Sparkles,
    },
    {
      to: buildListHref({
        type: SUBJECT_TYPE.anime,
        view: "season",
        year: CURRENT_YEAR,
        month: CURRENT_MONTH,
      }),
      title: "当季新番",
      desc: `${CURRENT_YEAR}年${CURRENT_MONTH}月`,
      icon: Tv,
    },
  ];

  for (const [cat, label] of [
    [ANIME_CAT.tv, "TV"],
    [ANIME_CAT.ova, "OVA"],
    [ANIME_CAT.movie, "剧场版"],
    [ANIME_CAT.web, "WEB"],
  ] as const) {
    links.push({
      to: buildListHref({ type: SUBJECT_TYPE.anime, view: "cat", cat }),
      title: label,
      desc: "分类浏览",
      icon: Clapperboard,
    });
  }

  links.push({
    to: blogListPath("anime"),
    title: "动画日志",
    desc: "社区观后感",
    icon: MessageSquareText,
  });

  return links;
}

function bookLinks(): MenuLink[] {
  const links: MenuLink[] = [
    {
      to: buildListHref({ type: SUBJECT_TYPE.book, sort: "rank" }),
      title: "排行榜",
      desc: "评分最高 · 首页",
      icon: TrendingUp,
    },
    {
      to: buildListHref({ type: SUBJECT_TYPE.book, view: "heat" }),
      title: "近期注目",
      icon: Flame,
    },
    {
      to: buildListHref({ type: SUBJECT_TYPE.book, sort: "date" }),
      title: "最新发布",
      icon: Sparkles,
    },
  ];

  for (const cat of Object.values(BOOK_CAT)) {
    links.push({
      to: buildListHref({ type: SUBJECT_TYPE.book, view: "cat", cat }),
      title: BOOK_CAT_LABEL[cat] ?? cat,
      desc: "分类浏览",
      icon: BookOpen,
    });
  }

  links.push({
    to: buildListHref({ type: SUBJECT_TYPE.book, series: true, sort: "rank" }),
    title: "系列作品",
    desc: "漫画/小说系列",
    icon: Layers,
  });

  links.push({
    to: blogListPath("book"),
    title: "图书日志",
    desc: "社区长文",
    icon: MessageSquareText,
  });

  return links;
}

function musicLinks(): MenuLink[] {
  return [
    {
      to: buildListHref({ type: SUBJECT_TYPE.music, sort: "rank" }),
      title: "排行榜",
      desc: "评分最高 · 首页",
      icon: TrendingUp,
    },
    {
      to: buildListHref({ type: SUBJECT_TYPE.music, view: "heat" }),
      title: "近期注目",
      icon: Flame,
    },
    {
      to: buildListHref({ type: SUBJECT_TYPE.music, sort: "date" }),
      title: "最新发布",
      icon: Sparkles,
    },
    {
      to: buildListHref({ type: SUBJECT_TYPE.music, sort: "rank", year: CURRENT_YEAR }),
      title: `${CURRENT_YEAR}年`,
      desc: "本年度排行",
      icon: CalendarDays,
    },
    {
      to: blogListPath("music"),
      title: "音乐日志",
      desc: "社区长文",
      icon: MessageSquareText,
    },
  ];
}

function gameLinks(): MenuLink[] {
  const links: MenuLink[] = [
    {
      to: buildListHref({ type: SUBJECT_TYPE.game, sort: "rank" }),
      title: "排行榜",
      desc: "评分最高 · 首页",
      icon: TrendingUp,
    },
    {
      to: buildListHref({ type: SUBJECT_TYPE.game, view: "heat" }),
      title: "近期注目",
      icon: Flame,
    },
    {
      to: buildListHref({ type: SUBJECT_TYPE.game, sort: "date" }),
      title: "最新发布",
      icon: Sparkles,
    },
  ];

  for (const { id, label } of GAME_PLATFORMS) {
    links.push({
      to: buildListHref({ type: SUBJECT_TYPE.game, platform: id, sort: "rank" }),
      title: label,
      desc: "按平台",
      icon: Monitor,
    });
  }

  links.push({
    to: blogListPath("game"),
    title: "游戏日志",
    desc: "社区长文",
    icon: MessageSquareText,
  });

  return links;
}

function realLinks(): MenuLink[] {
  const links: MenuLink[] = [
    {
      to: buildListHref({ type: SUBJECT_TYPE.real, sort: "rank" }),
      title: "排行榜",
      desc: "评分最高 · 首页",
      icon: TrendingUp,
    },
    {
      to: buildListHref({ type: SUBJECT_TYPE.real, view: "heat" }),
      title: "近期注目",
      icon: Flame,
    },
    {
      to: buildListHref({ type: SUBJECT_TYPE.real, sort: "date" }),
      title: "最新发布",
      icon: Sparkles,
    },
  ];

  for (const cat of Object.values(REAL_CAT)) {
    links.push({
      to: buildListHref({ type: SUBJECT_TYPE.real, view: "cat", cat }),
      title: REAL_CAT_LABEL[cat] ?? cat,
      desc: "分类浏览",
      icon: Tv,
    });
  }

  links.push({
    to: blogListPath("real"),
    title: "三次元日志",
    desc: "社区长文",
    icon: MessageSquareText,
  });

  return links;
}

export const BGM_MENUS: MenuGroup[] = [
  { type: SUBJECT_TYPE.anime, label: "动画", links: animeLinks() },
  { type: SUBJECT_TYPE.book, label: "书籍", links: bookLinks() },
  { type: SUBJECT_TYPE.music, label: "音乐", links: musicLinks() },
  { type: SUBJECT_TYPE.game, label: "游戏", links: gameLinks() },
  { type: SUBJECT_TYPE.real, label: "三次元", links: realLinks() },
];

export const BGM_MENU_ICONS = {
  book: BookOpen,
  music: Music,
  game: Gamepad2,
} as const;
