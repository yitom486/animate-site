import { ExternalLink, Newspaper } from "lucide-react";
import { useMemo, useState } from "react";
import type { NewsFeed } from "~/lib/news";
import { cn } from "~/lib/utils";

type NewsPanelProps = {
  feed: NewsFeed;
  className?: string;
};

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
    <section className={cn("celadon-glass rounded-lg p-5", className)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="font-mono text-xs font-semibold uppercase tracking-widest text-rose-600">
            ACG Chronicle
          </span>
          <h2 className="mt-1 font-serif text-xl font-bold text-slate-800">
            今日亚文化资讯
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            中文：Bangumi 动画日志 · Google 新闻 · 垂直源（需自建 RSSHub）· 国际：AniNews
          </p>
        </div>
        <Newspaper className="size-5 shrink-0 text-rose-600" />
      </div>

      {sourceStats.length > 0 ? (
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[10px] font-medium text-slate-400">
            来源（点击筛选）
          </span>
          {sourceStats.map((s) => {
            const off = hidden.has(s.label);
            return (
              <button
                key={s.label}
                type="button"
                onClick={() => toggleSource(s.label)}
                aria-pressed={!off}
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[10px] transition-colors",
                  off
                    ? "border-slate-200 bg-slate-50 text-slate-400 line-through"
                    : "border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300",
                )}
              >
                {s.label} {s.count}
              </button>
            );
          })}
        </div>
      ) : null}

      {feed.items.length === 0 ? (
        <p className="mt-5 rounded-lg border border-rose-100 bg-white/60 px-4 py-6 text-center text-sm text-slate-500">
          暂时无法拉取资讯，请稍后刷新。
        </p>
      ) : (
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <NewsColumn title="中文快讯" items={zhItems} emptyHint="中文源暂不可用" />
          <NewsColumn title="国际快讯" items={enItems} emptyHint="AniNews 暂不可用" />
        </div>
      )}

      {failedSources.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-rose-100/80 pt-3 text-[10px] text-slate-400">
          {failedSources.map((s) => (
            <span
              key={s.id}
              title={s.error}
              className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-amber-700"
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
      <h3 className="mb-2 font-serif text-sm font-bold text-rose-800">{title}</h3>
      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-rose-100 bg-white/50 px-3 py-4 text-xs text-slate-500">
          {emptyHint}
        </p>
      ) : (
        <ul className="space-y-2">
          {items.slice(0, 8).map((item) => (
            <li key={item.id}>
              <a
                href={item.link}
                target="_blank"
                rel="noreferrer"
                className="group block rounded-lg border border-rose-100/80 bg-white/65 px-3 py-2.5 transition-colors hover:border-rose-300 hover:bg-white"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="line-clamp-2 text-sm font-medium leading-snug text-slate-800 group-hover:text-rose-800">
                    {item.title}
                  </span>
                  <ExternalLink className="mt-0.5 size-3.5 shrink-0 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
                  <span className="rounded bg-rose-50 px-1.5 py-px font-medium text-rose-700">
                    {item.source}
                  </span>
                  {item.publishedAt ? (
                    <time dateTime={item.publishedAt}>{formatWhen(item.publishedAt)}</time>
                  ) : null}
                </div>
                {item.excerpt ? (
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">
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
