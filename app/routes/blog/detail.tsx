import { ArrowLeft, ExternalLink } from "lucide-react";
import { Link } from "react-router";
import type { Route } from "./+types/detail";
import { SiteNav } from "~/components/site-nav";
import { fetchBgmBlogDetail } from "~/lib/bangumi/server/blog/detail.server";
import {
  BLOG_SECTION_LABEL,
  blogListPath,
  blogSectionToSubjectType,
  parseBlogSection,
} from "~/lib/bangumi/blog-section";

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

  return (
    <div className="celadon-page min-h-screen text-slate-800">
      <SiteNav activeType={blogSectionToSubjectType(section)} />

      <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
        <Link
          to={blogListPath(section)}
          prefetch="intent"
          className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 hover:underline"
        >
          <ArrowLeft className="size-3.5" />
          返回{listLabel}
        </Link>

        <article className="celadon-glass mt-3 rounded-lg p-6">
          <h1 className="font-serif text-2xl font-bold leading-snug text-slate-900">
            {post.title}
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-2 border-b border-rose-100/80 pb-4 text-xs text-slate-500">
            {post.avatar ? (
              <img
                src={post.avatar}
                alt=""
                loading="lazy"
                referrerPolicy="no-referrer"
                className="size-6 rounded-full border border-rose-100 object-cover"
              />
            ) : null}
            <span>
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

          {post.contentHtml ? (
            <div
              className="mt-5 space-y-3 break-words text-sm leading-relaxed text-slate-700 [&_a]:text-rose-700 [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-rose-200 [&_blockquote]:pl-3 [&_blockquote]:text-slate-500 [&_h2]:mt-5 [&_h2]:font-bold [&_h3]:mt-4 [&_h3]:font-bold [&_img]:my-3 [&_img]:max-w-full [&_img]:rounded-lg [&_li]:ml-5 [&_li]:list-disc [&_p]:leading-relaxed"
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
      </main>
    </div>
  );
}
