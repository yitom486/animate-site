import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/motion/tabs";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Magnet, Package, Film, Download } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "~/components/ui/collapsible";
import { createCache } from "~/lib/cache";
import { CACHE_MAX_ENTRIES, CACHE_TTL_DETAIL_MS } from "~/lib/bangumi/constants";
import type { DownloadItem, DownloadSource, GroupedDownloads } from "~/lib/downloads";
import { useBangumiData, buildSiteHref } from "~/lib/bangumi-data";

type DownloadsPanelProps = {
  id: string;
  date?: string;
  searchKeyword: string;
};

type SourceFilter = "all" | DownloadSource;

/** 浏览器内存缓存：详情来回切换不重复请求 */
const clientCache = createCache<GroupedDownloads>({
  ttlMs: CACHE_TTL_DETAIL_MS,
  maxEntries: CACHE_MAX_ENTRIES.downloads,
});

const SOURCE_LABEL: Record<DownloadSource, string> = {
  comicat: "漫猫",
  dmhy: "動漫花園",
};

function DownloadRow({
  item,
  visibleSources,
}: {
  item: DownloadItem;
  visibleSources?: DownloadSource[];
}) {
  const sources = visibleSources ?? item.sources;

  return (
    <li className="rounded-lg border border-primary/25 bg-card px-3 py-2.5">
      <p className="text-xs font-medium leading-snug text-foreground">{item.title}</p>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
        {sources.map((s) => (
          <span key={s} className="rounded bg-accent px-1.5 py-0.5 font-mono text-primary">
            {SOURCE_LABEL[s]}
          </span>
        ))}
        {item.resolution ? (
          <span className="rounded bg-info/10 px-1.5 py-0.5 font-mono text-info">
            {item.resolution}
          </span>
        ) : null}
        {item.size ? <span className="font-mono">{item.size}</span> : null}
      </div>
      <div className="mt-2 flex flex-wrap gap-3">
        <a
          href={item.detailUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
        >
          详情页
        </a>
        <a
          href={item.magnet}
          className="inline-flex items-center gap-1 text-xs font-bold text-foreground hover:text-primary hover:underline"
        >
          <Magnet className="size-3" />
          磁力链接
        </a>
      </div>
    </li>
  );
}

function Group({
  icon: Icon,
  label,
  items,
  initialCount,
  visibleSources,
}: {
  icon: typeof Package;
  label: string;
  items: DownloadItem[];
  initialCount: number;
  visibleSources?: DownloadSource[];
}) {
  const [open, setOpen] = useState(false);
  if (!items.length) return null;

  const initiallyVisible = items.slice(0, initialCount);
  const remaining = items.slice(initialCount);

  return (
    <div className="space-y-2">
      <h4 className="flex items-center gap-1.5 text-xs font-bold text-foreground">
        <Icon className="size-3.5 text-primary" />
        {label}
        <span className="font-mono text-[11px] font-normal text-muted-foreground">
          ({items.length})
        </span>
      </h4>
      <ul className="space-y-2">
        {initiallyVisible.map((item) => (
          <DownloadRow key={item.hash} item={item} visibleSources={visibleSources} />
        ))}
      </ul>
      {remaining.length ? (
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleContent>
            <ul className="space-y-2 pb-2">
              {remaining.map((item) => (
                <DownloadRow key={item.hash} item={item} visibleSources={visibleSources} />
              ))}
            </ul>
          </CollapsibleContent>
          <CollapsibleTrigger className="flex w-full items-center justify-center gap-1 rounded-md border border-primary/25 px-2 py-1.5 text-xs font-bold text-primary transition-colors hover:bg-accent">
            {open ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
            {open ? "收起" : `显示剩余 ${remaining.length} 条`}
          </CollapsibleTrigger>
        </Collapsible>
      ) : null}
    </div>
  );
}

export function DownloadsPanel({ id, date, searchKeyword }: DownloadsPanelProps) {
  const [data, setData] = useState<GroupedDownloads | null>(() => clientCache.get(id) ?? null);
  const [state, setState] = useState<"idle" | "loading" | "error">(() =>
    clientCache.get(id) ? "idle" : "loading",
  );

  const { data: bgmData } = useBangumiData(id, date);
  const mikanSite = bgmData?.sites.find((s) => s.site === "mikan");
  const mikanHref = mikanSite ? buildSiteHref("mikan", mikanSite.id) : null;

  useEffect(() => {
    const cached = clientCache.get(id);
    if (cached) {
      setData(cached);
      setState("idle");
      return;
    }
    let alive = true;
    setState("loading");
    fetch(`/api/anime/downloads/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<GroupedDownloads>;
      })
      .then((d) => {
        if (!alive) return;
        clientCache.set(id, d);
        setData(d);
        setState("idle");
      })
      .catch(() => alive && setState("error"));
    return () => {
      alive = false;
    };
  }, [id]);

  const [source, setSource] = useState<SourceFilter>("all");

  const comicatSearch = `https://www.comicat.org/search.php?keyword=${encodeURIComponent(
    searchKeyword,
  )}`;

  // 按来源筛选 + 各来源计数
  const view = useMemo(() => {
    if (!data) return null;
    const all = [...data.batch, ...data.single];
    const has = (i: DownloadItem, s: DownloadSource) => i.sources.includes(s);
    const pick = (items: DownloadItem[]) =>
      source === "all" ? items : items.filter((i) => has(i, source));
    return {
      batch: pick(data.batch),
      single: pick(data.single),
      visibleSources: source === "all" ? undefined : [source],
      counts: {
        all: all.length,
        comicat: all.filter((i) => has(i, "comicat")).length,
        dmhy: all.filter((i) => has(i, "dmhy")).length,
      },
    };
  }, [data, source]);

  const FILTERS: { key: SourceFilter; label: string }[] = [
    { key: "all", label: "全部" },
    { key: "comicat", label: "漫猫" },
    { key: "dmhy", label: "動漫花園" },
  ];

  return (
    <section className="rounded-lg border border-border bg-card p-3.5">
      <Tabs
        value={source}
        onValueChange={(value) => {
          if (value === "all" || value === "comicat" || value === "dmhy") setSource(value);
        }}
        variant="underline"
        className="space-y-3"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-foreground">下载资源</h3>
            {mikanHref ? (
              <a
                href={mikanHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded bg-warning/10 px-1.5 py-0.5 font-mono text-[11px] font-bold text-rating hover:bg-warning/10 hover:underline"
              >
                <Download className="size-3" />
                蜜柑专属页 ↗
              </a>
            ) : null}
          </div>
          <a
            href={comicatSearch}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-bold text-primary hover:underline"
          >
            在漫猫搜索 →
          </a>
        </div>

        <p className="text-[11px] leading-relaxed text-muted-foreground">
          数据来自漫猫 + 動漫花園，按番名关键词搜索并去重，分为合集与单集。
        </p>

        {state === "idle" && view && view.counts.all > 0 ? (
          <TabsList aria-label="下载来源" className="w-full gap-1">
            {FILTERS.map((filter) => (
              <TabsTrigger key={filter.key} value={filter.key} className="px-2 text-xs">
                {filter.label}（{view.counts[filter.key]}）
              </TabsTrigger>
            ))}
          </TabsList>
        ) : null}

        {FILTERS.map((filter) => (
          <TabsContent key={filter.key} value={filter.key} className="mt-3">
            {source === filter.key ? (
              <>
                {state === "loading" ? (
                  <p className="px-3 py-4 text-center text-xs text-muted-foreground">
                    搜索下载资源中…
                  </p>
                ) : state === "error" ? (
                  <p className="rounded-lg border border-dashed border-primary/25 bg-accent px-3 py-4 text-center text-xs text-muted-foreground">
                    下载资源加载失败，可点上方「在漫猫搜索」手动查找。
                  </p>
                ) : view && view.counts.all > 0 ? (
                  view.batch.length || view.single.length ? (
                    <div key={source} className="space-y-4">
                      <Group
                        icon={Package}
                        label="合集 / 整季"
                        items={view.batch}
                        initialCount={5}
                        visibleSources={view.visibleSources}
                      />
                      <Group
                        icon={Film}
                        label="单集"
                        items={view.single}
                        initialCount={3}
                        visibleSources={view.visibleSources}
                      />
                    </div>
                  ) : (
                    <p className="px-3 py-4 text-center text-xs text-muted-foreground">
                      该来源暂无资源，换个来源试试。
                    </p>
                  )
                ) : (
                  <p className="rounded-lg border border-dashed border-primary/25 bg-accent px-3 py-4 text-center text-xs text-muted-foreground">
                    未搜索到相关资源，可点上方「在漫猫搜索」手动查找。
                  </p>
                )}
              </>
            ) : null}
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
}
