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
import { throwRouteUpstreamError, upstreamFromRequest } from "~/lib/upstream";
import { toHttps } from "~/lib/anime-meta";
import { buildListUrl, listParamsFromSearch } from "~/lib/bangumi/params";
import { BGM_WEB_ROUTES, THIRD_PARTY_SEARCH } from "~/lib/external-links";
import { BilibiliPlayer } from "~/components/bilibili-player";

// 客户端详情缓存（存储在浏览器内存中，实现 0ms 切页）
const clientDetailCache = createCache<DetailPayload>();

export async function loader({ params, request }: Route.LoaderArgs) {
  const id = params.id;
  if (!id) throw new Response("缺少 id", { status: 400 });

  try {
    const data = await fetchCachedDetail(id, upstreamFromRequest(request));

    // 深度克隆以避免直接修改内存中的共享缓存
    const clonedData = JSON.parse(JSON.stringify(data)) as DetailPayload;

    // 将图片链接全部自动升级为 HTTPS，避开 307 重定向
    if (clonedData.subject.images) {
      const images = clonedData.subject.images;
      for (const key of Object.keys(images) as Array<keyof typeof images>) {
        if (images[key]) {
          images[key] = toHttps(images[key])!;
        }
      }
    }

    return clonedData;
  } catch (error) {
    throwRouteUpstreamError(error);
  }
}

export async function clientLoader({
  params,
  serverLoader,
}: Route.ClientLoaderArgs): Promise<DetailPayload> {
  const id = params.id;
  if (!id) throw new Error("缺少 id");

  const cached = clientDetailCache.get(id);
  if (cached) return cached;

  const data = (await serverLoader()) as DetailPayload;
  clientDetailCache.set(id, data);
  return data;
}
clientLoader.hydrate = true as const;

export default function AnimeDetail({ loaderData }: Route.ComponentProps) {
  const { subject, staff, episodes } = loaderData;
  const { expanded, setExpanded } = useOutletContext<AnimeOutletContext>();
  const [searchParams] = useSearchParams();
  const listBackUrl = buildListUrl(listParamsFromSearch(searchParams));

  const title = subject.name_cn || subject.name;
  const eps = subject.total_episodes || subject.eps || "—";
  const tags = (subject.tags ?? []).slice(0, 6);

  const links = {
    bangumi: BGM_WEB_ROUTES.subject(subject.id),
    online: THIRD_PARTY_SEARCH.online.build(title),
    download: THIRD_PARTY_SEARCH.download.build(title),
    subtitle: THIRD_PARTY_SEARCH.subtitle.build(title),
  };

  return (
    <div className="flex h-full flex-col">
      {/* 操作条 */}
      <div className="flex items-center justify-between gap-2 border-b border-rose-100/80 bg-white/45 p-3 backdrop-blur-md">
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
        <Link
          to={listBackUrl}
          className="rounded-lg border border-rose-100 bg-white/70 p-1.5 text-slate-500 transition-colors hover:bg-white hover:text-rose-700"
          aria-label="关闭"
        >
          <X className="size-4" />
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {expanded ? (
          <FullView
            subject={subject}
            staff={staff}
            episodes={episodes}
            tags={tags}
            eps={eps}
            links={links}
            onCollapse={() => setExpanded(false)}
          />
        ) : (
          <CompactView
            subject={subject}
            staff={staff}
            tags={tags}
            eps={eps}
            links={links}
            onExpand={() => setExpanded(true)}
          />
        )}
      </div>
    </div>
  );
}

