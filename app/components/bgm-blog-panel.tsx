import { ExternalLink, MessageSquareText } from "lucide-react";
import type { BgmBlogItem } from "~/lib/bangumi/types-blog";
import { BGM_WEB_ROUTES_BLOG } from "~/lib/bangumi/web-urls";

type BgmBlogPanelProps = {
  items: BgmBlogItem[];
  title?: string;
  moreUrl?: string;
  emptyHint?: string;
  compact?: boolean;
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

export function BgmBlogPanel({
  items,
  title = "Bangumi 动画日志",
  moreUrl = BGM_WEB_ROUTES_BLOG.animeBlog(),
  emptyHint = "暂无社区日志",
  compact = false,
}: BgmBlogPanelProps) {
  return (
    <section className="space-y-3 rounded-lg border border-rose-100 bg-white/58 p-3 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-800">
          <MessageSquareText className="size-4 text-rose-600" />
          {title}
        </h3>
        <a
          href={moreUrl}
          target="_blank"
          rel="noreferrer"
          className="text-xs font-bold text-rose-700 hover:underline"
        >
          在 Bangumi 查看 →
        </a>
      </div>

      <p className="text-[11px] leading-relaxed text-slate-500">
        用户撰写的观后感、吐槽与讨论，数据来自 Bangumi 官方 RSS。
      </p>

      {items.length ? (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-lg border border-rose-100/80 bg-white/70 px-3 py-2.5"
            >
              <a href={item.link} target="_blank" rel="noreferrer" className="group block">
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={`font-medium leading-snug text-slate-800 group-hover:text-rose-800 ${compact ? "line-clamp-2 text-xs" : "text-sm"}`}
                  >
                    {item.title}
                  </span>
                  <ExternalLink className="mt-0.5 size-3.5 shrink-0 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
                {item.publishedAt ? (
                  <time
                    dateTime={item.publishedAt}
                    className="mt-1 block font-mono text-[10px] text-slate-500"
                  >
                    {formatWhen(item.publishedAt)}
                  </time>
                ) : null}
                {!compact && item.excerpt ? (
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">
                    {item.excerpt}
                  </p>
                ) : null}
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-lg border border-dashed border-rose-100 bg-rose-50/40 px-3 py-4 text-center text-xs text-slate-500">
          {emptyHint}
        </p>
      )}
    </section>
  );
}
