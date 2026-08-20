import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigation, useOutlet, useParams } from "react-router";
import { CalendarDays, MessageSquareText, Sparkles } from "lucide-react";
import type { Route } from "./+types/layout";
import { AnimeCard } from "~/components/anime-card";
import { AnimeSchedule } from "~/components/anime-schedule";
import { AnimeListSkeleton } from "~/components/anime-list-skeleton";
import { AnimePagination } from "~/components/anime-pagination";
import { AnimeRankFilter } from "~/components/anime-rank-filter";
import { SearchResultGroups } from "~/components/search-result-groups";
import { SiteNav } from "~/components/site-nav";
import { cn } from "~/lib/utils";
import { createCache } from "~/lib/cache";
import {
  buildDetailUrl,
  buildListHref,
  listCacheKey,
  LIST_REVALIDATE_KEYS,
  mergeListParams,
} from "~/lib/bangumi/params";
import { loadCachedAnimeListFromRequest } from "~/lib/bangumi/server/list-load.server";
import { SUBJECT_TYPE, SUBJECT_TYPE_ALL, type AnimeListResult } from "~/lib/bangumi/types";
import { CACHE_MAX_ENTRIES, CACHE_TTL_LIST_MS } from "~/lib/bangumi/constants";
import { COVER_PRIORITY_COUNT } from "~/lib/anime-meta";
import { isAbortLike, throwRouteUpstreamError, upstreamFromRequest } from "~/lib/upstream";
import { closeSplitWithFrozenPanel, flipElements, unfreezeDetailPanel } from "./split-motion";

const clientCache = createCache<AnimeListResult>({
  ttlMs: CACHE_TTL_LIST_MS,
  maxEntries: CACHE_MAX_ENTRIES.clientList,
});

export async function loader({ request }: Route.LoaderArgs) {
  try {
    return await loadCachedAnimeListFromRequest(request, upstreamFromRequest(request));
  } catch (error) {
    throwRouteUpstreamError(error);
  }
}

export async function clientLoader({
  request,
  serverLoader,
}: Route.ClientLoaderArgs): Promise<AnimeListResult> {
  const url = new URL(request.url);
  const key = listCacheKey(url.searchParams);

  const cached = clientCache.get(key);
  if (cached) return cached;

  try {
    const data = (await serverLoader()) as AnimeListResult;
    clientCache.set(key, data);
    return data;
  } catch (error) {
    if (isAbortLike(error)) throw error;
    throw error;
  }
}

export function shouldRevalidate({ currentUrl, nextUrl }: { currentUrl: URL; nextUrl: URL }) {
  return LIST_REVALIDATE_KEYS.some(
    (k) => currentUrl.searchParams.get(k) !== nextUrl.searchParams.get(k),
  );
}

export type AnimeOutletContext = {
  expanded: boolean;
  setExpanded: (v: boolean) => void;
};

/** 小于 lg(1024px) 视为移动端：详情应全屏覆盖列表，而非并排挤压 */
function useViewportLayout() {
  const [isMobile, setIsMobile] = useState(false);
  const [layoutReady, setLayoutReady] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const update = () => setIsMobile(mq.matches);
    update();
    setLayoutReady(true);
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return { isMobile, layoutReady };
}

function gridCols(isMobile: boolean, hasDetail: boolean, expanded: boolean): string {
  if (isMobile) {
    return hasDetail ? "0fr 1fr" : "1fr 0fr";
  }
  if (!hasDetail) return "1fr 0fr";
  if (expanded) return "0fr 1fr";
  return "1.6fr 1fr";
}

export function HydrateFallback() {
  return (
    <div className="celadon-page flex h-screen flex-col">
      <SiteNav activeType={SUBJECT_TYPE.anime} />
      <div className="grid min-h-0 flex-1 grid-cols-[1fr_0fr] overflow-hidden">
        <AnimeListSkeleton />
      </div>
    </div>
  );
}

