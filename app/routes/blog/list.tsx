import { ExternalLink, Loader2, MessageCircle, MessageSquareText } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import type { Route } from "./+types/list";
import { SiteNav } from "~/components/site-nav";
import { SubjectSideLayout } from "~/components/subject-side-panel";
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
import { useSubjectSidePanel, type SubjectSidePanelControls } from "~/lib/subject-side-panel";
import { toProxiedImageUrl } from "~/lib/anime-meta";
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
  const side = useSubjectSidePanel();

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
    <div className="celadon-page flex min-h-screen flex-col text-foreground">
      <SiteNav activeType={blogSectionToSubjectType(section)} />

      <SubjectSideLayout side={side} contentClassName="overflow-x-hidden px-3 py-5 sm:px-6 sm:py-6">
        <header className="celadon-glass rounded-lg p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="mt-1 inline-flex items-center gap-2 font-serif text-xl font-bold text-foreground sm:text-2xl">
                <MessageSquareText className="size-5 shrink-0 text-primary sm:size-6" />
                {BLOG_SECTION_LABEL[section]}
              </h1>
              <p className="mt-1 text-xs text-muted-foreground">{BLOG_SECTION_DESC[section]}</p>
            </div>
            <a
              href={BGM_WEB_ROUTES_BLOG.sectionBlog(section)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-primary/25 bg-card px-3 py-2 text-xs font-bold text-primary shadow-sm transition-colors hover:bg-muted/50"
            >
              在 Bangumi 查看 <ExternalLink className="size-3.5" />
            </a>
          </div>

          <nav
            className="no-scrollbar mt-4 -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5"
            aria-label="日志板块"
          >
            {BLOG_SECTIONS.map((s) => (
              <Link
                key={s}
                to={blogListPath(s)}
                prefetch="intent"
                className={cn(
                  "shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                  s === section
                    ? "border-primary/25 bg-accent text-primary"
                    : "border-primary/25 bg-card text-foreground hover:border-primary/25 hover:bg-muted/50",
                )}
              >
                {BLOG_SECTION_LABEL[s]}
              </Link>
            ))}
          </nav>
        </header>

        {items.length === 0 ? (
          <p className="mt-6 rounded-lg border border-primary/25 bg-card px-4 py-10 text-center text-sm text-muted-foreground">
            暂无社区日志，请稍后再来。
          </p>
        ) : (
          <ul className="mt-5 grid min-w-0 gap-3 sm:grid-cols-2">
            {items.map((item) => (
              <BlogCard key={item.id} item={item} section={section} side={side} />
            ))}
          </ul>
        )}

        <div ref={sentinelRef} className="h-px" />

        <div className="py-6 text-center text-xs text-muted-foreground">
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
              className="rounded-full border border-primary/25 bg-accent px-3 py-1 text-primary hover:border-primary/25"
            >
              加载失败，点此重试
            </button>
          ) : hasMore ? (
            <span>下滑加载更多</span>
          ) : (
            <span>· 没有更多了 ·</span>
          )}
        </div>
      </SubjectSideLayout>
    </div>
  );
}

function BlogCard({
  item,
  section,
  side,
}: {
  item: BgmBlogItem;
  section: BlogSection;
  side: SubjectSidePanelControls;
}) {
  const blogId = item.id.replace(/\D/g, "");
  const cover = item.cover ?? item.avatar;
  const hasSubject = item.subjectId != null;
  const active = hasSubject && side.isActive(item.subjectId!);

  return (
    <li className="group rounded-lg border border-primary/25 bg-card p-3.5 transition-colors hover:border-primary/25 hover:bg-muted/50">
      <div className="flex items-start gap-3">
        {cover ? (
          hasSubject ? (
            <button
              type="button"
              onClick={() => side.open(item.subjectId!)}
              className="shrink-0"
              title={item.subjectName}
            >
              <img
                src={toProxiedImageUrl(cover)}
                alt=""
                loading="lazy"
                referrerPolicy="no-referrer"
                className={cn(
                  "h-16 w-12 rounded border object-cover shadow-sm transition-transform group-hover:scale-[1.02]",
                  active ? "border-primary/25 ring-2 ring-ring" : "border-primary/25",
                )}
              />
            </button>
          ) : (
            <img
              src={toProxiedImageUrl(cover)}
              alt=""
              loading="lazy"
              referrerPolicy="no-referrer"
              className="h-16 w-12 shrink-0 rounded border border-primary/25 object-cover"
            />
          )
        ) : null}
        <div className="min-w-0 flex-1">
          <Link to={blogDetailPath(section, blogId)} prefetch="intent" className="block">
            <h2 className="line-clamp-2 text-sm font-bold leading-snug text-foreground group-hover:text-primary">
              {item.title}
            </h2>
            {item.excerpt ? (
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                {item.excerpt}
              </p>
            ) : null}
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[10px] text-muted-foreground">
            {item.author ? <span className="font-medium text-primary">{item.author}</span> : null}
            {item.subjectName && hasSubject ? (
              <>
                <span>·</span>
                <span>评论</span>
                <button
                  type="button"
                  onClick={() => side.open(item.subjectId!)}
                  className={cn(
                    "font-medium hover:underline",
                    active ? "text-primary" : "text-info",
                  )}
                >
                  {item.subjectName}
                </button>
              </>
            ) : null}
            {item.publishedAt ? (
              <>
                <span>·</span>
                <time dateTime={item.publishedAt} className="font-mono">
                  {formatWhen(item.publishedAt)}
                </time>
              </>
            ) : null}
            {typeof item.replies === "number" ? (
              <>
                <span>·</span>
                <span className="inline-flex items-center gap-0.5">
                  <MessageCircle className="size-3" />
                  {item.replies}
                </span>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </li>
  );
}
