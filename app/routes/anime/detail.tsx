import {
  isRouteErrorResponse,
  Link,
  useOutletContext,
  useSearchParams,
} from "react-router";
import { Maximize2, Minimize2, X } from "lucide-react";
import type { Route } from "./+types/detail";
import type { AnimeOutletContext } from "./layout";
import { Badge } from "~/components/ui/badge";
import type { Episode, SubjectDetail } from "~/lib/bangumi/types-detail";
import {
  fetchSubjectDetail,
  fetchSubjectEpisodes,
  fetchSubjectPersons,
  pickStaff,
} from "~/lib/bangumi/fetch-detail";
import { buildListUrl, listParamsFromSearch } from "~/lib/bangumi/params";

export async function loader({ params }: Route.LoaderArgs) {
  const id = params.id;
  if (!id) throw new Response("缺少 id", { status: 400 });

  const [subject, persons, episodes] = await Promise.all([
    fetchSubjectDetail(id),
    fetchSubjectPersons(id),
    fetchSubjectEpisodes(id),
  ]);

  return { subject, staff: pickStaff(persons), episodes };
}

export default function AnimeDetail({ loaderData }: Route.ComponentProps) {
  const { subject, staff, episodes } = loaderData;
  const { expanded, setExpanded } = useOutletContext<AnimeOutletContext>();
  const [searchParams] = useSearchParams();
  const listBackUrl = buildListUrl(listParamsFromSearch(searchParams));

  const title = subject.name_cn || subject.name;
  const eps = subject.total_episodes || subject.eps || "—";
  const tags = (subject.tags ?? []).slice(0, 6);

  const kw = encodeURIComponent(title);
  const links = {
    online: `https://search.bilibili.com/all?keyword=${kw}`,
    download: `https://www.comicat.org/search.php?keyword=${kw}`,
    subtitle: `https://bbs.acgrip.com/search.php?mod=forum&srchtxt=${kw}`,
  };

  return (
    <div className="flex h-full flex-col">
      {/* 操作条 */}
      <div className="flex items-center justify-between gap-2 border-b border-border/50 p-3">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-muted/60 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted"
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
          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
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
        <div className="flex items-center gap-2">
          <Stars score={subject.rating.score} />
          <span className="text-2xl font-bold text-orange-500">
            {subject.rating.score}
          </span>
          <span className="text-xs text-muted-foreground">
            #{subject.rating.rank} · {subject.rating.total} 人
          </span>
        </div>
      ) : null}

      <div className="flex gap-3">
        {subject.images?.large ? (
          <button type="button" onClick={onExpand} className="shrink-0">
            <img
              src={subject.images.large}
              alt={title}
              referrerPolicy="no-referrer"
              className="h-44 w-32 rounded object-cover ring-1 ring-border transition-transform hover:scale-[1.03]"
            />
          </button>
        ) : null}
        <dl className="space-y-1 text-xs">
          <Row k="中文名" v={subject.name_cn} />
          <Row k="原名" v={subject.name} />
          <Row k="话数" v={String(eps)} />
          <Row k="放送开始" v={subject.date} />
          <Row k="原作" v={staff.原作} />
          <Row k="制作" v={staff.制作} />
          <Row k="监督" v={staff.监督} />
        </dl>
      </div>

      {tags.length ? (
        <div className="flex flex-wrap gap-1">
          {tags.map((t) => (
            <Badge key={t.name} variant="secondary">
              {t.name}
            </Badge>
          ))}
        </div>
      ) : null}

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
      <div className="flex flex-col gap-6 md:flex-row">
        {subject.images?.large ? (
          <img
            src={subject.images.large}
            alt={title}
            referrerPolicy="no-referrer"
            className="h-72 w-52 shrink-0 self-start rounded-xl object-cover shadow-lg ring-1 ring-border"
          />
        ) : null}
        <div className="min-w-0 flex-1 space-y-3">
          <h1 className="text-2xl font-bold">{title}</h1>
          {subject.name_cn && subject.name !== subject.name_cn ? (
            <p className="text-sm text-muted-foreground">{subject.name}</p>
          ) : null}
          {subject.rating?.score ? (
            <div className="flex items-center gap-2">
              <Stars score={subject.rating.score} />
              <span className="text-3xl font-bold text-orange-500">
                {subject.rating.score}
              </span>
              <span className="text-xs text-muted-foreground">
                #{subject.rating.rank} · {subject.rating.total} 人评分
              </span>
            </div>
          ) : null}
          <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
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
                <Badge key={t.name} variant="secondary">
                  {t.name}
                </Badge>
              ))}
            </div>
          ) : null}
          <JumpLinks links={links} />
        </div>
      </div>

      {subject.summary ? (
        <section>
          <h2 className="mb-2 text-lg font-semibold">简介</h2>
          <p className="text-sm leading-relaxed whitespace-pre-line text-foreground/80">
            {subject.summary}
          </p>
        </section>
      ) : null}

      {mainEps.length ? (
        <section>
          <h2 className="mb-2 text-lg font-semibold">
            章节 <span className="text-sm text-muted-foreground">({mainEps.length})</span>
          </h2>
          <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
            {mainEps.map((e) => (
              <li
                key={e.id}
                className="flex items-baseline gap-2 rounded px-2 py-1 text-sm hover:bg-muted"
              >
                <span className="w-8 shrink-0 text-right font-mono text-muted-foreground">
                  {e.sort}
                </span>
                <span className="min-w-0 flex-1 truncate">
                  {e.name_cn || e.name || "—"}
                </span>
                {e.airdate ? (
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {e.airdate}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

/* ───────── 小组件 ───────── */
function JumpLinks({ links }: { links: Record<string, string> }) {
  const labels: Record<string, string> = {
    online: "在线链接",
    download: "下载链接",
    subtitle: "字幕网站",
  };
  return (
    <div className="space-y-2 border-t border-border/50 pt-3 text-sm">
      {Object.entries(links).map(([k, href]) => (
        <div key={k} className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground">{labels[k]}</span>
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline"
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
      <dt className="shrink-0 text-muted-foreground">{k}:</dt>
      <dd className="min-w-0 break-words">{v}</dd>
    </div>
  );
}

function Stars({ score }: { score: number }) {
  const full = Math.round(score / 2); // 10 分制 → 5 星
  return (
    <span className="text-lg text-orange-400">
      {"★".repeat(full)}
      {"☆".repeat(5 - full)}
    </span>
  );
}

// 局部错误边界：详情加载失败只影响右栏
export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const msg = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : "加载详情失败";
  return (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      <p>😢 {msg}</p>
    </div>
  );
}
