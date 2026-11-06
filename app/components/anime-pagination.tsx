import { Link } from "react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "~/lib/utils";
import { LIST_PAGE_SIZE } from "~/lib/bangumi/constants";
import { buildListUrl } from "~/lib/bangumi/params";

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
  return buildListUrl(params);
}

function pageRange(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "…")[] = [1];
  if (current > 3) pages.push("…");
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) {
    pages.push(p);
  }
  if (current < total - 2) pages.push("…");
  pages.push(total);
  return pages;
}

const navBtnClass =
  "inline-flex h-8 items-center gap-1 rounded-xl border border-border/70 bg-card px-3 text-xs font-bold text-foreground shadow-xs transition-colors hover:border-primary/40 hover:text-primary disabled:pointer-events-none disabled:opacity-40";

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
      className="flex flex-wrap items-center justify-center gap-1.5 border-t border-border/70 px-4 py-4"
    >
      {page > 1 ? (
        <Link to={prevUrl} prefetch="intent" className={navBtnClass}>
          <ChevronLeft className="size-4 text-primary" />
          上一页
        </Link>
      ) : (
        <span className={cn(navBtnClass, "opacity-40")} aria-disabled>
          <ChevronLeft className="size-4" />
          上一页
        </span>
      )}

      {/* 移动端紧凑型页码指示器 */}
      <span className="px-2 font-mono text-xs font-bold text-foreground sm:hidden">
        {page} / {totalPages}
      </span>

      {/* 桌面端完整数字分页导航 */}
      <div className="hidden sm:flex items-center gap-1 px-1">
        {pages.map((p, i) =>
          p === "…" ? (
            <span key={`ellipsis-${i}`} className="px-1.5 text-xs text-muted-foreground">
              …
            </span>
          ) : (
            <Link
              key={p}
              to={buildPageUrl(baseParams, p)}
              prefetch="intent"
              className={cn(
                "inline-flex size-8 items-center justify-center rounded-lg font-mono text-xs font-bold transition-all",
                p === page
                  ? "bg-primary text-primary-foreground shadow-xs shadow-primary/20"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-primary",
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
          <ChevronRight className="size-4 text-primary" />
        </Link>
      ) : (
        <span className={cn(navBtnClass, "opacity-40")} aria-disabled>
          下一页
          <ChevronRight className="size-4" />
        </span>
      )}

      <span className="w-full text-center font-mono text-[11px] text-muted-foreground sm:w-auto sm:pl-2">
        第 {page} / {totalPages} 页 · 共 {total} 条
      </span>
    </nav>
  );
}
