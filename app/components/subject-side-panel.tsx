import { Button } from "~/components/ui/button";
import { type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { subjectDetailQuery } from "~/lib/subject-queries";
import { Link } from "react-router";
import { ExternalLink, Loader2, X } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import type { DetailPayload } from "~/lib/bangumi/types-detail";
import { buildDetailUrl } from "~/lib/bangumi/params";
import { BGM_WEB_ROUTES } from "~/lib/external-links";
import {
  isAnimeSubjectType,
  subjectCountLabel,
  subjectDateLabel,
} from "~/lib/bangumi/subject-display";
import { toProxiedImageUrl } from "~/lib/anime-meta";
import type { SubjectSidePanelControls } from "~/lib/subject-side-panel";
import { cn } from "~/lib/utils";

/** 条目侧栏面板：复用浏览器 Query 缓存，预览关闭后取消未完成请求。 */
export function SubjectSidePanel({ id, onClose }: { id: string; onClose: () => void }) {
  const query = useQuery(subjectDetailQuery(id));

  return (
    <aside className="flex h-full min-h-0 min-w-0 flex-col border-l border-primary/25 bg-card">
      <div className="flex items-center justify-between gap-2 border-b border-primary/25 p-3">
        <span className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
          条目详情
        </span>
        <Button
          variant="ghost"
          type="button"
          onClick={onClose}
          className="rounded-lg border border-primary/25 bg-card p-1.5 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-primary"
          aria-label="关闭条目详情"
        >
          <X className="size-4" />
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {query.isPending ? (
          <p className="flex items-center justify-center gap-2 py-16 text-xs text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            加载条目中…
          </p>
        ) : null}

        {query.isError && !query.data ? (
          <div className="rounded-lg border border-dashed border-primary/25 bg-card px-4 py-10 text-center text-xs text-muted-foreground">
            <p role="status">条目暂不可用（{query.error?.message}）</p>
            <Button
              variant="ghost"
              onClick={() => void query.refetch()}
              disabled={query.isFetching}
            >
              {query.isFetching ? "重试中…" : "重新加载"}
            </Button>
          </div>
        ) : null}

        {query.data ? <PanelBody data={query.data} /> : null}
      </div>
    </aside>
  );
}

/**
 * 左右分栏壳：主内容 + 可选侧栏。
 * 用法：
 * ```tsx
 * const side = useSubjectSidePanel();
 * <SubjectSideLayout side={side}>…</SubjectSideLayout>
 * // 任意处 side.open(id)
 * ```
 */
export function SubjectSideLayout({
  side,
  children,
  className,
  contentClassName,
  narrowMaxClass = "max-w-5xl",
  wideMaxClass = "max-w-6xl",
  openGridClass = "lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]",
}: {
  side: SubjectSidePanelControls;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  narrowMaxClass?: string;
  wideMaxClass?: string;
  openGridClass?: string;
}) {
  return (
    <div
      className={cn(
        "mx-auto grid w-full min-h-0 flex-1",
        side.isOpen ? cn(wideMaxClass, openGridClass) : cn(narrowMaxClass, "grid-cols-1"),
        className,
      )}
    >
      <div className={cn("min-w-0", side.isOpen && "max-lg:hidden", contentClassName)}>
        {children}
      </div>
      {side.isOpen ? (
        <div className="min-h-[70vh] min-w-0 lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:min-h-0">
          <SubjectSidePanel id={side.subjectId} onClose={side.close} />
        </div>
      ) : null}
    </div>
  );
}

function PanelBody({ data }: { data: DetailPayload }) {
  const { subject, staff } = data;
  const title = subject.name_cn || subject.name;
  const tags = (subject.tags ?? []).slice(0, 6);
  const countValue = subject.total_episodes || subject.eps;
  const countLabel = subjectCountLabel(subject.type);
  const dateLabel = subjectDateLabel(subject.type);
  const staffRows = Object.entries(staff).filter(([, v]) => Boolean(v));
  const isAnime = isAnimeSubjectType(subject.type);
  const fullHref = buildDetailUrl(subject.id, new URLSearchParams());

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        {subject.images?.large ? (
          <img
            src={toProxiedImageUrl(subject.images.large)}
            alt=""
            referrerPolicy="no-referrer"
            className="h-36 w-24 shrink-0 rounded-lg border border-primary/25 object-cover shadow-sm"
          />
        ) : null}
        <div className="min-w-0 flex-1 space-y-2">
          <h2 className="font-serif text-lg font-bold leading-snug text-foreground">{title}</h2>
          {subject.name_cn && subject.name !== subject.name_cn ? (
            <p className="font-mono text-xs text-muted-foreground">{subject.name}</p>
          ) : null}
          {subject.rating?.score ? (
            <p className="font-mono text-2xl font-bold text-rating">
              {subject.rating.score}
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                #{subject.rating.rank} · {subject.rating.total} 人
              </span>
            </p>
          ) : null}
        </div>
      </div>

      <dl className="space-y-1.5 text-xs">
        {countValue ? (
          <div className="flex gap-2">
            <dt className="w-14 shrink-0 text-muted-foreground">{countLabel}</dt>
            <dd className="text-foreground">{countValue}</dd>
          </div>
        ) : null}
        {subject.date ? (
          <div className="flex gap-2">
            <dt className="w-14 shrink-0 text-muted-foreground">{dateLabel}</dt>
            <dd className="text-foreground">{subject.date}</dd>
          </div>
        ) : null}
        {staffRows.map(([k, v]) => (
          <div key={k} className="flex gap-2">
            <dt className="w-14 shrink-0 text-muted-foreground">{k}</dt>
            <dd className="min-w-0 text-foreground">{v}</dd>
          </div>
        ))}
      </dl>

      {tags.length ? (
        <div className="flex flex-wrap gap-1">
          {tags.map((t) => (
            <Badge
              key={t.name}
              variant="secondary"
              className="border border-primary/25 bg-accent text-primary"
            >
              {t.name}
            </Badge>
          ))}
        </div>
      ) : null}

      {subject.summary ? (
        <p className="text-xs leading-relaxed whitespace-pre-wrap text-foreground">
          {subject.summary}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2 pt-1">
        <Link
          to={fullHref}
          prefetch="intent"
          className="inline-flex items-center gap-1 rounded-lg bg-accent text-accent-foreground px-3 py-1.5 text-xs font-bold text-foreground shadow-sm"
        >
          在列表中完整打开
        </Link>
        <a
          href={BGM_WEB_ROUTES.subject(subject.id)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-lg border border-primary/25 bg-card px-3 py-1.5 text-xs font-bold text-primary"
        >
          Bangumi <ExternalLink className="size-3" />
        </a>
      </div>

      {isAnime ? (
        <p className="text-[10px] text-muted-foreground">
          播放器、下载与章节列表请使用「在列表中完整打开」。
        </p>
      ) : null}
    </div>
  );
}
