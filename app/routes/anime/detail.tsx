import { isRouteErrorResponse, Link, useOutletContext, useSearchParams } from "react-router";
import { Maximize2, Minimize2, X } from "lucide-react";
import type { Route } from "./+types/detail";
import type { AnimeOutletContext } from "./layout";
import { Badge } from "~/components/ui/badge";
import { SubjectComments } from "~/components/subject-comments";
import { DownloadsPanel } from "~/components/downloads-panel";
import { createCache } from "~/lib/cache";
import type { DetailPayload, Episode, SubjectDetail } from "~/lib/bangumi/types-detail";
import { fetchCachedDetail } from "~/lib/bangumi/server/detail.server";
import { CACHE_MAX_ENTRIES, CACHE_TTL_DETAIL_MS } from "~/lib/bangumi/constants";
import { throwRouteUpstreamError, upstreamFromRequest } from "~/lib/upstream";
import { toHttps } from "~/lib/anime-meta";
import { buildListUrl, listParamsFromSearch } from "~/lib/bangumi/params";
import { BGM_WEB_ROUTES, THIRD_PARTY_SEARCH } from "~/lib/external-links";
import { StreamingPanel } from "~/components/streaming-panel";
import { SubjectRelationsPanel } from "~/components/subject-relations";
import {
  isAnimeSubjectType,
  subjectCountLabel,
  subjectDateLabel,
} from "~/lib/bangumi/subject-display";

// 客户端详情缓存（存储在浏览器内存中，实现 0ms 切页）
const clientDetailCache = createCache<DetailPayload>({
  ttlMs: CACHE_TTL_DETAIL_MS,
  maxEntries: CACHE_MAX_ENTRIES.clientDetail,
});

export async function loader({ params, request }: Route.LoaderArgs) {
  const id = params.id;
  if (!id) throw new Response("缺少 id", { status: 400 });

  try {
    const data = await fetchCachedDetail(id, upstreamFromRequest(request));

    // 深度克隆以避免直接修改内存中的共享缓存
    const clonedData = JSON.parse(JSON.stringify(data)) as DetailPayload;

    // 将图片链接全部自动升级为 HTTPS，避开 307 重定向
    if (clonedData.subject.images) {
      if (clonedData.subject.images.large) {
        clonedData.subject.images.large = toHttps(clonedData.subject.images.large) ?? clonedData.subject.images.large;
      }
      if (clonedData.subject.images.common) {
        clonedData.subject.images.common = toHttps(clonedData.subject.images.common);
      }
      if (clonedData.subject.images.medium) {
        clonedData.subject.images.medium = toHttps(clonedData.subject.images.medium);
      }
      if (clonedData.subject.images.grid) {
        clonedData.subject.images.grid = toHttps(clonedData.subject.images.grid);
      }
    }

    return clonedData;
  } catch (err) {
    throwRouteUpstreamError(err);
  }
}

export async function clientLoader({ params, serverLoader }: Route.ClientLoaderArgs) {
  const id = params.id;
  if (!id) return serverLoader();

  const cached = clientDetailCache.get(id);
  if (cached) return cached;

  const data = await serverLoader();
  clientDetailCache.set(id, data);
  return data;
}

clientLoader.hydrate = true;

