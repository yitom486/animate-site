import { Form, Link } from "react-router";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Clock,
  Compass,
  Gamepad2,
  Music,
  Search,
  Sparkles,
  Tv,
} from "lucide-react";
import { SiteNav } from "~/components/site-nav";
import type { Route } from "./+types/home";

export function meta() {
  return [
    { title: "亚域空间 - 亚文化平行传送门" },
    {
      name: "description",
      content:
        "聚合番剧放送、评分数据、字幕下载，以及游戏与幻想世界入口。",
    },
  ];
}

export function loader() {
  return null;
}

export default function Home() {
  const chronicleLinks = [
    {
      label: "放送",
      desc: "每日新番时间表",
      to: "/anime?type=2&view=calendar",
    },
    {
      label: "评分",
      desc: "Bangumi 口碑排序",
      to: "/anime?type=2&sort=rank",
    },
    {
      label: "外链",
      desc: "选择番剧后查看资源链接",
      to: "/anime?type=2&view=links",
    },
  ];

  const categories = [
    {
      type: "2",
      label: "动画",
      desc: "每日放送 & 新番推介",
      icon: Tv,
      color: "border-cyan-200/80 bg-cyan-50/70 text-cyan-700",
    },
    {
      type: "4",
      label: "游戏",
      desc: "星象平台 & 游艺纪事",
      icon: Gamepad2,
      color: "border-teal-200/80 bg-teal-50/70 text-teal-700",
    },
    {
      type: "1",
      label: "书籍",
      desc: "轻小漫本 & 墨香记录",
      icon: BookOpen,
      color: "border-amber-200/80 bg-amber-50/70 text-amber-700",
    },
    {
      type: "3",
      label: "音乐",
      desc: "原声旋律 & 乐之幻音",
      icon: Music,
      color: "border-rose-200/80 bg-rose-50/70 text-rose-700",
    },
  ];

  return (
    <div className="celadon-page relative min-h-screen overflow-hidden text-slate-800 selection:bg-cyan-500/20 selection:text-cyan-900">
      <SiteNav searchType="2" />

      <main className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <section className="relative min-h-[560px] overflow-hidden rounded-lg border border-white/75 bg-white/42 shadow-xl shadow-cyan-900/5">
          <img
            src="/assets/portal-hero.png"
            alt="次元航行者"
            className="absolute inset-0 size-full object-cover opacity-32 mix-blend-luminosity"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#f0fdfa]/96 via-[#e0f7f9]/88 to-[#ccfbf1]/82" />
          <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#f8fffd] to-transparent" />

          <div className="relative flex min-h-[560px] flex-col justify-center px-5 py-12 sm:px-10 lg:max-w-3xl lg:px-14">
            <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-cyan-300/60 bg-cyan-50/80 px-3.5 py-1.5 font-serif text-xs font-bold tracking-wider text-cyan-800 shadow-sm">
              <Sparkles className="size-3.5 text-cyan-600" />
              平行次元的亚文化传送门
            </div>

            <h1 className="font-serif text-4xl font-black leading-tight tracking-tight text-slate-800 sm:text-5xl lg:text-6xl">
              青羽凝辉，
              <span className="block bg-gradient-to-r from-cyan-700 via-cyan-600 to-teal-500 bg-clip-text text-transparent">
                开启次元穿梭
              </span>
            </h1>

            <p className="mt-5 max-w-2xl font-serif text-sm leading-7 text-slate-600 sm:text-base">
              聚合番剧放送、评分数据、字幕下载与幻想世界入口，以青瓷般的轻盈界面整理你的第二空间。
            </p>

            <Form method="get" action="/anime" className="mt-8 w-full max-w-xl">
              <input type="hidden" name="view" value="search" />
              <input type="hidden" name="type" value="2" />
              <div className="celadon-glass-strong flex h-14 items-center gap-3 rounded-lg px-3">
                <Search className="size-5 shrink-0 text-cyan-600" />
                <input
                  name="q"
                  type="search"
                  required
                  placeholder="搜索番剧、游戏或作品名"
                  className="min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                />
                <button
                  type="submit"
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-teal-500 px-4 text-xs font-bold text-white shadow-md shadow-cyan-900/10 transition-colors hover:from-cyan-500 hover:to-teal-400"
                >
                  搜索
                  <ArrowRight className="size-3.5" />
                </button>
              </div>
            </Form>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/anime?view=calendar&type=2"
                prefetch="intent"
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-600 to-teal-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-cyan-900/10 transition-colors hover:from-cyan-500 hover:to-teal-400"
              >
                <CalendarDays className="size-4" />
                查看日历新番
              </Link>
              <Link
                to="/anime"
                prefetch="intent"
                className="inline-flex items-center gap-2 rounded-lg border border-cyan-200 bg-white/78 px-5 py-3 text-sm font-bold text-cyan-800 shadow-sm transition-colors hover:bg-white"
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
                <span className="font-mono text-xs font-semibold uppercase tracking-widest text-cyan-600">
                  Today Chronicle
                </span>
                <h2 className="mt-1 font-serif text-xl font-bold text-slate-800">
                  今日星历速览
                </h2>
              </div>
              <Clock className="size-5 text-cyan-600" />
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {chronicleLinks.map(({ label, desc, to }) => (
                <Link
                  key={label}
                  to={to}
                  prefetch="intent"
                  className="rounded-lg border border-cyan-100/80 bg-white/65 p-4 transition-colors hover:border-cyan-300 hover:bg-white/90"
                >
                  <span className="font-serif text-base font-bold text-cyan-800">
                    {label}
                  </span>
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
                  to={`/anime?type=${c.type}`}
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
                    <span className="mt-0.5 block truncate text-xs text-slate-500">
                      {c.desc}
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
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
