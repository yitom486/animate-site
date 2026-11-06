import { Link, isRouteErrorResponse } from "react-router";
import { CalendarDays, ChevronLeft, ChevronRight, Newspaper, Sparkles, Tv } from "lucide-react";
import type { Route } from "./+types/list";
import { SiteNav } from "~/components/site-nav";
import { NewsArticleList, NewsSyncStatus } from "~/components/news-panel";
import { Button } from "~/components/ui/button";
import { newsDbFromContext, readNewsFeed } from "~/lib/news/db.server";
import { newsListHref, parseNewsChannel } from "~/lib/news/config";
import { seedNewsListQuery } from "~/lib/news/queries";
import { CACHE_MAX_ENTRIES, CACHE_TTL_LIST_MS } from "~/lib/bangumi/constants";
import { createRouteClientCache, readThroughRouteCache } from "~/lib/route-client-cache";
import { cn } from "~/lib/utils";
import type { ShouldRevalidateFunctionArgs } from "react-router";

type NewsListData = {
  feed: Awaited<ReturnType<typeof readNewsFeed>>;
  channel: ReturnType<typeof parseNewsChannel>;
};

const newsListClientCache = createRouteClientCache<NewsListData>({
  ttlMs: CACHE_TTL_LIST_MS,
  maxEntries: CACHE_MAX_ENTRIES.clientNewsList,
});

function newsListCacheKey(channel: ReturnType<typeof parseNewsChannel>, page: number) {
  return `${channel ?? "all"}:${page}`;
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const channel = parseNewsChannel(url.searchParams.get("channel"));
  const page = Number(url.searchParams.get("page")) || 1;
  const feed = await readNewsFeed(newsDbFromContext(context), {
    channel,
    page,
    limit: 20,
  });
  return { feed, channel };
}

export async function clientLoader({ request, serverLoader }: Route.ClientLoaderArgs) {
  const url = new URL(request.url);
  const channel = parseNewsChannel(url.searchParams.get("channel"));
  const page = Number(url.searchParams.get("page")) || 1;
  const data = await readThroughRouteCache(
    newsListClientCache,
    newsListCacheKey(channel, page),
    () => serverLoader(),
  );
  seedNewsListQuery(channel, page, data.feed);
  return data;
}
clientLoader.hydrate = true;

export function shouldRevalidate({
  currentUrl,
  nextUrl,
  formMethod,
  defaultShouldRevalidate,
}: ShouldRevalidateFunctionArgs) {
  if (formMethod && formMethod.toUpperCase() !== "GET") return defaultShouldRevalidate;
  return (
    currentUrl.searchParams.get("channel") !== nextUrl.searchParams.get("channel") ||
    currentUrl.searchParams.get("page") !== nextUrl.searchParams.get("page")
  );
}

export function meta() {
  return [{ title: "动漫与漫展资讯 · 亚域空间" }];
}

export default function NewsListPage({ loaderData: { feed, channel } }: Route.ComponentProps) {
  return (
    <div className="celadon-page min-h-screen text-foreground">
      <SiteNav />

      <main className="mx-auto max-w-5xl px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        {/* 顶部 Hero 区域 */}
        <header className="space-y-3 pb-6">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Sparkles className="size-3.5 text-primary" />
            ACGN 即时情报 · 实时速报
          </div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            动漫与漫展资讯
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            聚合日本新番情报、制作速报与全国漫展日历，提供 30 天中文归纳、背景补充与解读。
          </p>

          {/* 频道切换胶囊导航 */}
          <nav aria-label="资讯频道" className="mt-6 flex flex-wrap items-center gap-2 pt-2">
            {[
              { id: undefined, label: "全部资讯", icon: Newspaper },
              { id: "anime", label: "日本动漫资讯", icon: Tv },
              { id: "events", label: "国内漫展资讯", icon: CalendarDays },
            ].map(({ id, label, icon: Icon }) => {
              const active = channel === id;
              return (
                <Button
                  key={id ?? "all"}
                  variant={active ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "rounded-full transition-all",
                    active
                      ? "border-primary bg-primary font-bold text-primary-foreground shadow-xs shadow-primary/25"
                      : "border-border/70 bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
                  )}
                  render={
                    <Link
                      to={newsListHref(id as typeof channel)}
                      aria-current={active ? "page" : undefined}
                    />
                  }
                >
                  <Icon className="size-3.5" />
                  {label}
                </Button>
              );
            })}
          </nav>
        </header>

        {/* 资讯卡片网格流 */}
        <section aria-label="资讯列表" className="mt-2">
          {feed.items.length ? (
            <NewsArticleList items={feed.items} variant="grid" />
          ) : (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-card/40 py-16 text-center">
              <Newspaper className="size-10 text-muted-foreground/60" />
              <p className="mt-3 text-sm font-medium text-foreground">最近 30 天暂无资讯</p>
              <p className="mt-1 text-xs text-muted-foreground">稍后定时同步任务将拉取最新动态。</p>
            </div>
          )}
        </section>

        {/* 分页控制栏 */}
        <nav
          aria-label="资讯分页"
          className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-6"
        >
          {feed.page > 1 ? (
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl border-border/70 bg-card hover:border-primary/40 hover:text-primary"
              render={<Link to={newsListHref(channel, feed.page - 1)} />}
            >
              <ChevronLeft className="size-4" />
              上一页
            </Button>
          ) : (
            <div />
          )}

          <span className="font-mono text-xs text-muted-foreground">
            第 <strong className="text-foreground">{feed.page}</strong> 页 · 共{" "}
            <strong className="text-foreground">{feed.total}</strong> 篇资讯
          </span>

          {feed.hasMore ? (
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl border-border/70 bg-card hover:border-primary/40 hover:text-primary"
              render={<Link to={newsListHref(channel, feed.page + 1)} />}
            >
              下一页
              <ChevronRight className="size-4" />
            </Button>
          ) : (
            <div />
          )}
        </nav>

        {/* 同步状态 */}
        <footer className="mt-4">
          <NewsSyncStatus feed={feed} />
        </footer>
      </main>
    </div>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return (
    <div className="celadon-page min-h-screen text-foreground">
      <SiteNav />
      <main className="mx-auto max-w-3xl px-4 pb-12 pt-24 text-center">
        <h1 className="font-serif text-2xl font-bold">资讯暂时无法读取</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {isRouteErrorResponse(error) && error.status === 503
            ? "资讯服务正在配置数据库，请稍后再试。"
            : "网络连接或数据异常，请稍后刷新重试。"}
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center gap-1 rounded-xl border border-primary/25 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/20"
        >
          返回首页
        </Link>
      </main>
    </div>
  );
}
