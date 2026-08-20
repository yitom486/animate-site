import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Magnet, Package, Film } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "~/components/ui/collapsible";
import { createCache } from "~/lib/cache";
import { CACHE_MAX_ENTRIES, CACHE_TTL_DETAIL_MS } from "~/lib/bangumi/constants";
import type { DownloadItem, DownloadSource, GroupedDownloads } from "~/lib/downloads";

type DownloadsPanelProps = {
  id: string;
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
    <li className="rounded-lg border border-rose-100/80 bg-white/70 px-3 py-2.5">
      <p className="text-xs font-medium leading-snug text-slate-800">{item.title}</p>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500">
        {sources.map((s) => (
          <span key={s} className="rounded bg-rose-50 px-1.5 py-0.5 font-mono text-rose-700">
            {SOURCE_LABEL[s]}
          </span>
        ))}
        {item.resolution ? (
          <span className="rounded bg-sky-50 px-1.5 py-0.5 font-mono text-sky-700">
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
          className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 hover:underline"
        >
          详情页
        </a>
        <a
          href={item.magnet}
          className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-rose-700 hover:underline"
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
      <h4 className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
        <Icon className="size-3.5 text-rose-600" />
        {label}
        <span className="font-mono text-[11px] font-normal text-slate-400">({items.length})</span>
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
          <CollapsibleTrigger className="flex w-full items-center justify-center gap-1 rounded-md border border-rose-100 px-2 py-1.5 text-xs font-bold text-rose-700 transition-colors hover:bg-rose-50">
            {open ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
            {open ? "收起" : `显示剩余 ${remaining.length} 条`}
          </CollapsibleTrigger>
        </Collapsible>
      ) : null}
    </div>
  );
}

export function DownloadsPanel({ id, searchKeyword }: DownloadsPanelProps) {
  const [data, setData] = useState<GroupedDownloads | null>(() => clientCache.get(id) ?? null);
  const [state, setState] = useState<"idle" | "loading" | "error">(() =>
    clientCache.get(id) ? "idle" : "loading",
  );

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
    <section className="space-y-3 rounded-lg border border-rose-100 bg-white/58 p-3 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-bold text-slate-800">下载资源</h3>
        <a
          href={comicatSearch}
          target="_blank"
          rel="noreferrer"
          className="text-xs font-bold text-rose-700 hover:underline"
        >
          在漫猫搜索 →
        </a>
      </div>

      <p className="text-[11px] leading-relaxed text-slate-500">
        数据来自漫猫 + 動漫花園，按番名关键词搜索并去重，分为合集与单集。
      </p>

      {state === "idle" && view && view.counts.all > 0 ? (
        <div className="flex gap-1 rounded-lg border border-rose-100 bg-white/60 p-0.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setSource(f.key)}
              className={
                "flex-1 rounded-md px-2 py-1 font-mono text-[11px] font-bold transition-colors " +
                (source === f.key
                  ? "bg-gradient-to-r from-rose-300 to-sky-300 text-slate-700 shadow-sm"
                  : "text-slate-500 hover:text-rose-700")
              }
            >
              {f.label}（{view.counts[f.key]}）
            </button>
          ))}
        </div>
      ) : null}

      {state === "loading" ? (
        <p className="px-3 py-4 text-center text-xs text-slate-400">搜索下载资源中…</p>
      ) : state === "error" ? (
        <p className="rounded-lg border border-dashed border-rose-100 bg-rose-50/40 px-3 py-4 text-center text-xs text-slate-500">
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
          <p className="px-3 py-4 text-center text-xs text-slate-400">
            该来源暂无资源，换个来源试试。
          </p>
        )
      ) : (
        <p className="rounded-lg border border-dashed border-rose-100 bg-rose-50/40 px-3 py-4 text-center text-xs text-slate-500">
          未搜索到相关资源，可点上方「在漫猫搜索」手动查找。
        </p>
      )}
    </section>
  );
}
