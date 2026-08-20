import { ExternalLink, Loader2, MessageCircle, MessageSquareText } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import type { Route } from "./+types/list";
import { SiteNav } from "~/components/site-nav";
import { fetchBlogListPage } from "~/lib/bangumi/server/blog/list.server";
import type { BgmBlogItem, BgmBlogPage } from "~/lib/bangumi/types-blog";
import { BGM_WEB_ROUTES_BLOG } from "~/lib/bangumi/web-urls";
import {
  BLOG_SECTION_DESC,
  BLOG_SECTION_LABEL,
  BLOG_SECTIONS,
  blogDetailPath,
  blogListPath,
  blogSectionToSubjectType,
  parseBlogSection,
  type BlogSection,
} from "~/lib/bangumi/blog-section";
import { cn } from "~/lib/utils";

export async function loader({ params, request }: Route.LoaderArgs) {
  const section = parseBlogSection(params.section);
  if (!section) throw new Response("未知日志板块", { status: 404 });

  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const data = await fetchBlogListPage(section, page);
  return { ...data, section };
}

export function meta({ data }: Route.MetaArgs) {
  const label = data?.section ? BLOG_SECTION_LABEL[data.section] : "日志";
  return [
    { title: `${label} · 亚域空间` },
    {
      name: "description",
      content: data?.section ? BLOG_SECTION_DESC[data.section] : "Bangumi 社区日志",
    },
  ];
}

function formatWhen(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("zh-CN", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function dedupe(items: BgmBlogItem[]): BgmBlogItem[] {
  const seen = new Set<string>();
  const out: BgmBlogItem[] = [];
  for (const it of items) {
    if (seen.has(it.id)) continue;
    seen.add(it.id);
    out.push(it);
  }
  return out;
}

export default function BlogListPage({ loaderData }: Route.ComponentProps) {
  const section = loaderData.section;
  const [items, setItems] = useState<BgmBlogItem[]>(loaderData.items);
  const [page, setPage] = useState(loaderData.page);
  const [hasMore, setHasMore] = useState(loaderData.hasMore);
  const [loading, setLoading] = useState(false);
  const [errored, setErrored] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // 切换板块时重置（同模块多 section 路由可能复用实例）
  useEffect(() => {
    setItems(loaderData.items);
    setPage(loaderData.page);
    setHasMore(loaderData.hasMore);
    setErrored(false);
    setLoading(false);
  }, [loaderData]);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    setErrored(false);
    try {
      const next = page + 1;
      const res = await fetch(`/api/bgm-blog?section=${section}&page=${next}`);
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as BgmBlogPage;
      setItems((prev) => dedupe([...prev, ...data.items]));
      setPage(next);
      setHasMore(data.hasMore && data.items.length > 0);
    } catch {
      // 失败不等于没有下一页（014）：保留 hasMore，仅标记 errored
      setErrored(true);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, page, section]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore();
      },
      { rootMargin: "600px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore]);

  return (
    <div className="celadon-page min-h-screen text-slate-800">
      <SiteNav activeType={blogSectionToSubjectType(section)} />

      <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
        <header className="celadon-glass rounded-lg p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <span className="font-mono text-xs font-semibold uppercase tracking-widest text-rose-600">
                Bangumi Blog
              </span>
              <h1 className="mt-1 inline-flex items-center gap-2 font-serif text-2xl font-bold text-slate-800">
                <MessageSquareText className="size-6 text-rose-600" />
                {BLOG_SECTION_LABEL[section]}
              </h1>
              <p className="mt-1 text-xs text-slate-500">{BLOG_SECTION_DESC[section]}</p>
            </div>
            <a
              href={BGM_WEB_ROUTES_BLOG.sectionBlog(section)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-lg border border-rose-100 bg-white/70 px-3 py-2 text-xs font-bold text-rose-800 shadow-sm transition-colors hover:bg-white"
            >
              在 Bangumi 查看 <ExternalLink className="size-3.5" />
            </a>
          </div>

          <nav className="mt-4 flex flex-wrap gap-1.5" aria-label="日志板块">
            {BLOG_SECTIONS.map((s) => (
              <Link
                key={s}
                to={blogListPath(s)}
                prefetch="intent"
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                  s === section
                    ? "border-rose-300 bg-rose-50 text-rose-800"
                    : "border-rose-100 bg-white/60 text-slate-600 hover:border-rose-200 hover:bg-white",
                )}
              >
                {BLOG_SECTION_LABEL[s]}
              </Link>
            ))}
          </nav>
        </header>

        {items.length === 0 ? (
          <p className="mt-6 rounded-lg border border-rose-100 bg-white/60 px-4 py-10 text-center text-sm text-slate-500">
            暂无社区日志，请稍后再来。
          </p>
        ) : (
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {items.map((item) => (
              <BlogCard key={item.id} item={item} section={section} />
            ))}
          </ul>
        )}

        <div ref={sentinelRef} className="h-px" />

        <div className="py-6 text-center text-xs text-slate-400">
          {loading ? (
            <span className="inline-flex items-center gap-1.5">
              <Loader2 className="size-3.5 animate-spin" />
              加载中…
            </span>
          ) : errored ? (
            <button
              type="button"
              onClick={() => {
                void loadMore();
              }}
              className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-rose-700 hover:border-rose-300"
            >
              加载失败，点此重试
            </button>
          ) : hasMore ? (
            <span>下滑加载更多</span>
          ) : (
            <span>· 没有更多了 ·</span>
          )}
        </div>
      </main>
    </div>
  );
}

function BlogCard({ item, section }: { item: BgmBlogItem; section: BlogSection }) {
  const blogId = item.id.replace(/\D/g, "");
  return (
    <li className="group rounded-lg border border-rose-100/80 bg-white/65 p-3.5 transition-colors hover:border-rose-300 hover:bg-white">
      <Link to={blogDetailPath(section, blogId)} prefetch="intent" className="block">
        <div className="flex items-start gap-3">
          {item.avatar ? (
            <img
              src={item.avatar}
              alt=""
              loading="lazy"
              className="size-9 shrink-0 rounded-full border border-rose-100 object-cover"
            />
          ) : null}
          <div className="min-w-0 flex-1">
            <h2 className="line-clamp-2 text-sm font-bold leading-snug text-slate-800 group-hover:text-rose-800">
              {item.title}
            </h2>
            {item.excerpt ? (
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">
                {item.excerpt}
              </p>
            ) : null}
            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-slate-400">
              {item.author ? (
                <span className="font-medium text-rose-700">{item.author}</span>
              ) : null}
              {item.publishedAt ? (
                <time dateTime={item.publishedAt} className="font-mono">
                  {formatWhen(item.publishedAt)}
                </time>
              ) : null}
              {typeof item.replies === "number" ? (
                <span className="inline-flex items-center gap-0.5">
                  <MessageCircle className="size-3" />
                  {item.replies}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </Link>
    </li>
  );
}
