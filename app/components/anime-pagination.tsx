import { Link } from "react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "~/lib/utils";
import { LIST_PAGE_SIZE } from "~/lib/bangumi/constants";

type AnimePaginationProps = {
  page: number;
  total: number;
  pageSize?: number;
  baseParams: Record<string, string>;
};

function buildPageUrl(baseParams: Record<string, string>, page: number) {
  const params = new URLSearchParams(baseParams);
  if (page > 1) params.set("page", String(page));
  else params.delete("page");
  const qs = params.toString();
  return qs ? `/anime?${qs}` : "/anime";
}

function pageRange(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "…")[] = [1];
  if (current > 3) pages.push("…");
  for (
    let p = Math.max(2, current - 1);
    p <= Math.min(total - 1, current + 1);
    p++
  ) {
    pages.push(p);
  }
  if (current < total - 2) pages.push("…");
  pages.push(total);
  return pages;
}

const navBtnClass =
  "inline-flex h-8 items-center gap-1 rounded-lg border border-rose-100 bg-white/70 px-2.5 text-sm font-bold text-rose-800 shadow-sm transition-colors hover:bg-white disabled:pointer-events-none disabled:opacity-40";

export function AnimePagination({
  page,
  total,
  pageSize = LIST_PAGE_SIZE,
  baseParams,
}: AnimePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  const pages = pageRange(page, totalPages);
  const prevUrl = buildPageUrl(baseParams, page - 1);
  const nextUrl = buildPageUrl(baseParams, page + 1);

  return (
    <nav
      aria-label="分页"
      className="flex flex-wrap items-center justify-center gap-1 border-t border-rose-100/80 px-4 py-4"
    >
      {page > 1 ? (
        <Link to={prevUrl} prefetch="intent" className={navBtnClass}>
          <ChevronLeft className="size-4" />
          上一页
        </Link>
      ) : (
        <span className={cn(navBtnClass, "opacity-40")} aria-disabled>
          <ChevronLeft className="size-4" />
          上一页
        </span>
      )}

      <div className="flex items-center gap-0.5 px-1">
        {pages.map((p, i) =>
          p === "…" ? (
            <span
              key={`ellipsis-${i}`}
              className="px-1.5 text-xs text-muted-foreground"
            >
              …
            </span>
          ) : (
            <Link
              key={p}
              to={buildPageUrl(baseParams, p)}
              prefetch="intent"
              className={cn(
                "inline-flex size-8 items-center justify-center rounded-lg font-mono text-xs font-bold transition-colors",
                p === page
                  ? "bg-gradient-to-r from-rose-300 to-sky-300 text-slate-700 shadow-sm"
                  : "text-slate-500 hover:bg-white/70 hover:text-rose-700",
              )}
              aria-current={p === page ? "page" : undefined}
            >
              {p}
            </Link>
          ),
        )}
      </div>

      {page < totalPages ? (
        <Link to={nextUrl} prefetch="intent" className={navBtnClass}>
          下一页
          <ChevronRight className="size-4" />
        </Link>
      ) : (
        <span className={cn(navBtnClass, "opacity-40")} aria-disabled>
          下一页
          <ChevronRight className="size-4" />
        </span>
      )}

      <span className="w-full text-center font-mono text-[11px] text-slate-500 sm:w-auto sm:pl-2">
        第 {page} / {totalPages} 页 · 共 {total} 条
      </span>
    </nav>
  );
}
