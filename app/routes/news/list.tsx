import { Link, isRouteErrorResponse } from "react-router";
import type { Route } from "./+types/list";
import { SiteNav } from "~/components/site-nav";
import { NewsArticleList, NewsSyncStatus } from "~/components/news-panel";
import { Button } from "~/components/ui/button";
import { newsDbFromContext, readNewsFeed } from "~/lib/news/db.server";
import { NEWS_FEEDS, newsListHref, parseNewsChannel } from "~/lib/news/config";

export async function loader({ request, context }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const channel = parseNewsChannel(url.searchParams.get("channel"));
  const feed = await readNewsFeed(newsDbFromContext(context), {
    channel,
    page: Number(url.searchParams.get("page")) || 1,
    limit: 20,
  });
  return { feed, channel };
}

export function meta() {
  return [{ title: "动漫与漫展资讯 · 亚域空间" }];
}

export default function NewsListPage({ loaderData: { feed, channel } }: Route.ComponentProps) {
  return (
    <div className="celadon-page min-h-screen text-foreground">
      <SiteNav />
      <main className="mx-auto max-w-3xl px-4 pb-12 pt-24 sm:px-6">
        <h1 className="font-serif text-2xl font-bold">动漫与漫展资讯</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          最近 30 天的中文摘要与 AI 解读。漫展安排请以主办方最新公告为准。
        </p>
        <nav aria-label="资讯频道" className="mt-5 flex flex-wrap gap-2">
          {[{ id: undefined, label: "全部资讯" }, ...NEWS_FEEDS].map((item) => (
            <Button
              key={item.id ?? "all"}
              variant={channel === item.id ? "secondary" : "ghost"}
              render={
                <Link
                  to={newsListHref(item.id)}
                  aria-current={channel === item.id ? "page" : undefined}
                />
              }
            >
              {item.label}
            </Button>
          ))}
        </nav>
        <section
          aria-label="资讯列表"
          className="mt-5 rounded-xl border border-border bg-card px-3 sm:px-5"
        >
          {feed.items.length ? (
            <NewsArticleList items={feed.items} />
          ) : (
            <p className="py-10 text-sm text-muted-foreground">最近 30 天暂无资讯。</p>
          )}
        </section>
        <nav aria-label="资讯分页" className="mt-5 flex items-center justify-between gap-3">
          {feed.page > 1 ? (
            <Button variant="outline" render={<Link to={newsListHref(channel, feed.page - 1)} />}>
              上一页
            </Button>
          ) : (
            <span />
          )}
          <span className="text-xs text-muted-foreground">
            第 {feed.page} 页 · 共 {feed.total} 条
          </span>
          {feed.hasMore ? (
            <Button variant="outline" render={<Link to={newsListHref(channel, feed.page + 1)} />}>
              下一页
            </Button>
          ) : (
            <span />
          )}
        </nav>
        <NewsSyncStatus feed={feed} />
      </main>
    </div>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return (
    <div className="celadon-page min-h-screen text-foreground">
      <SiteNav />
      <main className="mx-auto max-w-3xl px-4 pb-12 pt-24">
        <h1 className="font-serif text-xl font-bold">资讯暂时无法读取</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {isRouteErrorResponse(error) && error.status === 503
            ? "资讯服务正在配置，请稍后再试。"
            : "请稍后刷新页面。"}
        </p>
        <Link to="/" className="mt-4 inline-block text-primary hover:underline">
          返回首页
        </Link>
      </main>
    </div>
  );
}
