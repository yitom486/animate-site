import { Link } from "react-router";
import {
  BookOpen,
  CalendarDays,
  Clock,
  Compass,
  Gamepad2,
  Music,
  Sparkles,
  Tv,
} from "lucide-react";
import { HeroBackdrop } from "~/components/hero-backdrop";
import { HeroParticles } from "~/components/hero-particles";
import { SiteNav } from "~/components/site-nav";
import { SearchForm } from "~/components/search-form";
import { HomeNewsPanel } from "~/components/home-news-panel";
import { buildListHref } from "~/lib/bangumi/params";
import { SUBJECT_TYPE } from "~/lib/bangumi/types";

export function meta() {
  return [
    { title: "亚域空间 - 亚文化平行传送门" },
    {
      name: "description",
      content: "聚合番剧放送、评分数据、字幕下载，以及游戏与幻想世界入口。",
    },
  ];
}

export default function Home() {
  const chronicleLinks = [
    {
      label: "放送",
      desc: "每日新番时间表",
      to: buildListHref({ type: SUBJECT_TYPE.anime, view: "calendar" }),
    },
    {
      label: "评分",
      desc: "Bangumi 口碑排序",
      to: buildListHref({ type: SUBJECT_TYPE.anime, sort: "rank" }),
    },
    {
      label: "外链",
      desc: "选择番剧后查看资源链接",
      to: buildListHref({ type: SUBJECT_TYPE.anime, view: "links" }),
    },
  ];

  const categories = [
    {
      type: SUBJECT_TYPE.anime,
      label: "动画",
      desc: "每日放送 & 新番推介",
      icon: Tv,
      color: "border-rose-200/80 bg-rose-50/70 text-rose-700",
    },
    {
      type: SUBJECT_TYPE.game,
      label: "游戏",
      desc: "星象平台 & 游艺纪事",
      icon: Gamepad2,
      color: "border-sky-200/80 bg-sky-50/70 text-sky-700",
    },
    {
      type: SUBJECT_TYPE.book,
      label: "书籍",
      desc: "轻小漫本 & 墨香记录",
      icon: BookOpen,
      color: "border-amber-200/80 bg-amber-50/70 text-amber-700",
    },
    {
      type: SUBJECT_TYPE.music,
      label: "音乐",
      desc: "原声旋律 & 乐之幻音",
      icon: Music,
      color: "border-rose-200/80 bg-rose-50/70 text-rose-700",
    },
  ];

  return (
    <div className="celadon-page relative min-h-screen text-slate-800 selection:bg-rose-500/20 selection:text-rose-900">
      <SiteNav />

      <main className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <section className="hero-panel relative min-h-[560px] overflow-hidden rounded-xl">
          <HeroBackdrop className="z-0" />
          <HeroParticles className="absolute inset-0 z-[1]" />
          <div className="hero-panel__fade absolute inset-x-0 bottom-0 z-[1]" />

          <div className="relative z-[2] flex min-h-[560px] flex-col justify-center px-5 py-12 sm:px-10 lg:max-w-3xl lg:px-14">
            <div className="hero-badge mb-5 inline-flex w-fit items-center gap-2 px-3.5 py-1.5 font-serif text-xs font-bold tracking-wider">
              <Sparkles className="size-3.5 text-fuchsia-500" />
              平行次元的亚文化传送门
            </div>

            <h1 className="font-serif text-4xl font-black leading-tight tracking-tight text-slate-800 sm:text-5xl lg:text-6xl">
              青羽凝辉，
              <span className="hero-title-accent mt-1 block bg-gradient-to-r from-rose-500 via-fuchsia-500 to-sky-400 bg-clip-text text-transparent">
                开启次元穿梭
              </span>
            </h1>

            <p className="mt-5 max-w-2xl font-serif text-sm leading-7 text-slate-600 sm:text-base">
              聚合番剧放送、评分数据、字幕下载与幻想世界入口，以青瓷般的轻盈界面整理你的第二空间。
            </p>

            <SearchForm variant="hero" className="mt-8" />

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to={buildListHref({ type: SUBJECT_TYPE.anime, view: "calendar" })}
                prefetch="intent"
                className="hero-cta-primary inline-flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-bold transition-transform hover:scale-[1.02]"
              >
                <CalendarDays className="size-4" />
                查看日历新番
              </Link>
              <Link
                to="/anime"
                prefetch="intent"
                className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-white/78 px-5 py-3 text-sm font-bold text-rose-800 shadow-sm transition-colors hover:bg-white"
              >
                <Compass className="size-4" />
                进入番剧索引
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-12">
          <div className="celadon-glass rounded-lg p-5 lg:col-span-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="font-mono text-xs font-semibold uppercase tracking-widest text-rose-600">
                  Today Chronicle
                </span>
                <h2 className="mt-1 font-serif text-xl font-bold text-slate-800">今日星历速览</h2>
              </div>
              <Clock className="size-5 text-rose-600" />
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {chronicleLinks.map(({ label, desc, to }) => (
                <Link
                  key={label}
                  to={to}
                  prefetch="intent"
                  className="rounded-lg border border-rose-100/80 bg-white/65 p-4 transition-colors hover:border-rose-300 hover:bg-white/90"
                >
                  <span className="font-serif text-base font-bold text-rose-800">{label}</span>
                  <p className="mt-1 text-xs text-slate-500">{desc}</p>
                </Link>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:col-span-7">
            {categories.map((c) => {
              const Icon = c.icon;
              return (
                <Link
                  key={c.type}
                  to={buildListHref({ type: c.type })}
                  prefetch="intent"
                  className={`group flex items-center gap-4 rounded-lg border p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/90 ${c.color}`}
                >
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-white/76 shadow-inner">
                    <Icon className="size-5 transition-transform duration-300 group-hover:scale-110" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-serif text-base font-bold text-slate-800">
                      {c.label}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-slate-500">{c.desc}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        <HomeNewsPanel />
      </main>

      <footer className="relative z-10 border-t border-white/70 bg-white/42 py-6 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 text-center text-xs text-slate-500 sm:px-6 lg:flex-row lg:px-8">
          <span className="font-serif font-bold tracking-wider text-slate-700">
            亚域空间 · Celadon Portal
          </span>
          <span className="font-mono">© 2026 Built with React Router v7</span>
        </div>
      </footer>
    </div>
  );
}
