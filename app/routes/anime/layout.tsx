import { useEffect, useRef, useState } from "react";
import { Link, Outlet, useNavigation, useParams } from "react-router";
import { CalendarDays, Sparkles } from "lucide-react";
import type { Route } from "./+types/layout";
import { AnimeCard } from "~/components/anime-card";
import { AnimeSchedule } from "~/components/anime-schedule";
import { AnimeListSkeleton } from "~/components/anime-list-skeleton";
import { AnimePagination } from "~/components/anime-pagination";
import { AnimeRankFilter } from "~/components/anime-rank-filter";
import { HamsterLoader } from "~/components/hamster-loader";
import { SiteNav } from "~/components/site-nav";
import { cn } from "~/lib/utils";
import {
  buildDetailUrl,
  createCache,
  listCacheKey,
  LIST_REVALIDATE_KEYS,
  mergeListParams,
  type AnimeListResult,
} from "~/lib/bangumi";

const clientCache = createCache<AnimeListResult>();

export async function clientLoader({
  request,
}: Route.ClientLoaderArgs): Promise<AnimeListResult> {
  const url = new URL(request.url);
  const key = listCacheKey(url.searchParams);

  const cached = clientCache.get(key);
  if (cached) return cached;

  const apiUrl = `/api/anime/list?${url.searchParams.toString()}`;
  const res = await fetch(apiUrl);
  if (!res.ok) throw new Response("加载列表失败", { status: res.status });
  const data = (await res.json()) as AnimeListResult;
  clientCache.set(key, data);
  return data;
}
clientLoader.hydrate = true as const;

export function shouldRevalidate({
  currentUrl,
  nextUrl,
}: {
  currentUrl: URL;
  nextUrl: URL;
}) {
  return LIST_REVALIDATE_KEYS.some(
    (k) => currentUrl.searchParams.get(k) !== nextUrl.searchParams.get(k),
  );
}

export type AnimeOutletContext = {
  expanded: boolean;
  setExpanded: (v: boolean) => void;
};

export function HydrateFallback() {
  return (
    <div className="celadon-page flex h-screen flex-col">
      <SiteNav activeType="2" searchType="2" />
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
  const navigation = useNavigation();
  const hasDetail = Boolean(params.id);
  const [expanded, setExpanded] = useState(false);
  const listScrollRef = useRef<HTMLDivElement>(null);
  const isLoading = navigation.state === "loading";

  useEffect(() => {
    setExpanded(false);
  }, [params.id]);

  // 翻页或切换列表视图时滚回顶部（滚动容器是列表区，不是 window）
  useEffect(() => {
    listScrollRef.current?.scrollTo({ top: 0, behavior: "instant" });
  }, [page, viewLabel, typeLabel]);

  const cols = !hasDetail ? "1fr 0fr" : expanded ? "0fr 1fr" : "1.6fr 1fr";
  const listParams = mergeListParams(baseParams, page);

  return (
    <div className="celadon-page flex h-screen flex-col text-slate-800">
      <SiteNav activeType={type} searchType={type} />
      <HamsterLoader show={isLoading} />

      <div
        className="grid min-h-0 flex-1 overflow-hidden p-3 transition-[grid-template-columns] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ gridTemplateColumns: cols }}
      >
        <section className="celadon-glass flex min-w-0 flex-col overflow-hidden rounded-lg">
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-rose-100/80 px-4 py-4">
            <div>
              <span className="flex items-center gap-1.5 font-mono text-xs font-semibold uppercase tracking-widest text-rose-600">
                <Sparkles className="size-3.5" />
                Bangumi Archive
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <h2 className="font-serif text-xl font-bold text-slate-800">
                  {typeLabel}
                </h2>
                <span className="text-sm text-slate-500">· {viewLabel}</span>
              </div>
            </div>
            {isLoading ? (
              <span className="rounded-full border border-rose-100 bg-white/70 px-3 py-1 font-mono text-xs text-rose-700">
                加载中…
              </span>
            ) : null}
            {schedule?.length ? (
              <Link
                to="/anime?type=2&view=calendar&calendar=overview"
                prefetch="intent"
                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-100 bg-white/70 px-3 py-2 text-xs font-bold text-rose-800 shadow-sm transition-colors hover:bg-white"
              >
                <CalendarDays className="size-3.5" />
                周总览
              </Link>
            ) : null}
            {!schedule?.length ? (
              <AnimeRankFilter
                type={type}
                sort={sort}
                view={view}
                year={baseParams.year}
              />
            ) : null}
          </div>

          <div
            ref={listScrollRef}
            className={cn(
              "min-h-0 flex-1 overflow-y-auto transition-opacity duration-200",
              isLoading && "pointer-events-none opacity-50",
            )}
          >
            {schedule && schedule.length > 0 ? (
              <AnimeSchedule
                schedule={schedule}
                activeId={params.id}
                listParams={listParams}
              />
            ) : items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                暂无结果
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
                {items.map((it, idx) => (
                  <AnimeCard
                    key={it.id}
                    item={it}
                    to={buildDetailUrl(it.id, listParams)}
                    active={params.id === String(it.id)}
                    priority={idx < 10}
                    rank={(page - 1) * pageSize + idx + 1}
                  />
                ))}
              </div>
            )}

            {!schedule?.length ? (
              <AnimePagination
                page={page}
                total={total}
                pageSize={pageSize}
                baseParams={baseParams}
              />
            ) : null}
          </div>
        </section>

        <section
          className={cn(
            "min-w-0 overflow-hidden rounded-lg border border-white/75 bg-white/48 backdrop-blur-xl",
            hasDetail && "ml-3",
          )}
        >
          <Outlet
            context={{ expanded, setExpanded } satisfies AnimeOutletContext}
          />
        </section>
      </div>
    </div>
  );
}