/* ───────── 紧凑视图（挤出的窄面板）───────── */
function CompactView({
  subject,
  staff,
  tags,
  eps,
  links,
  onExpand,
}: {
  subject: SubjectDetail;
  staff: Record<string, string>;
  tags: Array<{ name: string }>;
  eps: string | number;
  links: Record<string, string>;
  onExpand: () => void;
}) {
  const title = subject.name_cn || subject.name;
  return (
    <div className="space-y-4">
      {subject.rating?.score ? (
        <div className="rounded-lg border border-rose-100 bg-white/64 p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <Stars score={subject.rating.score} />
            <span className="font-mono text-2xl font-bold text-amber-500">
              {subject.rating.score}
            </span>
            <span className="text-xs text-slate-500">
              #{subject.rating.rank} · {subject.rating.total} 人
            </span>
          </div>
        </div>
      ) : null}

      <div className="rounded-lg border border-white/75 bg-white/58 p-3 shadow-sm">
        <div className="flex gap-3">
          {subject.images?.large ? (
            <button type="button" onClick={onExpand} className="shrink-0">
              <img
                src={subject.images.large}
                alt={title}
                referrerPolicy="no-referrer"
                className="h-44 w-32 rounded-lg border border-rose-100 object-cover shadow-sm transition-transform hover:scale-[1.03]"
              />
            </button>
          ) : null}
          <dl className="space-y-1.5 text-xs">
            <Row k="中文名" v={subject.name_cn} />
            <Row k="原名" v={subject.name} />
            <Row k="话数" v={String(eps)} />
            <Row k="放送开始" v={subject.date} />
            <Row k="原作" v={staff.原作} />
            <Row k="制作" v={staff.制作} />
            <Row k="监督" v={staff.监督} />
          </dl>
        </div>
      </div>

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

      <BilibiliPlayer id={String(subject.id)} fallbackKeyword={title} />

      <DownloadsPanel id={String(subject.id)} searchKeyword={title} />

      <JumpLinks links={links} />
    </div>
  );
}

/* ───────── 全屏视图（占满整屏的宽视图）───────── */
function FullView({
  subject,
  staff,
  episodes,
  tags,
  eps,
  links,
}: {
  subject: SubjectDetail;
  staff: Record<string, string>;
  episodes: Episode[];
  tags: Array<{ name: string }>;
  eps: string | number;
  links: Record<string, string>;
  onCollapse: () => void;
}) {
  const title = subject.name_cn || subject.name;
  const mainEps = episodes.filter((e) => e.type === 0);
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="rounded-lg border border-white/75 bg-white/58 p-4 shadow-sm">
        <div className="flex flex-col gap-6 md:flex-row">
          {subject.images?.large ? (
            <img
              src={subject.images.large}
              alt={title}
              referrerPolicy="no-referrer"
              className="h-72 w-52 shrink-0 self-start rounded-lg border border-rose-100 object-cover shadow-md"
            />
          ) : null}
          <div className="min-w-0 flex-1 space-y-3">
            <h1 className="font-serif text-2xl font-bold text-slate-800">{title}</h1>
            {subject.name_cn && subject.name !== subject.name_cn ? (
              <p className="font-mono text-sm text-slate-500">{subject.name}</p>
            ) : null}
            {subject.rating?.score ? (
              <div className="flex items-center gap-2">
                <Stars score={subject.rating.score} />
                <span className="font-mono text-3xl font-bold text-amber-500">
                  {subject.rating.score}
                </span>
                <span className="text-xs text-slate-500">
                  #{subject.rating.rank} · {subject.rating.total} 人评分
                </span>
              </div>
            ) : null}
            <dl className="grid grid-cols-1 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
              <Row k="话数" v={String(eps)} />
              <Row k="放送开始" v={subject.date} />
              <Row k="原作" v={staff.原作} />
              <Row k="制作" v={staff.制作} />
              <Row k="监督" v={staff.监督} />
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
            <JumpLinks links={links} />
          </div>
        </div>
      </div>

      <BilibiliPlayer id={String(subject.id)} fallbackKeyword={title} />

      <DownloadsPanel id={String(subject.id)} searchKeyword={title} />

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
    </div>
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

// 局部错误边界：详情加载失败只影响右栏
export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const msg = isRouteErrorResponse(error) ? `${error.status} ${error.statusText}` : "加载详情失败";
  return (
    <div className="flex h-full items-center justify-center text-sm text-slate-500">
      <p>{msg}</p>
    </div>
  );
}
