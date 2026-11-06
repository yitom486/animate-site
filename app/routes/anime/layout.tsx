import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Link, useNavigate, useNavigation, useOutlet, useParams, useSearchParams } from "react-router";
import { CalendarDays, MessageSquareText } from "lucide-react";
import type { Route } from "./+types/layout";
import { AnimeCard } from "~/components/anime-card";
import { AnimeSchedule } from "~/components/anime-schedule";
import { AnimeListSkeleton } from "~/components/anime-list-skeleton";
import { AnimePagination } from "~/components/anime-pagination";
import { AnimeRankFilter } from "~/components/anime-rank-filter";
import { SearchResultGroups } from "~/components/search-result-groups";
import { SiteNav } from "~/components/site-nav";
import { cn } from "~/lib/utils";
import {
  buildDetailUrl,
  buildListHref,
  buildListUrl,
  LIST_REVALIDATE_KEYS,
  listParamsFromSearch,
  mergeListParams,
} from "~/lib/bangumi/params";
import { readAnimeListCache, rememberAnimeList } from "~/lib/bangumi/list-client-cache";
import { loadCachedAnimeListFromRequest } from "~/lib/bangumi/server/list-load.server";
import { SUBJECT_TYPE, SUBJECT_TYPE_ALL, type AnimeListResult } from "~/lib/bangumi/types";
import { COVER_PRIORITY_COUNT } from "~/lib/anime-meta";
import { isAbortLike, throwRouteUpstreamError, upstreamFromRequest } from "~/lib/upstream";

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

  const cached = readAnimeListCache(url.searchParams);
  if (cached) return cached;

  try {
    const data = (await serverLoader()) as AnimeListResult;
    rememberAnimeList(url.searchParams, data);
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
  /** 小于 lg 时详情已全屏覆盖，无需再二次展开 */
  isMobile: boolean;
};

/** 小于 lg(1024px) 视为移动端：详情全屏覆盖列表 */
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

function hasListFilterParams(searchParams: URLSearchParams): boolean {
  return (
    searchParams.has("type") ||
    searchParams.has("sort") ||
    searchParams.has("view") ||
    searchParams.has("page") ||
    searchParams.has("cat") ||
    searchParams.has("tag") ||
    searchParams.has("q") ||
    searchParams.has("year") ||
    searchParams.has("month") ||
    searchParams.has("series") ||
    searchParams.has("platform")
  );
}

export function HydrateFallback() {
  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <SiteNav activeType={SUBJECT_TYPE.anime} />
      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden p-3">
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
  const [searchParams, setSearchParams] = useSearchParams();
  const navigation = useNavigation();
  const routeHasDetail = Boolean(params.id);

  // 1. 直链无筛选访问（如直接进入 /anime/25961）：默认全屏覆盖层；若用户收起则记录 split=1
  // 2. 列表浏览（带有列表筛选参数如 ?type=2&sort=rank）：默认右侧覆盖抽屉；若用户展开则记录 full=1
  // 列表网格始终保持全宽，详情以遮罩 + 覆盖层呈现，不再挤压分栏。
  // 状态由 URL 驱动，SSR 与客户端首帧一致。
  const isDirectDetail = routeHasDetail && !hasListFilterParams(searchParams);
  const isFullParam = searchParams.get("full") === "1";
  const isSplitParam = searchParams.get("split") === "1";
  const expanded = routeHasDetail && (isDirectDetail ? !isSplitParam : isFullParam);

  const { isMobile } = useViewportLayout();
  const listScrollRef = useRef<HTMLDivElement>(null);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // 清除之前保存在 localStorage 的遗留偏好键
  useEffect(() => {
    try {
      localStorage.removeItem("yayu-detail-layout");
    } catch {
      // ignore
    }
  }, []);

  const setExpanded = useCallback(
    (next: boolean) => {
      const update = () => {
        setSearchParams(
          (prev) => {
            const nextParams = new URLSearchParams(prev);
            if (isDirectDetail) {
              if (!next) {
                nextParams.set("split", "1");
              } else {
                nextParams.delete("split");
              }
            } else {
              if (next) {
                nextParams.set("full", "1");
              } else {
                nextParams.delete("full");
              }
            }
            return nextParams;
          },
          { replace: true },
        );
      };

      if (typeof document !== "undefined" && "startViewTransition" in document && !reduceMotion) {
        document.startViewTransition(() => {
          flushSync(update);
        });
      } else {
        update();
      }
    },
    [isDirectDetail, reduceMotion, setSearchParams],
  );

  const outletContext = { expanded, setExpanded, isMobile } satisfies AnimeOutletContext;
  const outlet = useOutlet(outletContext);
  const navigate = useNavigate();

  useEffect(() => {
    listScrollRef.current?.scrollTo({ top: 0, behavior: "instant" });
  }, [page, viewLabel, typeLabel]);

  const listBackUrl = buildListUrl(listParamsFromSearch(searchParams));

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
    <div className="flex h-screen flex-col bg-background text-foreground">
      <SiteNav activeType={type === SUBJECT_TYPE_ALL ? undefined : type} />

      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden p-3">
        <section
          className={cn(
            "flex min-w-0 flex-col overflow-hidden rounded-xl border border-border/70 bg-card transition-opacity duration-300",
            isMobile && routeHasDetail && "hidden",
          )}
        >
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border/70 px-5 py-4">
            <div>
              <div className="mt-1 flex items-baseline gap-2">
                <h2 className="font-serif text-xl font-bold text-foreground">{typeLabel}</h2>
                <span className="text-sm text-muted-foreground">· {viewLabel}</span>
              </div>
            </div>
            {isListLoading ? (
              <span className="rounded-full border border-primary/25 bg-card px-3 py-1 font-mono text-xs text-primary">
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
                className="inline-flex items-center gap-1.5 rounded-lg border border-primary/25 bg-card px-3 py-2 text-xs font-bold text-primary shadow-sm transition-colors hover:bg-muted/50"
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
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-primary/25 bg-card px-3 py-3 text-xs font-bold text-primary transition-colors hover:border-primary/25 hover:bg-muted/50"
                >
                  <MessageSquareText className="size-3.5" />
                  浏览 Bangumi 动画日志 →
                </Link>
              </div>
            ) : null}
          </div>
        </section>

      </div>

      {routeHasDetail ? (
        <>
          <button
            type="button"
            aria-label="关闭详情遮罩"
            className="fixed inset-0 z-40 bg-overlay/40 backdrop-blur-xs duration-250 ease-out animate-in fade-in-0"
            onClick={() => navigate(listBackUrl)}
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-label="作品详情"
            className={cn(
              "fixed z-50 flex flex-col overflow-hidden border border-border/70 bg-card shadow-2xl duration-250 ease-out",
              expanded || isMobile
                ? "inset-3 rounded-xl sm:inset-4 animate-in fade-in-0 zoom-in-95"
                : "inset-y-0 right-0 h-full w-full max-w-2xl border-y-0 border-r-0 animate-in slide-in-from-right",
            )}
          >
            {outlet}
          </section>
        </>
      ) : null}
    </div>
  );
}
