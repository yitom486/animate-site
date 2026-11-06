import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { subjectDetailQuery } from "~/lib/subject-queries";
import { Link } from "react-router";
import {
  ExternalLink,
  Film,
  Layers,
  Maximize2,
  MessageSquare,
  Minimize2,
  Sparkles,
  Star,
  Users,
  X,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
import { StreamingPanel } from "~/components/streaming-panel";
import { DownloadsPanel } from "~/components/downloads-panel";
import { SubjectRelationsPanel } from "~/components/subject-relations";
import { SubjectComments } from "~/components/subject-comments";
import { AnimeCover } from "~/components/anime-cover";
import { toProxiedImageUrl } from "~/lib/anime-meta";
import { buildDetailUrl } from "~/lib/bangumi/params";
import { BGM_WEB_ROUTES } from "~/lib/external-links";
import {
  isAnimeSubjectType,
  subjectCountLabel,
  subjectDateLabel,
} from "~/lib/bangumi/subject-display";
import { cn } from "~/lib/utils";

type SubjectDetailDrawerProps = {
  id: number | null;
  onClose: () => void;
};

type ActiveTab = "overview" | "episodes" | "characters" | "comments";

export function SubjectDetailDrawer({ id, onClose }: SubjectDetailDrawerProps) {
  // 缓存上一个有效 id，确保离场滑出动画播放期间内容不会瞬间消失
  const [cachedId, setCachedId] = useState<number | null>(id);

  useEffect(() => {
    if (id != null) {
      setCachedId(id);
    }
  }, [id]);

  const activeId = id ?? cachedId;
  const isOpen = id != null;

  const query = useQuery(subjectDetailQuery(activeId ? String(activeId) : ""));
  const data = query.data;
  const loading = query.isPending && !data;
  const error = query.isError && !data ? query.error.message : null;
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    setActiveTab("overview");
    setSummaryExpanded(false);
    setFullscreen(false);
  }, [id]);

  const subject = data?.subject;
  const staff = data?.staff ?? {};
  const episodes = data?.episodes ?? [];
  const title = subject?.name_cn || subject?.name || (activeId ? `条目 #${activeId}` : "条目详情");
  const isAnime = subject ? isAnimeSubjectType(subject.type) : true;
  const countValue = subject?.total_episodes || subject?.eps;
  const countLabel = subject ? subjectCountLabel(subject.type) : "话数";
  const dateLabel = subject ? subjectDateLabel(subject.type) : "放送日期";
  const staffRows = Object.entries(staff).filter(([, v]) => Boolean(v));
  const mainEpisodes = episodes.filter((e) => e.type === 0);

  return (
    <DialogPrimitive.Root
      open={isOpen}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <DialogPrimitive.Portal>
        {/* 半透明毛玻璃遮罩（淡入淡出动画） */}
        <DialogPrimitive.Backdrop
          className={cn(
            "fixed inset-0 z-50 bg-overlay/40 backdrop-blur-xs",
            "duration-250 ease-out",
            "data-open:animate-in data-open:fade-in-0",
            "data-closed:animate-out data-closed:fade-out-0",
          )}
        />

        {/* 右侧滑出沉浸式抽屉容器（移动端全屏，桌面端抽屉/全屏弹层） */}
        <DialogPrimitive.Popup
          className={cn(
            "fixed z-50 flex flex-col bg-card shadow-2xl outline-none duration-250 ease-out",
            fullscreen
              ? "inset-0 sm:inset-4 max-w-none sm:rounded-xl border-0 sm:border sm:border-border/70 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
              : "inset-0 sm:inset-y-0 sm:right-0 sm:h-full sm:w-full sm:max-w-2xl border-0 sm:border-l sm:border-border/70 data-open:animate-in data-open:slide-in-from-right data-closed:animate-out data-closed:slide-out-to-right",
          )}
        >
          {/* 无障碍隐藏描述 */}
          <DialogPrimitive.Description className="sr-only">
            {title} 番剧详情、分集列表与评分资料
          </DialogPrimitive.Description>

          {/* 顶部固定标题与操作栏 */}
          <header className="flex h-14 sm:h-16 shrink-0 items-center justify-between border-b border-border/70 bg-card/85 px-4 sm:px-6 backdrop-blur-md">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary shrink-0">
                <Sparkles className="size-4" />
              </span>
              <div className="min-w-0">
                <DialogPrimitive.Title className="truncate font-serif text-sm sm:text-base font-bold text-foreground">
                  {title}
                </DialogPrimitive.Title>
                {subject?.name && subject.name !== subject.name_cn ? (
                  <p className="truncate font-mono text-[10px] sm:text-[11px] text-muted-foreground">
                    {subject.name}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon-sm"
                type="button"
                onClick={() => setFullscreen((v) => !v)}
                className="hidden sm:inline-flex rounded-lg border border-border/60 text-muted-foreground hover:border-primary/40 hover:text-primary"
                aria-label={fullscreen ? "退出全屏" : "展开为全屏"}
                title={fullscreen ? "退出全屏" : "展开为全屏"}
              >
                {fullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
              </Button>
              <DialogPrimitive.Close
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="rounded-lg border border-border/60 text-muted-foreground hover:border-primary/40 hover:text-primary"
                    aria-label="关闭详情抽屉"
                  />
                }
              >
                <X className="size-4" />
              </DialogPrimitive.Close>
            </div>
          </header>

          {/* 抽屉滚动内容体 */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5">
            {loading ? (
              <div className="space-y-6 animate-pulse">
                <div className="flex flex-row gap-3.5 sm:gap-5">
                  <Skeleton className="aspect-[2/3] w-28 sm:w-36 shrink-0 rounded-xl" />
                  <div className="min-w-0 flex-1 space-y-3">
                    <Skeleton className="h-6 w-3/4 rounded-md" />
                    <Skeleton className="h-4 w-1/2 rounded-md" />
                    <div className="grid grid-cols-1 gap-2 pt-2 sm:grid-cols-2">
                      <Skeleton className="h-4 w-24 rounded-md" />
                      <Skeleton className="h-4 w-20 rounded-md" />
                      <Skeleton className="h-4 w-28 rounded-md" />
                      <Skeleton className="h-4 w-20 rounded-md" />
                    </div>
                    <div className="flex gap-1.5 pt-2">
                      <Skeleton className="h-5 w-14 rounded-full" />
                      <Skeleton className="h-5 w-16 rounded-full" />
                      <Skeleton className="h-5 w-12 rounded-full" />
                    </div>
                  </div>
                </div>
                <Skeleton className="h-28 w-full rounded-xl" />
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-24 rounded-lg" />
                  <Skeleton className="h-8 w-24 rounded-lg" />
                  <Skeleton className="h-8 w-24 rounded-lg" />
                </div>
              </div>
            ) : error ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center text-xs text-destructive">
                <p role="status">加载条目失败（{error}）</p>
                <Button
                  variant="ghost"
                  onClick={() => void query.refetch()}
                  disabled={query.isFetching}
                >
                  {query.isFetching ? "重试中…" : "重新加载"}
                </Button>
              </div>
            ) : subject ? (
              <div className={cn("space-y-6", fullscreen && "mx-auto max-w-5xl")}>
                {/* 海报与关键元数据 Hero 卡片 */}
                <div className="flex flex-row gap-3.5 sm:gap-5">
                  <div className="relative aspect-[2/3] w-28 sm:w-36 shrink-0 overflow-hidden rounded-xl border border-border/70 bg-muted shadow-sm">
                    <AnimeCover
                      url={toProxiedImageUrl(subject.images?.large || subject.images?.common)}
                      alt={title}
                      priority
                    />
                    {subject.rating?.score ? (
                      <div className="absolute top-2 right-2 flex items-center gap-1 rounded-md border border-warning/30 bg-background/90 px-1.5 py-0.5 font-mono text-[10px] sm:text-[11px] font-bold text-rating shadow-xs backdrop-blur-xs">
                        <Star className="size-2.5 sm:size-3 fill-rating text-rating" />
                        {subject.rating.score}
                      </div>
                    ) : null}
                  </div>

                  <div className="min-w-0 flex-1 space-y-2 sm:space-y-3">
                    <div>
                      <h1 className="font-serif text-lg sm:text-xl font-bold leading-tight text-foreground">
                        {title}
                      </h1>
                      {subject.name && subject.name !== subject.name_cn ? (
                        <p className="mt-0.5 font-mono text-[11px] text-muted-foreground truncate">
                          {subject.name}
                        </p>
                      ) : null}
                    </div>

                    {subject.rating?.score ? (
                      <div className="flex flex-wrap items-baseline gap-1.5 sm:gap-2">
                        <span className="font-mono text-2xl sm:text-3xl font-extrabold text-rating">
                          {subject.rating.score}
                        </span>
                        <span className="font-mono text-[11px] sm:text-xs text-muted-foreground">
                          {subject.rating.rank ? `全站 #${subject.rating.rank} · ` : ""}
                          {subject.rating.total
                            ? `${subject.rating.total.toLocaleString()} 人评分`
                            : ""}
                        </span>
                      </div>
                    ) : null}

                    <dl className="grid grid-cols-1 gap-y-1.5 text-xs sm:grid-cols-2 sm:gap-x-4">
                      {subject.date ? (
                        <div className="flex items-baseline gap-2">
                          <dt className="text-muted-foreground">{dateLabel}:</dt>
                          <dd className="font-medium text-foreground">{subject.date}</dd>
                        </div>
                      ) : null}
                      {countValue ? (
                        <div className="flex items-baseline gap-2">
                          <dt className="text-muted-foreground">{countLabel}:</dt>
                          <dd className="font-medium text-foreground">{countValue} 话</dd>
                        </div>
                      ) : null}
                      {subject.platform ? (
                        <div className="flex items-baseline gap-2">
                          <dt className="text-muted-foreground">放送形式:</dt>
                          <dd className="font-medium text-foreground">{subject.platform}</dd>
                        </div>
                      ) : null}
                      {staffRows.slice(0, 3).map(([k, v]) => (
                        <div key={k} className="flex items-baseline gap-2">
                          <dt className="shrink-0 text-muted-foreground">{k}:</dt>
                          <dd className="truncate font-medium text-foreground">{v}</dd>
                        </div>
                      ))}
                    </dl>

                    {subject.tags?.length ? (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {subject.tags.slice(0, 8).map((t) => (
                          <Badge
                            key={t.name}
                            variant="secondary"
                            className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-0.5 font-mono text-[10px] font-medium text-primary shadow-2xs"
                          >
                            {t.name}
                            {t.count ? <span className="ml-1 opacity-60">{t.count}</span> : null}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* 剧情简介（常驻展示，支持折叠展开） */}
                {subject.summary ? (
                  <section className="rounded-xl border border-border/70 bg-card/60 p-4 shadow-2xs">
                    <h3 className="mb-2 font-serif text-sm font-bold text-foreground">剧情简介</h3>
                    <p
                      className={cn(
                        "whitespace-pre-line font-serif text-xs leading-relaxed text-foreground/90 transition-all",
                        !summaryExpanded && "line-clamp-4",
                      )}
                    >
                      {subject.summary}
                    </p>
                    {subject.summary.length > 160 ? (
                      <button
                        type="button"
                        onClick={() => setSummaryExpanded(!summaryExpanded)}
                        className="mt-2 text-xs font-bold text-primary hover:underline"
                      >
                        {summaryExpanded ? "收起全文" : "展开完整简介…"}
                      </button>
                    ) : null}
                  </section>
                ) : null}

                {/* 模块 Tab 导航切换 */}
                <div className="flex items-center gap-1 overflow-x-auto border-b border-border/70 text-xs font-bold scrollbar-none">
                  <button
                    type="button"
                    onClick={() => setActiveTab("overview")}
                    className={cn(
                      "flex shrink-0 whitespace-nowrap items-center gap-1.5 border-b-2 px-3 py-2.5 transition-colors",
                      activeTab === "overview"
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Film className="size-3.5" />
                    播放与资源
                  </button>
                  {mainEpisodes.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setActiveTab("episodes")}
                      className={cn(
                        "flex shrink-0 whitespace-nowrap items-center gap-1.5 border-b-2 px-3 py-2.5 transition-colors",
                        activeTab === "episodes"
                          ? "border-primary text-primary"
                          : "border-transparent text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <Layers className="size-3.5" />
                      章节 ({mainEpisodes.length})
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setActiveTab("characters")}
                    className={cn(
                      "flex shrink-0 whitespace-nowrap items-center gap-1.5 border-b-2 px-3 py-2.5 transition-colors",
                      activeTab === "characters"
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Users className="size-3.5" />
                    角色阵容
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("comments")}
                    className={cn(
                      "flex shrink-0 whitespace-nowrap items-center gap-1.5 border-b-2 px-3 py-2.5 transition-colors",
                      activeTab === "comments"
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <MessageSquare className="size-3.5" />
                    社区吐槽
                  </button>
                </div>

                {/* Tab 1: 播放直达与资源下载 */}
                {activeTab === "overview" && isAnime ? (
                  <div className="space-y-4">
                    <StreamingPanel
                      key={`stream-${subject.id}`}
                      id={String(subject.id)}
                      date={subject.date}
                      title={title}
                    />
                    <DownloadsPanel
                      key={`download-${subject.id}`}
                      id={String(subject.id)}
                      date={subject.date}
                      searchKeyword={title}
                    />
                  </div>
                ) : null}

                {/* Tab 2: 章节列表 */}
                {activeTab === "episodes" && mainEpisodes.length > 0 ? (
                  <div className="space-y-2">
                    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {mainEpisodes.map((ep) => (
                        <li
                          key={ep.id}
                          className="flex items-baseline gap-2 rounded-lg border border-border/70 bg-card p-2.5 text-xs shadow-2xs"
                        >
                          <span className="w-8 shrink-0 font-mono font-bold text-muted-foreground">
                            {ep.sort}
                          </span>
                          <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                            {ep.name_cn || ep.name || "—"}
                          </span>
                          {ep.airdate ? (
                            <span className="shrink-0 font-mono text-[10px] text-primary">
                              {ep.airdate}
                            </span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {/* Tab 3: 角色阵容 */}
                {activeTab === "characters" ? (
                  <SubjectRelationsPanel id={String(subject.id)} enabled={true} />
                ) : null}

                {/* Tab 4: 社区吐槽与长评 */}
                {activeTab === "comments" ? <SubjectComments id={String(subject.id)} /> : null}
              </div>
            ) : null}
          </div>

          {/* 底部吸底操作条 */}
          {subject ? (
            <footer className="flex items-center justify-between border-t border-border/70 bg-card/85 px-4 sm:px-6 py-3 sm:py-3.5 backdrop-blur-md">
              <a
                href={BGM_WEB_ROUTES.subject(subject.id)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground transition-colors hover:text-primary"
              >
                Bangumi 原站条目 <ExternalLink className="size-3" />
              </a>

              <Button
                variant="default"
                size="sm"
                render={
                  <Link
                    to={buildDetailUrl(subject.id, new URLSearchParams())}
                    prefetch="intent"
                    onClick={onClose}
                  />
                }
                nativeButton={false}
                className="font-bold shadow-xs shadow-primary/20"
              >
                在作品库中完整打开
              </Button>
            </footer>
          ) : null}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
