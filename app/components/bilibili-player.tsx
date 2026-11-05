import { useEffect, useState } from "react";
import type {
  BilibiliEpisode,
  BilibiliMatch,
  BilibiliMatchResponse,
  BilibiliMatchStatus,
} from "~/lib/bilibili";
import { THIRD_PARTY_SEARCH } from "~/lib/external-links";
import { createCache } from "~/lib/cache";
import { CACHE_MAX_ENTRIES, CACHE_TTL_DETAIL_MS } from "~/lib/bangumi/constants";
import { Button, buttonVariants } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { cn } from "~/lib/utils";

type BilibiliPlayerProps = {
  id: string;
  fallbackKeyword: string;
};

type PanelState =
  | { kind: "loading" }
  | { kind: "matched"; match: BilibiliMatch }
  | { kind: "idle"; status: Exclude<BilibiliMatchStatus, "matched"> };

const clientCache = createCache<BilibiliMatchResponse>({
  ttlMs: CACHE_TTL_DETAIL_MS,
  maxEntries: CACHE_MAX_ENTRIES.clientDetail,
});

const HINT: Record<Exclude<BilibiliMatchStatus, "matched">, string> = {
  empty: "B 站番剧类目里没有自动匹配到对应条目。可用下方搜索页手动查找。",
  blocked: "B 站搜索接口当前被风控拦截，自动匹配不可用。这不代表没有版权，请用搜索页打开。",
  unavailable: "暂时连不上 B 站搜索接口。可用下方搜索页手动查找。",
};

function episodeTooltip(ep: BilibiliEpisode): string {
  const parts = [`第 ${ep.indexLabel} 集`];
  if (ep.title) parts.push(ep.title);
  if (ep.badge) parts.push(`（${ep.badge}）`);
  return parts.join(" · ");
}

function MatchedPanel({ match }: { match: BilibiliMatch }) {
  const episodes = match.episodes;
  const [selectedEpId, setSelectedEpId] = useState(() => episodes[0]?.epId);

  const selected = episodes.find((ep) => ep.epId === selectedEpId) ?? episodes[0] ?? null;
  const openUrl = selected?.pageUrl ?? match.pageUrl;

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-bold text-foreground">B 站观看</h3>
        <a
          href={match.seasonUrl}
          target="_blank"
          rel="noreferrer"
          className="text-xs font-bold text-primary hover:underline"
        >
          番剧主页 →
        </a>
      </div>
      <p className="text-[11px] text-muted-foreground">
        已匹配：{match.title}
        <span className="text-muted-foreground"> · 换集后播放器会重新加载</span>
      </p>

      {selected?.embedUrl ? (
        <div className="overflow-hidden rounded-lg border border-border bg-player">
          <iframe
            key={selected.epId}
            src={selected.embedUrl}
            title={`B站：${match.title} 第 ${selected.indexLabel} 集`}
            className="aspect-video w-full border-0"
            allowFullScreen
            allow="fullscreen; encrypted-media"
            loading="lazy"
          />
        </div>
      ) : (
        <div className="flex aspect-video items-center justify-center rounded-lg border border-dashed border-primary/25 bg-muted px-4 text-center">
          <p className="text-xs leading-relaxed text-muted-foreground">
            已定位到番剧，但无法生成嵌入地址。请用下方按钮在 B 站观看。
          </p>
        </div>
      )}

      {episodes.length > 0 ? (
        <div className="space-y-1.5">
          <p className="text-[11px] font-medium text-foreground">选集</p>
          <div className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto pr-0.5">
            {episodes.map((ep) => {
              const active = ep.epId === selected?.epId;
              return (
                <Button
                  variant="ghost"
                  key={ep.epId}
                  type="button"
                  title={episodeTooltip(ep)}
                  onClick={() => setSelectedEpId(ep.epId)}
                  className={cn(
                    "relative min-w-9 rounded-md border px-2 py-1 text-xs font-medium transition-colors",
                    active
                      ? "border-primary/25 bg-accent text-primary"
                      : "border-primary/25 bg-card text-foreground hover:border-primary/25 hover:bg-accent",
                  )}
                >
                  {ep.indexLabel}
                  {ep.badge ? (
                    <span className="absolute -top-1 -right-1 rounded bg-warning/10 px-0.5 text-[9px] leading-none text-warning">
                      会
                    </span>
                  ) : null}
                </Button>
              );
            })}
          </div>
          {selected?.title ? (
            <p className="text-[11px] text-muted-foreground">
              当前：第 {selected.indexLabel} 集 · {selected.title}
            </p>
          ) : null}
        </div>
      ) : null}

      <a
        href={openUrl}
        target="_blank"
        rel="noreferrer"
        className={buttonVariants({
          size: "sm",
          className: "h-8 bg-primary text-primary-foreground hover:bg-primary",
        })}
      >
        在 B 站打开{selected ? `第 ${selected.indexLabel} 集` : ""}
      </a>
    </>
  );
}

function SearchFallback({
  keyword,
  hint,
  onRetry,
}: {
  keyword: string;
  hint: string;
  onRetry?: () => void;
}) {
  const searchUrl = THIRD_PARTY_SEARCH.online.build(keyword);
  return (
    <>
      <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p>
      <div className="flex flex-wrap items-center gap-3">
        <a
          href={searchUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex text-xs font-bold text-primary hover:underline"
        >
          在 B 站搜索「{keyword}」→
        </a>
        {onRetry ? (
          <Button
            variant="ghost"
            type="button"
            onClick={onRetry}
            className="text-xs font-bold text-muted-foreground hover:text-primary hover:underline"
          >
            重试自动匹配
          </Button>
        ) : null}
      </div>
    </>
  );
}

export function BilibiliPlayer({ id, fallbackKeyword }: BilibiliPlayerProps) {
  const [state, setState] = useState<PanelState>({ kind: "loading" });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    const cached = nonce === 0 ? clientCache.get(id) : undefined;
    if (cached) {
      if (cached.match) setState({ kind: "matched", match: cached.match });
      else
        setState({ kind: "idle", status: cached.status === "matched" ? "empty" : cached.status });
      return;
    }

    const ac = new AbortController();
    setState({ kind: "loading" });

    fetch(`/api/anime/bilibili/${id}`, { signal: ac.signal })
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.json() as Promise<BilibiliMatchResponse>;
      })
      .then((data) => {
        clientCache.set(id, data);
        if (data.match) setState({ kind: "matched", match: data.match });
        else setState({ kind: "idle", status: data.status === "matched" ? "empty" : data.status });
      })
      .catch(() => {
        if (ac.signal.aborted) return;
        setState({ kind: "idle", status: "unavailable" });
      });

    return () => ac.abort();
  }, [id, nonce]);

  const retry = () => {
    clientCache.delete(id);
    setNonce((n) => n + 1);
  };

  return (
    <section className="space-y-2 rounded-lg border border-primary/25 bg-card p-3 shadow-sm">
      {state.kind === "matched" ? (
        <MatchedPanel match={state.match} />
      ) : (
        <>
          <h3 className="text-sm font-bold text-foreground">B 站观看</h3>
          {state.kind === "loading" ? (
            <Skeleton className="aspect-video w-full rounded-lg bg-accent" />
          ) : (
            <SearchFallback
              keyword={fallbackKeyword}
              hint={HINT[state.status]}
              onRetry={state.status === "empty" ? undefined : retry}
            />
          )}
        </>
      )}
    </section>
  );
}
