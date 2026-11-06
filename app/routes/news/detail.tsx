import { Link, isRouteErrorResponse } from "react-router";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  Clock,
  ExternalLink,
  MapPin,
  ShieldAlert,
  Tv,
} from "lucide-react";
import type { Route } from "./+types/detail";
import { SiteNav } from "~/components/site-nav";
import { Button } from "~/components/ui/button";
import { newsDbFromContext, readNewsArticle } from "~/lib/news/db.server";
import { formatNewsDate, newsListHref } from "~/lib/news/config";
import { prepareNewsContent } from "~/lib/news/parse.server";
import { parseNewsItemMeta } from "~/lib/news/display";
import { cn } from "~/lib/utils";

export async function loader({ params, context }: Route.LoaderArgs) {
  const article = await readNewsArticle(newsDbFromContext(context), params.id);
  if (!article) throw new Response("资讯不存在或已超过 30 天保留期", { status: 404 });
  return { article: { ...article, contentHtml: prepareNewsContent(article.contentHtml) } };
}

export function meta({ data }: Route.MetaArgs) {
  return [{ title: `${data?.article.title ?? "资讯"} · 亚域空间` }];
}

export default function NewsDetailPage({ loaderData: { article } }: Route.ComponentProps) {
  const isEvent = article.channel === "events";
  const meta = parseNewsItemMeta(article);

  return (
    <div className="celadon-page min-h-screen text-foreground">
      <SiteNav />

      <main className="mx-auto max-w-4xl px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <nav aria-label="返回导航" className="mb-6">
          <Link
            to={newsListHref(article.channel)}
            className="group inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-1" />
            返回 {article.source}
          </Link>
        </nav>

        <article className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
          {article.image ? (
            <div className="relative aspect-[21/9] w-full overflow-hidden border-b border-border/60 bg-muted/30 sm:aspect-[2.4/1]">
              <img
                src={article.image}
                alt=""
                loading="eager"
                decoding="async"
                referrerPolicy="no-referrer"
                className="size-full object-cover"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
            </div>
          ) : null}

          <div className="p-6 sm:p-10">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                  isEvent
                    ? "border border-primary/25 bg-primary/10 text-primary"
                    : "border border-primary/30 bg-primary/15 text-primary",
                )}
              >
                {isEvent ? (
                  <CalendarDays className="size-3 text-primary" />
                ) : (
                  <Tv className="size-3 text-primary" />
                )}
                {isEvent ? "漫展情报" : "日本动画"}
              </span>

              <span className="rounded-full border border-border/70 bg-muted/40 px-2.5 py-0.5 text-xs text-muted-foreground">
                {article.source}
              </span>

              {article.publishedAt ? (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="size-3 text-muted-foreground/80" />
                  <time dateTime={article.publishedAt}>
                    {formatNewsDate(article.publishedAt)}（北京时间）
                  </time>
                </span>
              ) : null}
            </div>

            <h1 className="mt-4 break-words font-serif text-2xl font-bold leading-tight text-foreground sm:text-3xl">
              {article.title}
            </h1>

            {isEvent && (meta.location || meta.venue || meta.eventDates) ? (
              <div className="mt-6 grid gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 sm:grid-cols-3">
                {meta.location ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-xs font-semibold text-primary">
                      <MapPin className="size-3.5" />
                      举行城市
                    </div>
                    <p className="text-sm font-medium text-foreground">{meta.location}</p>
                  </div>
                ) : null}

                {meta.venue ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-xs font-semibold text-primary">
                      <Building2 className="size-3.5" />
                      展会场馆
                    </div>
                    <p className="text-sm font-medium text-foreground">{meta.venue}</p>
                  </div>
                ) : null}

                {meta.eventDates ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-xs font-semibold text-primary">
                      <CalendarDays className="size-3.5" />
                      展期时间
                    </div>
                    <p className="text-sm font-medium text-foreground">{meta.eventDates}</p>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="mt-6 flex items-start gap-3 rounded-xl border border-border/70 bg-muted/40 p-4 text-xs leading-relaxed text-muted-foreground sm:text-sm">
              <ShieldAlert className="mt-0.5 size-4 shrink-0 text-primary" />
              <p>
                本文基于公开线索整理为中文归纳、背景补充与解读。
                {isEvent
                  ? "第三方漫展信息待主办方最新核实，门票与嘉宾安排请以官方主办公告为准。"
                  : "请结合原始官方媒体报道核实具体开播与发售信息。"}
              </p>
            </div>

            <div
              className="blog-prose mt-8 space-y-4 break-words text-base leading-loose text-foreground [&_a]:text-primary [&_a]:underline [&_a.news-video-link]:inline-flex [&_a.news-video-link]:items-center [&_a.news-video-link]:rounded-lg [&_a.news-video-link]:border [&_a.news-video-link]:border-primary/25 [&_a.news-video-link]:bg-primary/10 [&_a.news-video-link]:px-2.5 [&_a.news-video-link]:py-1 [&_a.news-video-link]:no-underline [&_blockquote]:border-l-2 [&_blockquote]:border-primary/40 [&_blockquote]:bg-muted/20 [&_blockquote]:p-3 [&_blockquote]:text-muted-foreground [&_figure]:my-4 [&_figcaption]:mt-2 [&_figcaption]:text-center [&_figcaption]:text-xs [&_figcaption]:text-muted-foreground [&_h2]:mt-8 [&_h2]:font-serif [&_h2]:text-xl [&_h2]:font-bold [&_h3]:mt-6 [&_h3]:font-serif [&_h3]:text-lg [&_h3]:font-semibold [&_img]:my-3 [&_img]:rounded-xl [&_img]:border [&_img]:border-border/60 [&_li]:ml-5 [&_ol]:list-decimal [&_ul]:list-disc [&_video]:my-4 [&_video]:w-full [&_video]:rounded-xl"
              dangerouslySetInnerHTML={{ __html: article.contentHtml }}
            />

            <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-6">
              <Link
                to={newsListHref(article.channel)}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary"
              >
                <ArrowLeft className="size-3.5" />
                返回全部{article.source}
              </Link>

              <Button
                variant="outline"
                size="sm"
                className="rounded-xl border-border/70 bg-card hover:border-primary/40 hover:text-primary"
                render={<a href={article.link} target="_blank" rel="noopener noreferrer" />}
              >
                前往原始来源
                <ExternalLink className="size-3.5" aria-hidden />
              </Button>
            </footer>
          </div>
        </article>
      </main>
    </div>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const missing = isRouteErrorResponse(error) && error.status === 404;
  return (
    <div className="celadon-page min-h-screen text-foreground">
      <SiteNav />
      <main className="mx-auto max-w-3xl px-4 pb-12 pt-24 text-center">
        <h1 className="font-serif text-2xl font-bold">
          {missing ? "资讯不存在或已超过保留期" : "资讯暂时无法读取"}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {missing
            ? "本站仅展示最近 30 天的即时资讯；文章过期不代表相关活动取消。"
            : "网络连接或数据异常，请稍后刷新重试。"}
        </p>
        <Link
          to="/news"
          className="mt-6 inline-flex items-center gap-1 rounded-xl border border-primary/25 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/20"
        >
          返回资讯列表
        </Link>
      </main>
    </div>
  );
}