export default function AnimeDetailRoute({ loaderData }: Route.ComponentProps) {
  const { subject, staff, episodes } = loaderData;
  const { isMobile, expanded, setExpanded } = useOutletContext<AnimeOutletContext>();
  const [searchParams] = useSearchParams();

  // 返回列表的 URL 保留当前的筛选参数
  const currentListParams = listParamsFromSearch(searchParams);
  const listBackUrl = buildListUrl(currentListParams);

  // 在桌面端展开态 或 移动端下，均展示完整信息
  const showFull = expanded || isMobile;

  const title = subject.name_cn || subject.name;
  const countValue = subject.total_episodes || subject.eps;
  const tags = (subject.tags ?? []).slice(0, 6);
  const isAnime = isAnimeSubjectType(subject.type);

  const links: Record<string, string> = {
    bangumi: BGM_WEB_ROUTES.subject(subject.id),
  };
  if (isAnime) {
    links.online = THIRD_PARTY_SEARCH.online.build(title);
    links.download = THIRD_PARTY_SEARCH.download.build(title);
    links.subtitle = THIRD_PARTY_SEARCH.subtitle.build(title);
  }

  return (
    <div className="flex h-full flex-col">
      {/* 操作条：桌面可展开/收起；移动端仅返回列表 */}
      <div
        className={
          "flex items-center gap-2 border-b border-rose-100/80 bg-white/45 p-3 backdrop-blur-md " +
          (isMobile ? "justify-end" : "justify-between")
        }
      >
        {!isMobile ? (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-rose-300 to-sky-300 px-3 py-1.5 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:from-rose-200 hover:to-sky-200"
          >
            {expanded ? (
              <>
                <Minimize2 className="size-4" /> 收起
              </>
            ) : (
              <>
                <Maximize2 className="size-4" /> 展开详情
              </>
            )}
          </button>
        ) : null}
        <Link
          to={listBackUrl}
          className="rounded-lg border border-rose-100 bg-white/70 p-1.5 text-slate-500 transition-colors hover:bg-white hover:text-rose-700"
          aria-label="关闭"
        >
          <X className="size-4" />
        </Link>
      </div>

      <div className="min-w-0 flex-1 overflow-y-auto p-4">
        <div className={showFull ? "mx-auto max-w-5xl space-y-6" : "space-y-4"}>
          <DetailOverview
            subject={subject}
            staff={staff}
            tags={tags}
            countValue={countValue}
            expanded={showFull}
            onExpand={() => {
              if (!isMobile) setExpanded(true);
            }}
          />

          {isAnime ? (
            <>
              <StreamingPanel
                id={String(subject.id)}
                date={subject.date}
                title={title}
              />
              <DownloadsPanel
                id={String(subject.id)}
                date={subject.date}
                searchKeyword={title}
              />
            </>
          ) : null}
          <JumpLinks links={links} />

          {showFull ? (
            <FullExtras subject={subject} episodes={episodes} showEpisodes={isAnime} />
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* ───────── 详情概要：同一棵内容树，根据宽度调整布局 ───────── */
function DetailOverview({
  subject,
  staff,
  tags,
  countValue,
  expanded,
  onExpand,
}: {
  subject: SubjectDetail;
  staff: Record<string, string>;
  tags: Array<{ name: string }>;
  countValue?: number;
  expanded: boolean;
  onExpand: () => void;
}) {
  const title = subject.name_cn || subject.name;
  const countLabel = subjectCountLabel(subject.type);
  const dateLabel = subjectDateLabel(subject.type);
  const staffRows = Object.entries(staff).filter(([, v]) => Boolean(v));

  return (
    <section
      className={
        "rounded-lg border border-white/75 bg-white/58 shadow-sm " + (expanded ? "p-4" : "p-3")
      }
    >
      <div className={expanded ? "flex flex-col gap-6 md:flex-row" : "flex gap-3"}>
        {subject.images?.large ? (
          <button
            type="button"
            onClick={() => !expanded && onExpand()}
            disabled={expanded}
            className="shrink-0 self-start disabled:cursor-default"
          >
            <img
              src={subject.images.large}
              alt={title}
              referrerPolicy="no-referrer"
              className={
                "rounded-lg border border-rose-100 object-cover shadow-sm transition-transform " +
                (expanded ? "h-72 w-52 shadow-md" : "h-44 w-32 hover:scale-[1.03]")
              }
            />
          </button>
        ) : null}
        <div className={expanded ? "min-w-0 flex-1 space-y-3" : "min-w-0 flex-1 space-y-2"}>
          <h1
            className={
              "font-serif font-bold text-slate-800 " + (expanded ? "text-2xl" : "text-base")
            }
          >
            {title}
          </h1>
          {subject.name_cn && subject.name !== subject.name_cn ? (
            <p
              className={
                expanded ? "font-mono text-sm text-slate-500" : "font-mono text-xs text-slate-500"
              }
            >
              {subject.name}
            </p>
          ) : null}
          {subject.rating?.score ? (
            <div className="flex items-center gap-2">
              <Stars score={subject.rating.score} />
              <span
                className={
                  expanded
                    ? "font-mono text-3xl font-bold text-amber-500"
                    : "font-mono text-2xl font-bold text-amber-500"
                }
              >
                {subject.rating.score}
              </span>
              <span className="text-xs text-slate-500">
                #{subject.rating.rank} · {subject.rating.total} 人评分
              </span>
            </div>
          ) : null}
          <dl
            className={
              expanded
                ? "grid grid-cols-1 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2"
                : "space-y-1.5 text-xs"
            }
          >
            <Row k="中文名" v={subject.name_cn} />
            <Row k="原名" v={subject.name} />
            {countValue ? <Row k={countLabel} v={String(countValue)} /> : null}
            <Row k={dateLabel} v={subject.date} />
            {staffRows.map(([k, v]) => (
              <Row key={k} k={k} v={v} />
            ))}
            <Row k="平台" v={subject.platform} />
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
        </div>
      </div>
    </section>
  );
}

function FullExtras({
  subject,
  episodes,
  showEpisodes,
}: {
  subject: SubjectDetail;
  episodes: Episode[];
  showEpisodes: boolean;
}) {
  const mainEps = showEpisodes ? episodes.filter((e) => e.type === 0) : [];

  return (
    <>
      {subject.summary ? (
        <section className="rounded-lg border border-white/75 bg-white/58 p-5 shadow-sm">
          <h2 className="mb-2 font-serif text-lg font-bold text-slate-800">简介</h2>
          <p className="whitespace-pre-line font-serif text-sm leading-relaxed text-slate-700">
            {subject.summary}
          </p>
        </section>
      ) : null}

      {mainEps.length ? (
        <section className="rounded-lg border border-white/75 bg-white/58 p-5 shadow-sm">
          <h2 className="mb-3 font-serif text-lg font-bold text-slate-800">
            章节 <span className="font-mono text-sm text-slate-500">({mainEps.length})</span>
          </h2>
          <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
            {mainEps.map((e) => (
              <li
                key={e.id}
                className="flex items-baseline gap-2 rounded-lg border border-transparent px-2 py-1.5 text-sm transition-colors hover:border-rose-100 hover:bg-white/72"
              >
                <span className="w-8 shrink-0 text-right font-mono text-slate-400">{e.sort}</span>
                <span className="min-w-0 flex-1 truncate">{e.name_cn || e.name || "—"}</span>
                {e.airdate ? (
                  <span className="shrink-0 font-mono text-xs text-rose-700">{e.airdate}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <SubjectComments id={String(subject.id)} />
      <SubjectRelationsPanel id={String(subject.id)} enabled />
    </>
  );
}

function JumpLinks({ links }: { links: Record<string, string> }) {
  const labels: Record<string, string> = {
    bangumi: "官方页面",
    online: THIRD_PARTY_SEARCH.online.label,
    download: THIRD_PARTY_SEARCH.download.label,
    subtitle: THIRD_PARTY_SEARCH.subtitle.label,
  };
  return (
    <div className="space-y-2 border-t border-rose-100 pt-3 text-sm">
      {Object.entries(links).map(([k, href]) => (
        <div
          key={k}
          className="flex items-center justify-between gap-2 rounded-lg border border-rose-100 bg-white/58 px-3 py-2"
        >
          <span className="text-slate-500">{labels[k] || k}</span>
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="font-bold text-rose-700 hover:underline"
          >
            前往 →
          </a>
        </div>
      ))}
    </div>
  );
}

function Row({ k, v }: { k: string; v?: string }) {
  if (!v) return null;
  return (
    <div className="flex gap-2">
      <dt className="shrink-0 text-slate-500">{k}:</dt>
      <dd className="min-w-0 break-words text-slate-800">{v}</dd>
    </div>
  );
}

function Stars({ score }: { score: number }) {
  const full = Math.round(score / 2); // 10 分制 → 5 星
  return (
    <span className="text-lg text-amber-400">
      {"★".repeat(full)}
      {"☆".repeat(5 - full)}
    </span>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  if (isRouteErrorResponse(error)) {
    return (
      <div className="p-8 text-center text-slate-500">
        <h2 className="font-serif text-lg font-bold text-rose-700">加载失败</h2>
        <p className="mt-2 text-sm">{error.data || "条目不存在或已被删除"}</p>
      </div>
    );
  }
  return (
    <div className="p-8 text-center text-rose-700">
      <h2 className="font-serif text-lg font-bold">发生未知错误</h2>
    </div>
  );
}
