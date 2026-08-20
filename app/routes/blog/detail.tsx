import { ArrowLeft, ExternalLink } from "lucide-react";
import { Link } from "react-router";
import type { Route } from "./+types/detail";
import { SiteNav } from "~/components/site-nav";
import { SubjectSideLayout } from "~/components/subject-side-panel";
import { fetchBgmBlogDetail } from "~/lib/bangumi/server/blog/detail.server";
import {
  BLOG_SECTION_LABEL,
  blogListPath,
  blogSectionToSubjectType,
  parseBlogSection,
} from "~/lib/bangumi/blog-section";
import { useSubjectSidePanel } from "~/lib/subject-side-panel";
import { cn } from "~/lib/utils";

export async function loader({ params }: Route.LoaderArgs) {
  const section = parseBlogSection(params.section);
  if (!section) throw new Response("未知日志板块", { status: 404 });
  const post = await fetchBgmBlogDetail(params.id);
  return { post, section };
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
    <div className="celadon-page flex min-h-screen flex-col text-slate-800">
      <SiteNav activeType={blogSectionToSubjectType(section)} />

      <SubjectSideLayout
        side={side}
        narrowMaxClass="max-w-3xl"
        wideMaxClass="max-w-6xl"
        openGridClass="lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]"
        contentClassName="overflow-x-hidden px-3 py-5 sm:px-6 sm:py-6"
      >
        <Link
          to={blogListPath(section)}
          prefetch="intent"
          className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 hover:underline"
        >
          <ArrowLeft className="size-3.5" />
          返回{listLabel}
        </Link>

        <article className="celadon-glass mt-3 min-w-0 rounded-lg p-4 sm:p-6">
          <h1 className="font-serif text-xl font-bold leading-snug break-words text-slate-900 sm:text-2xl">
            {post.title}
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-2 border-b border-rose-100/80 pb-4 text-xs text-slate-500">
            {post.avatar ? (
              <img
                src={post.avatar}
                alt=""
                loading="lazy"
                referrerPolicy="no-referrer"
                className="size-6 shrink-0 rounded-full border border-rose-100 object-cover"
              />
            ) : null}
            <span className="min-w-0 break-words">
              内容来自 Bangumi 用户{" "}
              {post.authorUrl ? (
                <a
                  href={post.authorUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-rose-700 hover:underline"
                >
                  {post.author ?? "匿名"}
                </a>
              ) : (
                <span className="font-medium text-rose-700">{post.author ?? "匿名"}</span>
              )}
            </span>
            {post.publishedAt ? <span>· {formatWhen(post.publishedAt)}</span> : null}
            <a
              href={post.link}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-0.5 font-medium text-rose-700 hover:underline"
            >
              · 查看原文 <ExternalLink className="size-3" />
            </a>
          </div>

          {related.length > 0 ? (
            <section className="mt-4 space-y-2" aria-label="关联条目">
              <h2 className="text-xs font-bold tracking-wide text-slate-500 uppercase">关联条目</h2>
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
                            ? "border-rose-300 bg-rose-50"
                            : "border-rose-100 bg-white/70 hover:border-rose-300 hover:bg-white",
                        )}
                      >
                        {s.image ? (
                          <img
                            src={s.image}
                            alt=""
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            className="h-14 w-10 shrink-0 rounded object-cover"
                          />
                        ) : (
                          <span className="h-14 w-10 shrink-0 rounded bg-rose-50" />
                        )}
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-slate-800">
                            {title}
                          </span>
                          {s.nameCn && s.name !== s.nameCn ? (
                            <span className="mt-0.5 block truncate font-mono text-[10px] text-slate-400">
                              {s.name}
                            </span>
                          ) : null}
                          <span className="mt-1 block text-[10px] font-medium text-rose-600">
                            {active ? "已在右侧打开" : "在右侧打开详情"}
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
              className="blog-prose mt-5 space-y-3 text-sm leading-relaxed text-slate-700 [&_a]:text-rose-700 [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-rose-200 [&_blockquote]:pl-3 [&_blockquote]:text-slate-500 [&_h2]:mt-5 [&_h2]:font-bold [&_h3]:mt-4 [&_h3]:font-bold [&_img]:my-3 [&_img]:rounded-lg [&_li]:ml-4 [&_li]:list-disc sm:[&_li]:ml-5 [&_p]:leading-relaxed"
              dangerouslySetInnerHTML={{ __html: post.contentHtml }}
            />
          ) : (
            <p className="mt-5 rounded-lg border border-dashed border-rose-100 bg-white/50 px-4 py-8 text-center text-sm text-slate-500">
              无法在站内加载正文，请{" "}
              <a
                href={post.link}
                target="_blank"
                rel="noreferrer"
                className="font-bold text-rose-700 hover:underline"
              >
                前往 Bangumi 查看原文
              </a>
              。
            </p>
          )}
        </article>
      </SubjectSideLayout>
    </div>
  );
}
