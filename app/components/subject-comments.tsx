import { useEffect, useState } from "react";
import { Link } from "react-router";
import { MessageSquare, Star } from "lucide-react";
import type {
  CommentPage,
  ReviewPage,
  SubjectComment,
  SubjectComments as SubjectCommentsData,
  SubjectReview,
} from "~/lib/bangumi/types-comments";

type Loaded = {
  comments: SubjectComment[];
  commentsTotal: number;
  reviews: SubjectReview[];
  reviewsTotal: number;
};

/** 浏览器内存缓存：保存累计加载的页，详情来回切换不丢已展开内容 */
const clientCache = new Map<string, Loaded>();

function formatDate(ts: number): string {
  if (!ts) return "";
  const d = new Date(ts * 1000);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function Avatar({ url, name }: { url?: string; name: string }) {
  if (!url) {
    return (
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-rose-100 font-mono text-xs text-rose-700">
        {name.slice(0, 1)}
      </span>
    );
  }
  return (
    <img
      src={url}
      alt={name}
      referrerPolicy="no-referrer"
      loading="lazy"
      className="size-8 shrink-0 rounded-full border border-rose-100 object-cover"
    />
  );
}

function LoadMore({
  shown,
  total,
  loading,
  onClick,
}: {
  shown: number;
  total: number;
  loading: boolean;
  onClick: () => void;
}) {
  if (shown >= total) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="mt-3 w-full rounded-lg border border-rose-100 bg-white/60 py-2 font-mono text-xs font-semibold text-rose-700 transition-colors hover:bg-white disabled:opacity-60"
    >
      {loading ? "加载中…" : `加载更多（${shown}/${total}）`}
    </button>
  );
}

export function SubjectComments({ id }: { id: string }) {
  const [data, setData] = useState<Loaded | null>(
    () => clientCache.get(id) ?? null,
  );
  const [state, setState] = useState<"idle" | "loading" | "error">(
    () => (clientCache.has(id) ? "idle" : "loading"),
  );
  const [loadingComments, setLoadingComments] = useState(false);
  const [loadingReviews, setLoadingReviews] = useState(false);

  useEffect(() => {
    if (clientCache.has(id)) {
      setData(clientCache.get(id)!);
      setState("idle");
      return;
    }
    let alive = true;
    setState("loading");
    fetch(`/api/anime/comments/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<SubjectCommentsData>;
      })
      .then((d) => {
        if (!alive) return;
        const loaded: Loaded = {
          comments: d.comments,
          commentsTotal: d.commentsTotal,
          reviews: d.reviews,
          reviewsTotal: d.reviewsTotal,
        };
        clientCache.set(id, loaded);
        setData(loaded);
        setState("idle");
      })
      .catch(() => alive && setState("error"));
    return () => {
      alive = false;
    };
  }, [id]);

  function save(next: Loaded) {
    clientCache.set(id, next);
    setData(next);
  }

  async function loadMoreComments() {
    if (!data || loadingComments) return;
    setLoadingComments(true);
    try {
      const res = await fetch(
        `/api/anime/comments/${id}?kind=comments&offset=${data.comments.length}`,
      );
      const page = (await res.json()) as CommentPage;
      save({
        ...data,
        comments: [...data.comments, ...page.items],
        commentsTotal: page.total || data.commentsTotal,
      });
    } catch {
      /* 静默：加载更多失败保持已有列表 */
    } finally {
      setLoadingComments(false);
    }
  }

  async function loadMoreReviews() {
    if (!data || loadingReviews) return;
    setLoadingReviews(true);
    try {
      const res = await fetch(
        `/api/anime/comments/${id}?kind=reviews&offset=${data.reviews.length}`,
      );
      const page = (await res.json()) as ReviewPage;
      save({
        ...data,
        reviews: [...data.reviews, ...page.items],
        reviewsTotal: page.total || data.reviewsTotal,
      });
    } catch {
      /* 静默 */
    } finally {
      setLoadingReviews(false);
    }
  }

  if (state === "loading") {
    return (
      <section className="rounded-lg border border-white/75 bg-white/58 p-5 shadow-sm">
        <p className="text-sm text-slate-400">评论加载中…</p>
      </section>
    );
  }
  if (state === "error" || !data) return null;

  const { comments, commentsTotal, reviews, reviewsTotal } = data;
  if (!comments.length && !reviews.length) return null;

  return (
    <>
      {reviews.length ? (
        <section className="rounded-lg border border-white/75 bg-white/58 p-5 shadow-sm">
          <h2 className="mb-3 flex items-baseline gap-2 font-serif text-lg font-bold text-slate-800">
            评论
            <span className="font-mono text-sm text-slate-500">
              ({reviewsTotal})
            </span>
          </h2>
          <ul className="space-y-3">
            {reviews.map((r) => (
              <li key={r.id}>
                <Link
                  to={`/anime/blog/${r.entryId}`}
                  prefetch="intent"
                  className="block rounded-lg border border-rose-100/70 bg-white/60 p-3 transition-colors hover:border-rose-200 hover:bg-white"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="min-w-0 truncate font-serif text-sm font-bold text-slate-800">
                      {r.title}
                    </h3>
                    <span className="flex shrink-0 items-center gap-1 font-mono text-[11px] text-slate-400">
                      <MessageSquare className="size-3" />
                      {r.replies}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-600">
                    {r.summary}
                  </p>
                  <p className="mt-1.5 font-mono text-[11px] text-slate-400">
                    {r.nickname} · {formatDate(r.date)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
          <LoadMore
            shown={reviews.length}
            total={reviewsTotal}
            loading={loadingReviews}
            onClick={loadMoreReviews}
          />
        </section>
      ) : null}

      {comments.length ? (
        <section className="rounded-lg border border-white/75 bg-white/58 p-5 shadow-sm">
          <h2 className="mb-3 flex items-baseline gap-2 font-serif text-lg font-bold text-slate-800">
            吐槽
            <span className="font-mono text-sm text-slate-500">
              ({commentsTotal})
            </span>
          </h2>
          <ul className="space-y-3">
            {comments.map((c) => (
              <li key={c.id} className="flex gap-3">
                <Avatar url={c.avatar} name={c.nickname} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-mono text-xs font-semibold text-slate-600">
                      {c.nickname}
                    </span>
                    {c.rate ? (
                      <span className="flex shrink-0 items-center gap-0.5 font-mono text-[11px] text-amber-500">
                        <Star className="size-3 fill-amber-500" />
                        {c.rate}
                      </span>
                    ) : null}
                    <span className="ml-auto shrink-0 font-mono text-[11px] text-slate-400">
                      {formatDate(c.date)}
                    </span>
                  </div>
                  <p className="mt-0.5 whitespace-pre-line text-sm leading-relaxed text-slate-700">
                    {c.comment}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <LoadMore
            shown={comments.length}
            total={commentsTotal}
            loading={loadingComments}
            onClick={loadMoreComments}
          />
        </section>
      ) : null}
    </>
  );
}
