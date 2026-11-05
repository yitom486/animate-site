import { ArrowRight, Newspaper } from "lucide-react";
import { Link } from "react-router";
import type { NewsFeed, NewsItem } from "~/lib/news/types";
import { NEWS_FEEDS, formatNewsDate, newsListHref } from "~/lib/news/config";
import { Skeleton } from "~/components/ui/skeleton";
import { cn } from "~/lib/utils";

export function NewsPanelSkeleton({ className }: { className?: string }) {
  return (
    <section
      className={cn("rounded-xl border border-border/70 bg-card p-5 shadow-xs", className)}
      aria-busy="true"
      aria-label="资讯加载中"
    >
      <Skeleton className="h-6 w-40" />
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        {[0, 1].map((col) => (
          <div key={col} className="space-y-3">
            {[0, 1, 2].map((row) => (
              <Skeleton key={row} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

export function NewsPanelError({
  className,
  message = "资讯暂时无法读取。",
}: {
  className?: string;
  message?: string;
}) {
  return (
    <section className={cn("rounded-xl border border-border/70 bg-card p-5 shadow-xs", className)}>
      <h2 className="font-serif text-xl font-bold text-foreground">动漫与漫展资讯</h2>
      <p role="status" className="mt-4 text-sm text-muted-foreground">
        {message}
      </p>
    </section>
  );
}

export function NewsArticleList({ items }: { items: NewsItem[] }) {
  return (
    <ul className="divide-y divide-border">
      {items.map((item) => (
        <li key={item.id}>
          <Link
            to={`/news/${item.id}`}
            prefetch="intent"
            className="group block rounded-lg px-2 py-4 transition-colors hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-ring"
          >
            <h3 className="text-sm font-medium leading-relaxed text-foreground group-hover:text-primary">
              {item.title}
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{item.source}</span>
              {item.publishedAt ? (
                <time dateTime={item.publishedAt}>{formatNewsDate(item.publishedAt)}</time>
              ) : null}
            </div>
            {item.excerpt ? (
              <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                {item.excerpt}
              </p>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function NewsSyncStatus({ feed }: { feed: NewsFeed }) {
  const failed = feed.sources.filter((source) => !source.ok);
  if (!failed.length) return null;
  return (
    <p
      role="status"
      className="mt-4 border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground"
    >
      {failed
        .map(
          (source) =>
            `${source.label}：${source.lastSuccessAt ? `同步暂时失败，保留 ${formatNewsDate(source.lastSuccessAt)} 的内容` : "等待首次成功同步"}`,
        )
        .join("；")}
    </p>
  );
}

export function NewsPanel({ feed, className }: { feed: NewsFeed; className?: string }) {
  return (
    <section className={cn("rounded-xl border border-border/70 bg-card p-5 shadow-xs", className)}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-serif text-xl font-bold text-foreground">动漫与漫展资讯</h2>
        <Newspaper className="size-5 text-primary" aria-hidden />
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        站内阅读中文摘要与 AI 解读，保留原文来源。
      </p>
      <div className="mt-5 grid gap-6 lg:grid-cols-2">
        {NEWS_FEEDS.map((channel) => {
          const items = feed.items.filter((item) => item.channel === channel.id).slice(0, 6);
          return (
            <div key={channel.id}>
              <div className="mb-2 flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-foreground">{channel.label}</h3>
                <Link
                  to={newsListHref(channel.id)}
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  查看全部
                  <ArrowRight className="size-3" aria-hidden />
                </Link>
              </div>
              {items.length ? (
                <NewsArticleList items={items} />
              ) : (
                <p className="py-5 text-sm text-muted-foreground">最近 30 天暂无资讯。</p>
              )}
            </div>
          );
        })}
      </div>
      <NewsSyncStatus feed={feed} />
    </section>
  );
}
