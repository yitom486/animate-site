import { useEffect, useState } from "react";
import { Link, type ShouldRevalidateFunctionArgs } from "react-router";
import {
  ArrowRight,
  BookOpen,
  CalendarCheck,
  CalendarDays,
  Gamepad2,
  Music,
  Sparkles,
  Tv,
  Video,
} from "lucide-react";
import type { Route } from "./+types/home";
import { SiteNav } from "~/components/site-nav";
import { SearchForm } from "~/components/search-form";
import { HomeNewsPanel } from "~/components/home-news-panel";
import { AnimeCard } from "~/components/anime-card";
import { SubjectDetailDrawer } from "~/components/subject-detail-drawer";
import { Button } from "~/components/ui/button";
import { buildDetailUrl, buildListHref } from "~/lib/bangumi/params";
import { SUBJECT_TYPE } from "~/lib/bangumi/types";
import { fetchCalendarSchedule } from "~/lib/bangumi/server/calendar.server";
import { upstreamFromRequest } from "~/lib/upstream";
import { getBangumiWeekdayId, shanghaiDateKey } from "~/lib/bangumi/calendar-utils";
import { CACHE_MAX_ENTRIES, CACHE_TTL_LIST_MS } from "~/lib/bangumi/constants";
import { preloadHotAnimeLists } from "~/lib/bangumi/list-client-cache";
import { createRouteClientCache, readThroughRouteCache } from "~/lib/route-client-cache";

