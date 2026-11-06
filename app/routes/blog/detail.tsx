import { ArrowLeft, ExternalLink } from "lucide-react";
import { Link } from "react-router";
import { useState } from "react";
import type { Route } from "./+types/detail";
import { SiteNav } from "~/components/site-nav";
import { SubjectDetailDrawer } from "~/components/subject-detail-drawer";
import { fetchBgmBlogDetail } from "~/lib/bangumi/server/blog/detail.server";
import {
  BLOG_SECTION_LABEL,
  blogListPath,
  blogSectionToSubjectType,
  parseBlogSection,
} from "~/lib/bangumi/blog-section";
import { useSubjectSidePanel } from "~/lib/subject-side-panel";
import { toProxiedImageUrl } from "~/lib/anime-meta";
import { AnimeCover } from "~/components/anime-cover";
import { CACHE_MAX_ENTRIES, CACHE_TTL_DETAIL_MS } from "~/lib/bangumi/constants";
import { createRouteClientCache, readThroughRouteCache } from "~/lib/route-client-cache";
import { cn } from "~/lib/utils";
import type { ShouldRevalidateFunctionArgs } from "react-router";

function BlogAuthorAvatar({ url, name }: { url?: string; name?: string }) {
  const [error, setError] = useState(false);
  const proxied = toProxiedImageUrl(url);

  if (!proxied || error) {
    return (
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-primary/25 bg-muted font-mono text-[10px] font-bold text-primary">
        {(name || "U").slice(0, 1).toUpperCase()}
      </span>
    );
  }

  return (
    <img
      src={proxied}
      alt=""
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setError(true)}
      className="size-6 shrink-0 rounded-full border border-primary/25 object-cover"
    />
  );
}

type BlogDetailData = {
  post: Awaited<ReturnType<typeof fetchBgmBlogDetail>>;
  section: NonNullable<ReturnType<typeof parseBlogSection>>;
};

const blogDetailClientCache = createRouteClientCache<BlogDetailData>({
  ttlMs: CACHE_TTL_DETAIL_MS,
  maxEntries: CACHE_MAX_ENTRIES.clientBlogDetail,
});

export async function loader({ params }: Route.LoaderArgs) {
  const section = parseBlogSection(params.section);
  if (!section) throw new Response("未知日志板块", { status: 404 });
  const post = await fetchBgmBlogDetail(params.id);
  return { post, section };
}

export async function clientLoader({ params, serverLoader }: Route.ClientLoaderArgs) {
  const key = `${params.section ?? ""}:${params.id ?? ""}`;
  return readThroughRouteCache(blogDetailClientCache, key, () => serverLoader());
}
clientLoader.hydrate = true;

export function shouldRevalidate({
  currentParams,
  nextParams,
  formMethod,
  defaultShouldRevalidate,
}: ShouldRevalidateFunctionArgs) {
  if (formMethod && formMethod.toUpperCase() !== "GET") return defaultShouldRevalidate;
  return currentParams.section !== nextParams.section || currentParams.id !== nextParams.id;
}

export function meta({ data }: Route.MetaArgs) {
  const fallback = data?.section ? BLOG_SECTION_LABEL[data.section] : "日志";
  return [{ title: `${data?.post?.title ?? fallback} · 亚域空间` }];
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

export default function BlogDetailPage({ loaderData }: Route.ComponentProps) {
  const { post, section } = loaderData;
  const listLabel = BLOG_SECTION_LABEL[section];
  const related = post.relatedSubjects ?? [];
  const side = useSubjectSidePanel();

  return (
    <div className="celadon-page flex min-h-screen flex-col text-foreground">
      <SiteNav activeType={blogSectionToSubjectType(section)} />

      <main className="mx-auto w-full max-w-3xl overflow-x-hidden px-3 py-5 sm:px-6 sm:py-6">
        <Link
          to={blogListPath(section)}
          prefetch="intent"
          className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
        >
          <ArrowLeft className="size-3.5" />
          返回{listLabel}
        </Link>

        <article className="celadon-glass mt-3 min-w-0 rounded-lg p-4 sm:p-6">
          <h1 className="font-serif text-xl font-bold leading-snug break-words text-foreground sm:text-2xl">
            {post.title}
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-2 border-b border-primary/25 pb-4 text-xs text-muted-foreground">
            {post.avatar ? <BlogAuthorAvatar url={post.avatar} name={post.author} /> : null}
            <span className="min-w-0 break-words">
              内容来自 Bangumi 用户{" "}
              {post.authorUrl ? (
                <a
                  href={post.authorUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-primary hover:underline"
                >
                  {post.author ?? "匿名"}
                </a>
              ) : (
                <span className="font-medium text-primary">{post.author ?? "匿名"}</span>
              )}
            </span>
            {post.publishedAt ? <span>· {formatWhen(post.publishedAt)}</span> : null}
            <a
              href={post.link}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-0.5 font-medium text-primary hover:underline"
            >
              · 查看原文 <ExternalLink className="size-3" />
            </a>
          </div>

          {related.length > 0 ? (
            <section className="mt-4 space-y-2" aria-label="关联条目">
              <h2 className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
                关联条目
              </h2>
              <ul className="grid gap-2 sm:grid-cols-2">
                {related.map((s) => {
                  const title = s.nameCn || s.name;
                  const active = side.isActive(s.id);
                  return (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => side.open(s.id)}
                        className={cn(
                          "flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-colors",
                          active
                            ? "border-primary/25 bg-accent"
                            : "border-primary/25 bg-card hover:border-primary/25 hover:bg-muted/50",
                        )}
                      >
                        {s.image ? (
                          <div className="h-14 w-10 shrink-0 overflow-hidden rounded border border-primary/25 shadow-2xs">
                            <AnimeCover
                              url={s.image}
                              alt={title}
                              className="size-full object-cover"
                            />
                          </div>
                        ) : (
                          <span className="h-14 w-10 shrink-0 rounded bg-accent" />
                        )}
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-foreground">
                            {title}
                          </span>
                          {s.nameCn && s.name !== s.nameCn ? (
                            <span className="mt-0.5 block truncate font-mono text-[10px] text-muted-foreground">
                              {s.name}
                            </span>
                          ) : null}
                          <span className="mt-1 block text-[10px] font-medium text-primary">
                            {active ? "详情已打开" : "打开条目详情"}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

          {post.contentHtml ? (
            <div
              className="blog-prose mt-5 space-y-3 text-sm leading-relaxed text-foreground [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-primary/25 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_h2]:mt-5 [&_h2]:font-bold [&_h3]:mt-4 [&_h3]:font-bold [&_img]:my-3 [&_img]:rounded-lg [&_li]:ml-4 [&_li]:list-disc sm:[&_li]:ml-5 [&_p]:leading-relaxed"
              dangerouslySetInnerHTML={{ __html: post.contentHtml }}
            />
          ) : (
            <p className="mt-5 rounded-lg border border-dashed border-primary/25 bg-card px-4 py-8 text-center text-sm text-muted-foreground">
              无法在站内加载正文，请{" "}
              <a
                href={post.link}
                target="_blank"
                rel="noreferrer"
                className="font-bold text-primary hover:underline"
              >
                前往 Bangumi 查看原文
              </a>
              。
            </p>
          )}
        </article>
      </main>

      <SubjectDetailDrawer
        id={side.isOpen ? Number(side.subjectId) : null}
        onClose={side.close}
      />
    </div>
  );
}
