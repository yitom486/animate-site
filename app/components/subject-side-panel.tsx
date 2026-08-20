import { useEffect, useState, type ReactNode } from "react";
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
import type { SubjectSidePanelControls } from "~/lib/subject-side-panel";
import { cn } from "~/lib/utils";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ok"; data: DetailPayload };

/** 条目侧栏面板：拉取 /api/anime/detail，轻量预览 */
export function SubjectSidePanel({ id, onClose }: { id: string; onClose: () => void }) {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    const ac = new AbortController();
    setState({ status: "loading" });

    fetch(`/api/anime/detail/${id}`, { signal: ac.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return (await res.json()) as DetailPayload;
      })
      .then((data) => {
        if (!ac.signal.aborted) setState({ status: "ok", data });
      })
      .catch((err: unknown) => {
        if (ac.signal.aborted) return;
        const message = err instanceof Error ? err.message : "加载失败";
        setState({ status: "error", message });
      });

    return () => ac.abort();
  }, [id]);

  return (
    <aside className="flex h-full min-h-0 min-w-0 flex-col border-l border-rose-100/80 bg-white/55 backdrop-blur-md">
      <div className="flex items-center justify-between gap-2 border-b border-rose-100/80 p-3">
        <span className="text-xs font-bold tracking-wide text-slate-500 uppercase">条目详情</span>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-rose-100 bg-white/70 p-1.5 text-slate-500 transition-colors hover:bg-white hover:text-rose-700"
          aria-label="关闭条目详情"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {state.status === "loading" ? (
          <p className="flex items-center justify-center gap-2 py-16 text-xs text-slate-400">
            <Loader2 className="size-4 animate-spin" />
            加载条目中…
          </p>
        ) : null}

        {state.status === "error" ? (
          <p className="rounded-lg border border-dashed border-rose-100 bg-white/50 px-4 py-10 text-center text-xs text-slate-500">
            条目暂不可用（{state.message}）
          </p>
        ) : null}

        {state.status === "ok" ? <PanelBody data={state.data} /> : null}
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
            src={subject.images.large}
            alt=""
            referrerPolicy="no-referrer"
            className="h-36 w-24 shrink-0 rounded-lg border border-rose-100 object-cover shadow-sm"
          />
        ) : null}
        <div className="min-w-0 flex-1 space-y-2">
          <h2 className="font-serif text-lg font-bold leading-snug text-slate-800">{title}</h2>
          {subject.name_cn && subject.name !== subject.name_cn ? (
            <p className="font-mono text-xs text-slate-500">{subject.name}</p>
          ) : null}
          {subject.rating?.score ? (
            <p className="font-mono text-2xl font-bold text-amber-500">
              {subject.rating.score}
              <span className="ml-2 text-xs font-normal text-slate-400">
                #{subject.rating.rank} · {subject.rating.total} 人
              </span>
            </p>
          ) : null}
        </div>
      </div>

      <dl className="space-y-1.5 text-xs">
        {countValue ? (
          <div className="flex gap-2">
            <dt className="w-14 shrink-0 text-slate-400">{countLabel}</dt>
            <dd className="text-slate-700">{countValue}</dd>
          </div>
        ) : null}
        {subject.date ? (
          <div className="flex gap-2">
            <dt className="w-14 shrink-0 text-slate-400">{dateLabel}</dt>
            <dd className="text-slate-700">{subject.date}</dd>
          </div>
        ) : null}
        {staffRows.map(([k, v]) => (
          <div key={k} className="flex gap-2">
            <dt className="w-14 shrink-0 text-slate-400">{k}</dt>
            <dd className="min-w-0 text-slate-700">{v}</dd>
          </div>
        ))}
      </dl>

      {tags.length ? (
        <div className="flex flex-wrap gap-1">
          {tags.map((t) => (
            <Badge
              key={t.name}
              variant="secondary"
              className="border border-rose-100 bg-rose-50 text-rose-700"
            >
              {t.name}
            </Badge>
          ))}
        </div>
      ) : null}

      {subject.summary ? (
        <p className="text-xs leading-relaxed whitespace-pre-wrap text-slate-600">
          {subject.summary}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2 pt-1">
        <Link
          to={fullHref}
          prefetch="intent"
          className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-rose-300 to-sky-300 px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm"
        >
          在列表中完整打开
        </Link>
        <a
          href={BGM_WEB_ROUTES.subject(subject.id)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-lg border border-rose-100 bg-white/70 px-3 py-1.5 text-xs font-bold text-rose-800"
        >
          Bangumi <ExternalLink className="size-3" />
        </a>
      </div>

      {isAnime ? (
        <p className="text-[10px] text-slate-400">
          播放器、下载与章节列表请使用「在列表中完整打开」。
        </p>
      ) : null}
    </div>
  );
}
