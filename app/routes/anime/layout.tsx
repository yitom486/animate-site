import { useEffect, useRef, useState } from "react";
import { Form, Link, Outlet, useNavigation, useParams } from "react-router";
import { Search } from "lucide-react";
import type { Route } from "./+types/layout";
import { AnimeCard } from "~/components/anime-card";
import { AnimeSchedule } from "~/components/anime-schedule";
import { AnimeListSkeleton } from "~/components/anime-list-skeleton";
import { AnimePagination } from "~/components/anime-pagination";
import { cn } from "~/lib/utils";
import {
  BGM_MENUS,
  buildDetailUrl,
  createCache,
  listCacheKey,
  LIST_REVALIDATE_KEYS,
  mergeListParams,
  type AnimeListResult,
} from "~/lib/bangumi";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "~/components/ui/navigation-menu";

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

function AnimeHeader({ type }: { type: string }) {
  return (
    <header className="sticky top-0 z-20 flex items-center gap-4 border-b border-border/60 bg-background/70 px-6 py-3 backdrop-blur-xl">
      <Link
        to="/anime"
        prefetch="intent"
        className="shrink-0 bg-gradient-to-r from-pink-500 via-fuchsia-500 to-indigo-500 bg-clip-text text-2xl font-black tracking-tight text-transparent"
      >
        亚域空间
      </Link>

      <NavigationMenu>
        <NavigationMenuList>
          {BGM_MENUS.map((m) => (
            <NavigationMenuItem key={m.type}>
              <NavigationMenuTrigger
                className={cn(
                  type === m.type && "text-primary",
                  "data-[active]:text-primary",
                )}
              >
                {m.label}
              </NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="grid max-h-[min(70vh,480px)] w-[300px] gap-1 overflow-y-auto p-2 sm:w-[320px]">
                  {m.links.map(({ to, title, desc, icon: Icon }) => (
                    <li key={to}>
                      <NavigationMenuLink
                        render={<Link to={to} prefetch="intent" />}
                        className="flex-col items-start gap-0.5"
                      >
                        <span className="flex items-center gap-2 text-sm font-medium">
                          <Icon className="size-4 shrink-0 text-primary" />
                          {title}
                        </span>
                        {desc ? (
                          <span className="pl-6 text-xs text-muted-foreground">
                            {desc}
                          </span>
                        ) : null}
                      </NavigationMenuLink>
                    </li>
                  ))}
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>
          ))}
        </NavigationMenuList>
      </NavigationMenu>

      <Form
        method="get"
        action="/anime"
        className="ml-auto flex max-w-xs flex-1 items-center gap-1.5"
      >
        <input type="hidden" name="type" value={type} />
        <input type="hidden" name="view" value="search" />
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            name="q"
            type="search"
            placeholder="搜索…"
            className="h-8 w-full rounded-lg border border-border bg-background py-1 pr-2 pl-8 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
          />
        </div>
      </Form>
    </header>
  );
}

export function HydrateFallback() {
  return (
    <div className="flex h-screen flex-col bg-gradient-to-br from-background via-background to-muted/40">
      <AnimeHeader type="2" />
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
    <div className="flex h-screen flex-col bg-gradient-to-br from-background via-background to-muted/40">
      <AnimeHeader type={type} />

      <div
        className="grid min-h-0 flex-1 overflow-hidden transition-[grid-template-columns] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ gridTemplateColumns: cols }}
      >
        <section className="flex min-w-0 flex-col overflow-hidden">
          <div className="flex shrink-0 items-baseline gap-2 px-4 pt-4">
            <h2 className="text-lg font-bold">{typeLabel}</h2>
            <span className="text-sm text-muted-foreground">· {viewLabel}</span>
            {isLoading ? (
              <span className="animate-pulse text-xs text-muted-foreground">
                加载中…
              </span>
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
              <div className="grid grid-cols-3 gap-3 p-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
                {items.map((it) => (
                  <AnimeCard
                    key={it.id}
                    item={it}
                    to={buildDetailUrl(it.id, listParams)}
                    active={params.id === String(it.id)}
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

        <section className="min-w-0 overflow-hidden border-l border-border/50 bg-background/40 backdrop-blur">
          <Outlet
            context={{ expanded, setExpanded } satisfies AnimeOutletContext}
          />
        </section>
      </div>
    </div>
  );
}