export function meta() {
  return [
    { title: "亚域空间 · 作品索引与每日放送" },
    {
      name: "description",
      content:
        "搜索动画、书籍、音乐、游戏与三次元作品，查看每日放送、Bangumi 评分、播放平台与社区日志。",
    },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  try {
    const upstream = upstreamFromRequest(request);
    const { schedule, total } = await fetchCalendarSchedule(upstream);
    const todayId = getBangumiWeekdayId(new Date());
    const todayGroup = schedule.find((d) => d.weekday.id === todayId);
    const todayItems = todayGroup?.items.slice(0, 12) ?? [];

    // 从全周提取当季高分瞩目新作（去重并按评分降序取前 6 部）
    const allItems = schedule.flatMap((d) => d.items);
    const uniqueMap = new Map();
    for (const item of allItems) {
      if (!uniqueMap.has(item.id)) {
        uniqueMap.set(item.id, item);
      }
    }
    const hotItems = Array.from(uniqueMap.values())
      .filter((item) => (item.rating?.score ?? 0) > 0)
      .sort((a, b) => (b.rating?.score ?? 0) - (a.rating?.score ?? 0))
      .slice(0, 6);

    return {
      todayItems,
      hotItems,
      todayCn: todayGroup?.weekday.cn.replace("星期", "周") ?? "今日",
      totalSchedule: total,
    };
  } catch (err) {
    console.error("[home-loader]", err);
    return {
      todayItems: [],
      hotItems: [],
      todayCn: "今日",
      totalSchedule: 0,
    };
  }
}

type HomeLoaderData = Awaited<ReturnType<typeof loader>>;

const homeClientCache = createRouteClientCache<HomeLoaderData>({
  ttlMs: CACHE_TTL_LIST_MS,
  maxEntries: CACHE_MAX_ENTRIES.clientHome,
});

export async function clientLoader({ serverLoader }: Route.ClientLoaderArgs) {
  // 键含上海日：跨午夜自动失效；hydrate 时 serverLoader() 复用 SSR 载荷。
  const key = `home:${shanghaiDateKey()}`;
  return readThroughRouteCache(homeClientCache, key, () => serverLoader());
}
clientLoader.hydrate = true;

export function shouldRevalidate({
  formMethod,
  defaultShouldRevalidate,
}: ShouldRevalidateFunctionArgs) {
  if (formMethod && formMethod.toUpperCase() !== "GET") return defaultShouldRevalidate;
  // 首页无 URL 参数依赖；回退 / 再进入时靠 clientLoader 缓存，避免无意义重拉。
  return false;
}

const CATEGORIES = [
  { type: SUBJECT_TYPE.anime, label: "动画", desc: "番剧、剧场版与短片", icon: Tv },
  { type: SUBJECT_TYPE.book, label: "书籍", desc: "小说、漫画与画集", icon: BookOpen },
  { type: SUBJECT_TYPE.music, label: "音乐", desc: "原声、专辑与单曲", icon: Music },
  { type: SUBJECT_TYPE.game, label: "游戏", desc: "主机、PC 与独立作品", icon: Gamepad2 },
  { type: SUBJECT_TYPE.real, label: "三次元", desc: "电影、剧集与演出", icon: Video },
];

export default function Home({ loaderData }: Route.ComponentProps) {
  const { todayItems, hotItems, todayCn, totalSchedule } = loaderData;
  const [drawerId, setDrawerId] = useState<number | null>(null);
  const emptyListParams = new URLSearchParams();

  // 预热放送周表 + 排行榜：点进高流量页 / 回退时 clientLoader 直接命中。
  useEffect(() => {
    preloadHotAnimeLists();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <SiteNav />
      <main className="relative mx-auto w-full max-w-6xl px-4 pb-12 sm:px-6 lg:px-8">
        {/* 顶部柔和粉调弥散光晕，限制在视口内防止撑破移动端宽度 */}
        <div
          className="pointer-events-none absolute -top-20 left-1/2 -z-10 h-80 w-full max-w-[640px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl transform-gpu will-change-transform overflow-hidden"
          aria-hidden
        />

        <section
          className="grid gap-8 border-b border-border/70 py-8 sm:py-14 lg:grid-cols-[1.45fr_1fr] lg:gap-14"
          aria-labelledby="home-title"
        >
          <div>
            <div className="mb-3 sm:mb-4 flex items-center gap-2 text-xs font-semibold tracking-wider text-primary">
              <span className="h-px w-6 bg-primary" aria-hidden />
              作品索引 · 每日放送 · 社区交流
            </div>
            <h1
              id="home-title"
              className="font-serif text-2xl font-bold tracking-tight text-foreground sm:text-4xl"
            >
              下一部想看的，
              <br className="hidden sm:block" />
              从这里找。
            </h1>
            <p className="mt-3 sm:mt-4 max-w-lg text-xs sm:text-sm leading-6 sm:leading-7 text-muted-foreground">
              探索口碑新番、查看每日排期、直达正版播放与资源索引。动画、书籍、音乐、游戏，陪伴每个二次元爱好者的追番时光。
            </p>
            {/* 桌面端 Hero 搜索框（移动端彻底隐藏，搜索统一收纳至侧边栏抽屉与顶部搜索图标） */}
            <div className="mt-7 hidden lg:block">
              <SearchForm variant="hero" />
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
              <span className="font-mono text-[11px]">Bangumi 开放数据直连</span>
              <span className="text-border">·</span>
              <Link
                to={buildListHref({ type: SUBJECT_TYPE.anime, sort: "rank" })}
                className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
              >
                探索高分神作榜
                <ArrowRight className="size-3" />
              </Link>
            </div>
          </div>

          <aside className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-primary/20 bg-card p-6 shadow-xs transition-all hover:border-primary/40 hover:shadow-md hover:shadow-primary/10 sm:p-7">
            <div className="pointer-events-none absolute -right-6 -bottom-6 text-primary/5">
              <CalendarDays className="size-36" aria-hidden />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-primary">
                  <CalendarDays className="size-4" />
                  <span>新番放送手边页</span>
                </div>
                <span className="flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-0.5 font-mono text-[10px] font-bold text-primary">
                  <span className="size-1.5 rounded-full bg-primary animate-pulse" />
                  今日 {todayItems.length} 部放送
                </span>
              </div>
              <h2 className="mt-4 font-serif text-2xl font-bold tracking-tight text-foreground">
                今天，有什么更新？
              </h2>
              <p className="mt-3 text-xs leading-6 text-muted-foreground">
                周一至周日实时排期，自动聚合 Bangumi 口碑评分与全网播放直达通道。
              </p>
            </div>
            <div className="mt-6 flex flex-col gap-3">
              <Button
                render={
                  <Link
                    to={buildListHref({ type: SUBJECT_TYPE.anime, view: "calendar" })}
                    prefetch="intent"
                  />
                }
                nativeButton={false}
                className="h-10 w-full justify-center px-4 font-bold shadow-xs shadow-primary/20"
              >
                进入每日放送周历
                <ArrowRight className="size-4" />
              </Button>
              <Link
                to="/anime/blog"
                prefetch="intent"
                className="inline-flex items-center justify-center text-xs font-medium text-muted-foreground transition-colors hover:text-primary hover:underline"
              >
                或者，浏览社区日志
              </Link>
            </div>
          </aside>
        </section>

        {/* 今日放送速递板块（封面第一动线） */}
        {todayItems.length > 0 ? (
          <section className="border-b border-border/70 py-10" aria-labelledby="today-title">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
                    <CalendarCheck className="size-4" />
                  </div>
                  <h2
                    id="today-title"
                    className="font-serif text-xl font-bold tracking-tight text-foreground"
                  >
                    今日放送 · {todayCn}更新
                  </h2>
                  <span className="flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-0.5 font-mono text-[10px] font-bold text-primary">
                    <span className="size-1.5 rounded-full bg-primary animate-pulse" />
                    LIVE
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  今天共有 {todayItems.length} 部新番更新，点击海报直达详情与播放源
                </p>
              </div>
              <Link
                to={buildListHref({ type: SUBJECT_TYPE.anime, view: "calendar" })}
                prefetch="intent"
                className="inline-flex items-center gap-1 text-xs font-bold text-primary underline-offset-4 hover:underline"
              >
                查看完整周历 ({totalSchedule} 部)
                <ArrowRight className="size-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {todayItems.slice(0, 6).map((item, idx) => (
                <AnimeCard
                  key={item.id}
                  item={item}
                  to={buildDetailUrl(item.id, emptyListParams)}
                  priority={idx < 3}
                  onSelect={(selected) => setDrawerId(selected.id)}
                />
              ))}
            </div>
          </section>
        ) : null}

        {/* 当季高分瞩目板块 */}
        {hotItems.length > 0 ? (
          <section className="border-b border-border/70 py-10" aria-labelledby="hot-title">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-lg border border-warning/30 bg-warning/10 text-rating">
                    <Sparkles className="size-4" />
                  </div>
                  <h2
                    id="hot-title"
                    className="font-serif text-xl font-bold tracking-tight text-foreground"
                  >
                    当季瞩目 · 口碑精选
                  </h2>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  正在热播的本季高分新番，随社区口碑追番不踩雷
                </p>
              </div>
              <Link
                to={buildListHref({ type: SUBJECT_TYPE.anime, sort: "rank" })}
                prefetch="intent"
                className="inline-flex items-center gap-1 text-xs font-bold text-primary underline-offset-4 hover:underline"
              >
                查看全站高分榜
                <ArrowRight className="size-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {hotItems.map((item, idx) => (
                <AnimeCard
                  key={item.id}
                  item={item}
                  to={buildDetailUrl(item.id, emptyListParams)}
                  rank={idx + 1}
                  onSelect={(selected) => setDrawerId(selected.id)}
                />
              ))}
            </div>
          </section>
        ) : null}

        {/* 按类型探索 */}
        <section className="py-10" aria-labelledby="browse-title">
          <div className="mb-5 flex items-baseline justify-between gap-3">
            <div>
              <h2 id="browse-title" className="font-serif text-base font-bold text-foreground">
                按类型探索
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">从喜欢的主题开启漫游</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {CATEGORIES.map(({ type, label, desc, icon: Icon }) => (
              <Link
                key={type}
                to={buildListHref({ type })}
                prefetch="intent"
                className="group flex flex-col justify-between rounded-xl border border-border/70 bg-card/60 p-4 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:bg-card hover:shadow-md hover:shadow-primary/5"
              >
                <div className="flex items-start gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon className="size-4.5" aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <span className="block font-serif text-sm font-bold text-foreground transition-colors group-hover:text-primary">
                      {label}
                    </span>
                    <span className="mt-0.5 block truncate font-mono text-[11px] text-muted-foreground">
                      {desc}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <HomeNewsPanel />
      </main>

      <footer className="border-t border-border/70">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-6 text-xs text-muted-foreground sm:flex-row sm:justify-between sm:px-8">
          <span className="font-mono text-[11px]">亚域空间 · 记录与发现</span>
          <span>作品资料来自 Bangumi，播放与资源链接由第三方提供。</span>
        </div>
      </footer>

      <SubjectDetailDrawer id={drawerId} onClose={() => setDrawerId(null)} />
    </div>
  );
}
