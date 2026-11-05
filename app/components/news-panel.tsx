import { Button } from "~/components/ui/button";
import { ExternalLink, Newspaper } from "lucide-react";
import { useMemo, useState } from "react";
import type { NewsFeed } from "~/lib/news";
import { Skeleton } from "~/components/ui/skeleton";
import { cn } from "~/lib/utils";

type NewsPanelProps = {
  feed: NewsFeed;
  className?: string;
};

/** 固定结构骨架，避免异步资讯插入时把页脚顶得乱跳 */
export function NewsPanelSkeleton({ className }: { className?: string }) {
  return (
    <section
      className={cn(
        "rounded-xl border border-border/70 bg-card/60 p-5 shadow-xs backdrop-blur-xs",
        className,
      )}
      aria-busy="true"
      aria-label="资讯加载中"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-3 w-24 bg-muted" />
          <Skeleton className="h-6 w-40 bg-muted" />
          <Skeleton className="h-3 w-64 max-w-full bg-muted" />
        </div>
        <Skeleton className="size-5 shrink-0 rounded bg-muted" />
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        {[0, 1].map((col) => (
          <div key={col} className="space-y-2">
            <Skeleton className="mb-2 h-4 w-20 bg-muted" />
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-[4.5rem] w-full rounded-lg bg-muted" />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

export function NewsPanelError({
  className,
  message = "暂时无法拉取资讯，请稍后刷新。",
}: {
  className?: string;
  message?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border border-border/70 bg-card/60 p-5 shadow-xs backdrop-blur-xs",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="mt-1 font-serif text-xl font-bold text-foreground">资讯与社区动态</h2>
        </div>
        <Newspaper className="size-5 shrink-0 text-primary" />
      </div>
      <p className="mt-5 rounded-lg border border-primary/25 bg-card px-4 py-6 text-center text-sm text-muted-foreground">
        {message}
      </p>
    </section>
  );
}

function formatWhen(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function NewsPanel({ feed, className }: NewsPanelProps) {
  const [hidden, setHidden] = useState<Set<string>>(() => new Set());

  // 筛选项从条目本身的 source 去重（AniNews 会拆成 Comic Book / Anime Corner 等）
  const sourceStats = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of feed.items) {
      counts.set(item.source, (counts.get(item.source) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);
  }, [feed.items]);

  const toggleSource = (label: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
  };

  const visibleItems = feed.items.filter((x) => !hidden.has(x.source));
  const zhItems = visibleItems.filter((x) => x.locale === "zh");
  const enItems = visibleItems.filter((x) => x.locale === "en");
  const failedSources = feed.sources.filter((s) => !s.ok);

  return (
    <section
      className={cn(
        "rounded-xl border border-border/70 bg-card/60 p-5 shadow-xs backdrop-blur-xs",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="mt-1 font-serif text-xl font-bold text-foreground">资讯与社区动态</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            作品消息、社区讨论与国际快讯，按来源筛选。
          </p>
        </div>
        <Newspaper className="size-5 shrink-0 text-primary" />
      </div>

      {sourceStats.length > 0 ? (
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[10px] font-medium text-muted-foreground">
            来源（点击筛选）
          </span>
          {sourceStats.map((s) => {
            const off = hidden.has(s.label);
            return (
              <Button
                variant="ghost"
                key={s.label}
                type="button"
                onClick={() => toggleSource(s.label)}
                aria-pressed={!off}
                className={cn(
                  "h-7 rounded-lg border px-2.5 font-mono text-[11px] font-medium transition-all",
                  off
                    ? "border-border/60 bg-muted/50 text-muted-foreground line-through opacity-70"
                    : "border-primary/25 bg-primary/10 text-primary hover:border-primary/40",
                )}
              >
                {s.label} {s.count}
              </Button>
            );
          })}
        </div>
      ) : null}

      {feed.items.length === 0 ? (
        <p className="mt-5 rounded-lg border border-primary/25 bg-card px-4 py-6 text-center text-sm text-muted-foreground">
          暂时无法拉取资讯，请稍后刷新。
        </p>
      ) : (
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <NewsColumn title="中文快讯" items={zhItems} emptyHint="中文源暂不可用" />
          <NewsColumn title="国际快讯" items={enItems} emptyHint="AniNews 暂不可用" />
        </div>
      )}

      {failedSources.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-primary/25 pt-3 text-[10px] text-muted-foreground">
          {failedSources.map((s) => (
            <span
              key={s.id}
              title="该来源暂时不可用"
              className="rounded-full border border-warning/25 bg-warning/10 px-2 py-0.5 text-rating"
            >
              {s.label} 离线
            </span>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function NewsColumn({
  title,
  items,
  emptyHint,
}: {
  title: string;
  items: NewsFeed["items"];
  emptyHint: string;
}) {
  return (
    <div>
      <h3 className="mb-2 font-serif text-sm font-bold text-primary">{title}</h3>
      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-primary/25 bg-card px-3 py-4 text-xs text-muted-foreground">
          {emptyHint}
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {items.slice(0, 8).map((item) => (
            <li key={item.id}>
              <a
                href={item.link}
                target="_blank"
                rel="noreferrer"
                className="group block rounded-lg px-2.5 py-2.5 transition-all hover:bg-muted/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="line-clamp-2 text-sm font-medium leading-snug text-foreground group-hover:text-primary">
                    {item.title}
                  </span>
                  <ExternalLink className="mt-0.5 size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                  <span className="font-medium text-muted-foreground">{item.source}</span>
                  {item.publishedAt ? (
                    <time dateTime={item.publishedAt}>{formatWhen(item.publishedAt)}</time>
                  ) : null}
                </div>
                {item.excerpt ? (
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                    {item.excerpt}
                  </p>
                ) : null}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
