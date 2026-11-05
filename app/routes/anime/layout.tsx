import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Link, useLocation, useNavigation, useOutlet, useParams } from "react-router";
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
import { useDetailLayoutStore } from "~/lib/stores/use-detail-layout-store";

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
  /** 小于 lg 时详情已全屏，无需再二次展开 */
  isMobile: boolean;
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
  if (isMobile || !hasDetail || expanded) {
    return "1fr";
  }
  return "1.6fr 1fr";
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
  const location = useLocation();
  const navigation = useNavigation();
  const routeHasDetail = Boolean(params.id);
  const hasListQuery = Boolean(location.search && location.search !== "?");

  // 使用 Zustand 持久化保存用户的展开/半屏偏好
  const isStoreExpanded = useDetailLayoutStore((s) => s.expanded);
  const setStoreExpanded = useDetailLayoutStore((s) => s.setExpanded);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    // 直链访问且此前从未手动操作过时，默认展开为完整大页
    if (
      params.id &&
      !hasListQuery &&
      typeof window !== "undefined" &&
      !localStorage.getItem("yayu-detail-layout")
    ) {
      setStoreExpanded(true);
    }
  }, [params.id, hasListQuery, setStoreExpanded]);

  // 水合后严格遵循 Zustand 持久化的偏好
  const expanded = routeHasDetail && (hydrated ? isStoreExpanded : !hasListQuery);

  const { isMobile } = useViewportLayout();
  const listScrollRef = useRef<HTMLDivElement>(null);
  const listPanelRef = useRef<HTMLElement>(null);
  const detailPanelRef = useRef<HTMLElement>(null);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const setExpanded = useCallback(
    (next: boolean) => {
      if (typeof document !== "undefined" && "startViewTransition" in document && !reduceMotion) {
        document.startViewTransition(() => {
          flushSync(() => {
            setStoreExpanded(next);
          });
        });
      } else {
        setStoreExpanded(next);
      }
    },
    [reduceMotion, setStoreExpanded],
  );

  const outletContext = { expanded, setExpanded, isMobile } satisfies AnimeOutletContext;
  const outlet = useOutlet(outletContext);

  useEffect(() => {
    listScrollRef.current?.scrollTo({ top: 0, behavior: "instant" });
  }, [page, viewLabel, typeLabel]);

  const cols = gridCols(isMobile, routeHasDetail, expanded);

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

      <div
        className={cn(
          "grid min-h-0 flex-1 overflow-hidden p-3 transition-all duration-300 ease-out",
          routeHasDetail && !expanded && "gap-x-3",
        )}
        style={{ gridTemplateColumns: cols }}
      >
        <section
          ref={listPanelRef}
          className={cn(
            "flex min-w-0 flex-col overflow-hidden rounded-xl border border-border/70 bg-card transition-opacity duration-300",
            (expanded || (isMobile && routeHasDetail)) && "hidden",
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

        {routeHasDetail ? (
          <section
            ref={detailPanelRef}
            className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-border/70 bg-card shadow-xs transition-opacity duration-200"
          >
            {outlet}
          </section>
        ) : null}
      </div>
    </div>
  );
}
