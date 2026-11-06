import { ArrowRight, Building2, CalendarDays, Clock, MapPin, Sparkles, Tv } from "lucide-react";
import { Link } from "react-router";
import type { NewsFeed, NewsItem } from "~/lib/news/types";
import { NEWS_FEEDS, formatNewsDate, newsListHref } from "~/lib/news/config";
import { pickNewsShowcase, parseNewsItemMeta } from "~/lib/news/display";
import { Skeleton } from "~/components/ui/skeleton";
import { cn } from "~/lib/utils";

const HOME_SHOWCASE_LIMIT = 6;

export function NewsPanelSkeleton({ className }: { className?: string }) {
  return (
    <section
      className={cn("rounded-2xl border border-border/70 bg-card p-6 shadow-xs", className)}
      aria-busy="true"
      aria-label="资讯加载中"
    >
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-48 rounded-lg" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {[0, 1, 2, 3].map((idx) => (
          <div
            key={idx}
            className="flex gap-3 overflow-hidden rounded-xl border border-border/60 bg-muted/20 p-3"
          >
            <div className="min-w-0 flex-1 space-y-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-20 rounded-md" />
                <Skeleton className="h-4 w-28 rounded-md" />
              </div>
              <Skeleton className="h-6 w-4/5 rounded-md" />
              <Skeleton className="h-12 w-full rounded-md" />
            </div>
            <Skeleton className="size-24 shrink-0 rounded-xl sm:size-28" />
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
    <section className={cn("rounded-2xl border border-border/70 bg-card p-6 shadow-xs", className)}>
      <h2 className="font-serif text-xl font-bold text-foreground">动漫与漫展资讯</h2>
      <p role="status" className="mt-4 text-sm text-muted-foreground">
        {message}
      </p>
    </section>
  );
}

function NewsThumb({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="relative size-24 shrink-0 overflow-hidden rounded-xl border border-border/50 bg-muted/40 sm:size-28">
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        className="size-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
      />
    </div>
  );
}

/**
 * 资讯卡：有封面时右侧小缩略图；无封面不留占位，避免割裂。
 */
export function NewsCard({ item }: { item: NewsItem }) {
  const meta = parseNewsItemMeta(item);
  const isEvent = item.channel === "events";

  return (
    <Link
      to={`/news/${item.id}`}
      prefetch="intent"
      className="group relative flex gap-3 overflow-hidden rounded-2xl border border-border/70 bg-card p-3 shadow-xs transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 focus-visible:outline-2 focus-visible:outline-ring sm:gap-4 sm:p-4"
    >
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-3">
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold",
                  isEvent
                    ? "border border-primary/25 bg-primary/10 text-primary"
                    : "border border-primary/30 bg-primary/15 text-primary",
                )}
              >
                {isEvent ? (
                  <MapPin className="size-3 text-primary" />
                ) : (
                  <Tv className="size-3 text-primary" />
                )}
                {isEvent ? "漫展情报" : "动画速报"}
              </span>

              {meta.location ? (
                <span className="inline-flex items-center gap-1 rounded-md border border-border/70 bg-muted/60 px-2 py-0.5 text-xs text-foreground">
                  <MapPin className="size-3 text-muted-foreground" />
                  {meta.location}
                </span>
              ) : null}

              {meta.eventDates ? (
                <span className="inline-flex items-center gap-1 rounded-md border border-border/70 bg-muted/60 px-2 py-0.5 text-xs text-foreground">
                  <CalendarDays className="size-3 text-muted-foreground" />
                  {meta.eventDates}
                </span>
              ) : null}

              {meta.status ? (
                <span className="rounded-md border border-border/60 bg-muted/40 px-1.5 py-0.5 text-[11px] text-muted-foreground">
                  {meta.status}
                </span>
              ) : null}
            </div>

            {item.publishedAt ? (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="size-3 text-muted-foreground/80" />
                <time dateTime={item.publishedAt}>{formatNewsDate(item.publishedAt)}</time>
              </span>
            ) : null}
          </div>

          <h3 className="font-serif text-base font-bold leading-snug text-foreground transition-colors group-hover:text-primary sm:text-lg">
            {item.title}
          </h3>

          {meta.venue ? (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Building2 className="size-3.5 shrink-0 text-primary/70" />
              <span className="truncate">{meta.venue}</span>
            </div>
          ) : null}

          {meta.cleanExcerpt ? (
            <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground sm:line-clamp-3 sm:text-sm">
              {meta.cleanExcerpt}
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-between border-t border-border/60 pt-2.5 text-xs">
          <span className="truncate text-muted-foreground">{item.source}</span>
          <span className="inline-flex shrink-0 items-center gap-1 font-medium text-primary transition-transform group-hover:translate-x-0.5">
            阅读全文
            <ArrowRight
              className="size-3.5 transition-transform group-hover:translate-x-1"
              aria-hidden
            />
          </span>
        </div>
      </div>

      {item.image ? <NewsThumb src={item.image} alt="" /> : null}
    </Link>
  );
}

export function NewsArticleList({
  items,
  variant = "grid",
}: {
  items: NewsItem[];
  variant?: "grid" | "list";
}) {
  if (variant === "grid") {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {items.map((item) => (
          <NewsCard key={item.id} item={item} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <NewsCard key={item.id} item={item} />
      ))}
    </div>
  );
}

export function NewsSyncStatus({ feed }: { feed: NewsFeed }) {
  const failed = feed.sources.filter((source) => !source.ok);
  if (!failed.length) return null;
  return (
    <p
      role="status"
      className="mt-4 border-t border-border/60 pt-3 text-xs leading-relaxed text-muted-foreground"
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
    <section className={cn("rounded-2xl border border-border/70 bg-card p-6 shadow-xs", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-serif text-xl font-bold text-foreground">动漫与漫展资讯</h2>
            <span className="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              <Sparkles className="size-3 text-primary" />
              实时情报
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            站内阅读中文归纳、背景补充与解读，保留原文官方链接。
          </p>
        </div>
        <Link
          to="/news"
          className="inline-flex items-center gap-1 rounded-lg border border-border/70 bg-background/50 px-3 py-1.5 text-xs font-semibold text-primary shadow-2xs transition-all hover:border-primary/40 hover:bg-card hover:text-primary"
        >
          进入资讯中心
          <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {NEWS_FEEDS.map((channel) => {
          const channelItems = feed.items.filter((item) => item.channel === channel.id);
          const items = pickNewsShowcase(channelItems, HOME_SHOWCASE_LIMIT);
          const isEvent = channel.id === "events";

          return (
            <div key={channel.id} className="space-y-3">
              <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-2">
                <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
                  {isEvent ? (
                    <CalendarDays className="size-4 text-primary" />
                  ) : (
                    <Tv className="size-4 text-primary" />
                  )}
                  {channel.label}
                </h3>
                <Link
                  to={newsListHref(channel.id)}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-primary"
                >
                  查看全部
                  <ArrowRight className="size-3" aria-hidden />
                </Link>
              </div>

              {items.length ? (
                <div className="space-y-3">
                  {items.map((item) => (
                    <NewsCard key={item.id} item={item} />
                  ))}
                </div>
              ) : (
                <p className="py-8 text-center text-xs text-muted-foreground">
                  最近 30 天暂无资讯。
                </p>
              )}
            </div>
          );
        })}
      </div>

      <NewsSyncStatus feed={feed} />
    </section>
  );
}
