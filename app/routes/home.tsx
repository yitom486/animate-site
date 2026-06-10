import { Form, Link } from "react-router";
import { Search, Gamepad2, Tv, BookOpen, Music, ArrowRight } from "lucide-react";
import type { Route } from "./+types/home";

export function meta() {
  return [
    { title: "亚域空间 - 亚文化平行传送门" },
    { name: "description", content: "在这里，聚合最全的番剧放送、评分数据、字幕下载，以及你的游戏与幻想世界。一键穿梭，直达你的第二空间。" },
  ];
}

export function loader() {
  return null;
}

export default function Home() {
  const categories = [
    { type: "2", label: "动画", desc: "每日放送 & 新番推介", icon: Tv, color: "from-pink-500/20 to-rose-500/20 border-pink-500/30 text-pink-400" },
    { type: "4", label: "游戏", desc: "星象平台 & 游艺纪事", icon: Gamepad2, color: "from-purple-500/20 to-indigo-500/20 border-purple-500/30 text-purple-400" },
    { type: "1", label: "书籍", desc: "轻小漫本 & 墨香记录", icon: BookOpen, color: "from-blue-500/20 to-cyan-500/20 border-blue-500/30 text-blue-400" },
    { type: "3", label: "音乐", desc: "原声旋律 & 乐之幻音", icon: Music, color: "from-teal-500/20 to-emerald-500/20 border-teal-500/30 text-teal-400" },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100 flex flex-col justify-between select-none">
      {/* 背景星云发光点 - Cosmic Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[60%] aspect-square rounded-full bg-pink-500/10 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] aspect-square rounded-full bg-indigo-500/10 blur-[150px] pointer-events-none" />
      <div className="absolute top-[30%] left-[40%] w-[30%] aspect-square rounded-full bg-purple-500/5 blur-[120px] pointer-events-none" />

      {/* 极简顶栏 */}
      <header className="relative z-10 mx-auto max-w-7xl w-full px-6 py-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="bg-gradient-to-r from-pink-500 via-fuchsia-500 to-indigo-500 bg-clip-text text-xl font-black tracking-wider text-transparent">
            亚域空间
          </span>
          <span className="text-[10px] font-mono border border-fuchsia-500/30 px-1.5 py-0.5 rounded text-fuchsia-400 bg-fuchsia-500/5">
            Portal v1.0
          </span>
        </Link>
        <div className="text-xs text-slate-400 flex items-center gap-4">
          <span className="hidden sm:inline border-r border-slate-800 pr-4">按 Ctrl+D 收藏本站</span>
          <a
            href="https://github.com/yhang"
            target="_blank"
            rel="noreferrer"
            className="hover:text-white transition-colors"
          >
            GitHub
          </a>
        </div>
      </header>

      {/* 主体核心区 */}
      <main className="relative z-10 mx-auto max-w-7xl w-full px-6 py-8 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
        
        {/* 左侧控制区 */}
        <div className="lg:col-span-7 flex flex-col items-start space-y-8 text-left">
          <div className="space-y-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-pink-500/20 bg-pink-500/5 text-xs font-semibold text-pink-400 tracking-wide animate-pulse">
              ⚡ 平行次元的亚文化传送门
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-none">
              开启你的{" "}
              <span className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 bg-clip-text text-transparent">
                次元穿梭
              </span>
            </h1>
            <p className="text-sm sm:text-base text-slate-400 max-w-lg leading-relaxed">
              在这里，聚合最全的番剧放送、评分数据、字幕下载，以及你的游戏与幻想世界。一键穿梭，直达你的第二空间。
            </p>
          </div>

          {/* 快捷搜索 */}
          <Form
            method="get"
            action="/anime"
            className="relative w-full max-w-md group"
          >
            <input type="hidden" name="view" value="search" />
            <input type="hidden" name="type" value="2" />
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4.5 text-slate-500 group-focus-within:text-pink-400 transition-colors" />
              <input
                name="q"
                type="search"
                required
                placeholder="搜索你感兴趣的番剧/游戏…"
                className="w-full h-12 rounded-xl border border-slate-800 bg-slate-900/60 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-500 outline-none backdrop-blur-md transition-all duration-300 focus:border-pink-500/50 focus:ring-2 focus:ring-pink-500/10 focus:bg-slate-900/80"
              />
            </div>
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 px-3 rounded-lg bg-pink-500/10 hover:bg-pink-500 text-pink-400 hover:text-white text-xs font-semibold transition-all"
            >
              搜索
            </button>
          </Form>

          {/* 进入空间大按钮 */}
          <div className="flex flex-wrap items-center gap-4 w-full">
            <Link
              to="/anime"
              className="relative group overflow-hidden rounded-xl bg-gradient-to-r from-pink-500 via-fuchsia-500 to-indigo-500 p-[1px] transition-transform duration-300 hover:scale-[1.03]"
            >
              <div className="flex items-center gap-2 rounded-xl bg-slate-950 hover:bg-transparent px-8 py-3.5 text-sm font-bold text-white transition-colors duration-300">
                进入亚域空间
                <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          </div>

          {/* 快捷分区导航 */}
          <div className="grid grid-cols-2 gap-3 w-full max-w-md pt-4 border-t border-slate-900">
            {categories.map((c) => {
              const Icon = c.icon;
              return (
                <Link
                  key={c.type}
                  to={`/anime?type=${c.type}`}
                  className={`flex items-center gap-3 rounded-xl border p-3 bg-gradient-to-br ${c.color} hover:-translate-y-0.5 transition-all duration-300 group`}
                >
                  <div className="p-2 rounded-lg bg-slate-950/40 text-current">
                    <Icon className="size-5 group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="min-w-0 text-left">
                    <h3 className="text-xs font-bold text-slate-200">{c.label}</h3>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">{c.desc}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* 右侧插画展示区 */}
        <div className="lg:col-span-5 flex justify-center items-center">
          <div className="relative group w-full max-w-[420px] aspect-square rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(236,72,153,0.1)] ring-1 ring-white/10 transition-all duration-500 hover:shadow-[0_0_60px_rgba(236,72,153,0.25)] hover:scale-[1.01] hover:ring-pink-500/20">
            {/* 发光呼吸边框 */}
            <div className="absolute inset-0 bg-gradient-to-tr from-pink-500/20 via-purple-500/10 to-indigo-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <img
              src="/assets/portal-hero.png"
              alt="Sub-domain Space Portal"
              className="size-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
            />
            {/* 底部渐变蒙版 */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80" />
            
            {/* 浮动玻璃饰件 */}
            <div className="absolute bottom-4 left-4 right-4 rounded-xl border border-white/5 bg-white/5 px-4 py-3 backdrop-blur-md text-left">
              <span className="text-[10px] uppercase tracking-widest text-pink-400 font-mono font-bold">Featured Artwork</span>
              <h4 className="text-xs font-bold text-slate-100 mt-0.5">次元航行者 · Horizon Voyager</h4>
            </div>
          </div>
        </div>

      </main>

      {/* 极简页脚 */}
      <footer className="relative z-10 mx-auto max-w-7xl w-full px-6 py-6 text-center text-xs text-slate-600">
        <p>© 2026 亚域空间. Built with React Router v7 & Tailwind 4. Designed for Cloudflare.</p>
      </footer>
    </div>
  );
}