export default function AnimeLayout({ loaderData }: Route.ComponentProps) {
  const {
    items,
    schedule,
    groups,
    type,
    page,
    pageSize,
    total,
    baseParams,
    typeLabel,
    viewLabel,
    sort,
    view,
  } = loaderData;
  const params = useParams();
  const location = useLocation();
  const navigation = useNavigation();
  const routeHasDetail = Boolean(params.id);
  const [expanded, setExpandedState] = useState(false);
  const { isMobile, layoutReady } = useViewportLayout();
  const listScrollRef = useRef<HTMLDivElement>(null);
  const listPanelRef = useRef<HTMLElement>(null);
  const detailPanelRef = useRef<HTMLElement>(null);
  const flipAnimsRef = useRef<Animation[]>([]);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [splitOpen, setSplitOpen] = useState(routeHasDetail);
  const [holdExitContent, setHoldExitContent] = useState(false);
  const cachedOutletRef = useRef<ReactNode>(null);
  const closingRef = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const animateSplit = layoutReady && !isMobile && !reduceMotion;

  const runFlip = useCallback(
    (apply: () => void) => {
      flipAnimsRef.current.forEach((a) => a.cancel());
      flipAnimsRef.current = flipElements(
        [listPanelRef.current, detailPanelRef.current],
        apply,
        animateSplit,
      );
    },
    [animateSplit],
  );

  const setExpanded = useCallback(
    (next: boolean) => {
      if (next === expanded) return;
      runFlip(() => setExpandedState(next));
    },
    [expanded, runFlip],
  );

  const outletContext = { expanded, setExpanded } satisfies AnimeOutletContext;
  const outlet = useOutlet(outletContext);
  if (outlet) cachedOutletRef.current = outlet;

  useEffect(() => {
    if (params.id) setExpandedState(false);
  }, [params.id]);

  useEffect(() => {
    listScrollRef.current?.scrollTo({ top: 0, behavior: "instant" });
  }, [page, viewLabel, typeLabel]);

  // 打开详情：瞬时改列宽 + FLIP
  useEffect(() => {
    if (!routeHasDetail) return;
    closingRef.current = false;
    const panel = detailPanelRef.current;
    if (panel) unfreezeDetailPanel(panel);
    setHoldExitContent(false);
    if (splitOpen) return;
    runFlip(() => setSplitOpen(true));
  }, [routeHasDetail, splitOpen, runFlip]);

  // 关闭详情：方案 C — 冻右栏 → 列表立刻占满 → 同时滑出 + 左栏 FLIP
  useEffect(() => {
    if (routeHasDetail) return;
    if (!splitOpen || closingRef.current) return;

    closingRef.current = true;
    setHoldExitContent(true);

    const panel = detailPanelRef.current;
    if (!panel) {
      setSplitOpen(false);
      setHoldExitContent(false);
      cachedOutletRef.current = null;
      setExpandedState(false);
      closingRef.current = false;
      return;
    }

    let cancelled = false;
    flipAnimsRef.current.forEach((a) => a.cancel());

    const { animations, cleanup } = closeSplitWithFrozenPanel({
      list: listPanelRef.current,
      panel,
      animate: animateSplit,
      applyClosedLayout: () => {
        setSplitOpen(false);
        setExpandedState(false);
      },
    });
    flipAnimsRef.current = animations;

    void Promise.all(animations.map((a) => a.finished.catch(() => undefined))).then(() => {
      if (cancelled) return;
      cleanup();
      setHoldExitContent(false);
      cachedOutletRef.current = null;
      closingRef.current = false;
    });

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [routeHasDetail, splitOpen, animateSplit]);

  const cols = gridCols(isMobile, splitOpen, expanded);
  /** 关闭动画中 splitOpen 已 false，但仍需挂住详情 DOM；gap 只在真正分栏时加 */
  const panelShown = splitOpen || holdExitContent;
  const detailNode = outlet ?? (holdExitContent ? cachedOutletRef.current : null);

  const isListLoading =
    navigation.state === "loading" &&
    navigation.location != null &&
    shouldRevalidate({
      currentUrl: new URL(location.pathname + location.search, window.location.origin),
      nextUrl: new URL(
        navigation.location.pathname + navigation.location.search,
        window.location.origin,
      ),
    });

  const listParams = mergeListParams(baseParams, page);

  return (
    <div className="celadon-page flex h-screen flex-col text-slate-800">
      <SiteNav activeType={type === SUBJECT_TYPE_ALL ? undefined : type} />

      <div
        className={cn("grid min-h-0 flex-1 overflow-hidden p-3", splitOpen && "gap-x-3")}
        style={{ gridTemplateColumns: cols }}
      >
        <section
          ref={listPanelRef}
          className="celadon-glass flex min-w-0 flex-col overflow-hidden rounded-lg will-change-transform"
        >
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-rose-100/80 px-4 py-4">
            <div>
              <span className="flex items-center gap-1.5 font-mono text-xs font-semibold uppercase tracking-widest text-rose-600">
                <Sparkles className="size-3.5" />
                Bangumi Archive
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <h2 className="font-serif text-xl font-bold text-slate-800">{typeLabel}</h2>
                <span className="text-sm text-slate-500">· {viewLabel}</span>
              </div>
            </div>
            {isListLoading ? (
              <span className="rounded-full border border-rose-100 bg-white/70 px-3 py-1 font-mono text-xs text-rose-700">
                加载中…
              </span>
            ) : null}
            {schedule?.length ? (
              <Link
                to={buildListHref({
                  type: SUBJECT_TYPE.anime,
                  view: "calendar",
                  calendar: "overview",
                })}
                prefetch="intent"
                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-100 bg-white/70 px-3 py-2 text-xs font-bold text-rose-800 shadow-sm transition-colors hover:bg-white"
              >
                <CalendarDays className="size-3.5" />
                周总览
              </Link>
            ) : null}
            {!schedule?.length ? (
              <AnimeRankFilter type={type} sort={sort} view={view} year={baseParams.year} />
            ) : null}
          </div>

          <div
            ref={listScrollRef}
            className={cn(
              "min-h-0 flex-1 overflow-y-auto transition-opacity duration-200",
              isListLoading && "pointer-events-none opacity-50",
            )}
          >
            {groups?.length ? (
              <SearchResultGroups
                groups={groups}
                query={baseParams.q ?? ""}
                listParams={listParams}
                activeId={params.id}
              />
            ) : schedule && schedule.length > 0 ? (
              <AnimeSchedule schedule={schedule} activeId={params.id} listParams={listParams} />
            ) : items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">暂无结果</p>
            ) : (
              <div className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
                {items.map((it, idx) => (
                  <AnimeCard
                    key={it.id}
                    item={it}
                    to={buildDetailUrl(it.id, listParams)}
                    active={params.id === String(it.id)}
                    priority={idx < COVER_PRIORITY_COUNT}
                    rank={(page - 1) * pageSize + idx + 1}
                  />
                ))}
              </div>
            )}

            {!schedule?.length && !groups?.length ? (
              <AnimePagination
                page={page}
                total={total}
                pageSize={pageSize}
                baseParams={baseParams}
              />
            ) : null}

            {type === SUBJECT_TYPE.anime ? (
              <div className="px-4 pb-4">
                <Link
                  to="/anime/blog"
                  prefetch="intent"
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-rose-200 bg-white/50 px-3 py-3 text-xs font-bold text-rose-700 transition-colors hover:border-rose-300 hover:bg-white"
                >
                  <MessageSquareText className="size-3.5" />
                  浏览 Bangumi 动画日志 →
                </Link>
              </div>
            ) : null}
          </div>
        </section>

        <section
          ref={detailPanelRef}
          className={cn(
            "min-w-0 overflow-hidden rounded-lg border border-white/75 bg-white/48 backdrop-blur-xl will-change-transform",
            !panelShown && "pointer-events-none",
          )}
          aria-hidden={!panelShown}
        >
          {detailNode}
        </section>
      </div>
    </div>
  );
}
