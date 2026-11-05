import { Link, isRouteErrorResponse } from "react-router";
import { ArrowLeft, ExternalLink } from "lucide-react";
import type { Route } from "./+types/detail";
import { SiteNav } from "~/components/site-nav";
import { Button } from "~/components/ui/button";
import { newsDbFromContext, readNewsArticle } from "~/lib/news/db.server";
import { formatNewsDate, newsListHref } from "~/lib/news/config";
import { sanitizeNewsHtml } from "~/lib/news/parse.server";

export async function loader({ params, context }: Route.LoaderArgs) {
  const article = await readNewsArticle(newsDbFromContext(context), params.id);
  if (!article) throw new Response("资讯不存在或已超过 30 天保留期", { status: 404 });
  return { article: { ...article, contentHtml: sanitizeNewsHtml(article.contentHtml) } };
}

export function meta({ data }: Route.MetaArgs) {
  return [{ title: `${data?.article.title ?? "资讯"} · 亚域空间` }];
}

export default function NewsDetailPage({ loaderData: { article } }: Route.ComponentProps) {
  return (
    <div className="celadon-page min-h-screen text-foreground">
      <SiteNav />
      <main className="mx-auto max-w-3xl px-4 pb-12 pt-24 sm:px-6">
        <Link
          to={newsListHref(article.channel)}
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="size-4" aria-hidden />
          返回{article.source}
        </Link>
        <article className="mt-5 rounded-xl border border-border bg-card p-5 sm:p-8">
          <h1 className="break-words font-serif text-2xl font-bold leading-relaxed sm:text-3xl">
            {article.title}
          </h1>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-b border-border pb-5 text-xs text-muted-foreground">
            <span>{article.source}</span>
            <time dateTime={article.publishedAt}>
              {formatNewsDate(article.publishedAt)}（北京时间）
            </time>
          </div>
          <p className="mt-5 border-l-2 border-primary/30 pl-3 text-sm leading-relaxed text-muted-foreground">
            本文包含 AI 生成的摘要与解读，并非原文全文。
            {article.channel === "events"
              ? "第三方漫展信息待主办方核实，请以主办方最新公告为准。"
              : "请结合原始来源核实具体信息。"}
          </p>
          <div
            className="blog-prose mt-6 space-y-4 break-words text-base leading-loose text-foreground [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mt-6 [&_h3]:text-lg [&_h3]:font-semibold [&_li]:ml-5 [&_ol]:list-decimal [&_ul]:list-disc"
            dangerouslySetInnerHTML={{ __html: article.contentHtml }}
          />
          <footer className="mt-8 border-t border-border pt-5">
            <Button
              variant="outline"
              render={<a href={article.link} target="_blank" rel="noopener noreferrer" />}
            >
              查看来源
              <ExternalLink className="size-4" aria-hidden />
            </Button>
          </footer>
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
      <main className="mx-auto max-w-3xl px-4 pb-12 pt-24">
        <h1 className="font-serif text-xl font-bold">
          {missing ? "资讯不存在或已超过保留期" : "资讯暂时无法读取"}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {missing ? "本站展示最近 30 天资讯；文章过期不代表相关活动取消。" : "请稍后再试。"}
        </p>
        <Link to="/news" className="mt-4 inline-block text-primary hover:underline">
          返回资讯列表
        </Link>
      </main>
    </div>
  );
}
