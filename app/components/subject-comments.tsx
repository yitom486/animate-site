import { Button } from "~/components/ui/button";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { MessageSquare, Star } from "lucide-react";
import { createCache } from "~/lib/cache";
import { CACHE_MAX_ENTRIES, CACHE_TTL_DETAIL_MS } from "~/lib/bangumi/constants";
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
const clientCache = createCache<Loaded>({
  ttlMs: CACHE_TTL_DETAIL_MS,
  maxEntries: CACHE_MAX_ENTRIES.clientDetail,
});

function formatDate(ts: number): string {
  if (!ts) return "";
  const d = new Date(ts * 1000);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function Avatar({ url, name }: { url?: string; name: string }) {
  if (!url) {
    return (
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent font-mono text-xs text-primary">
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
      className="size-8 shrink-0 rounded-full border border-primary/25 object-cover"
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
    <Button
      variant="ghost"
      type="button"
      onClick={onClick}
      disabled={loading}
      className="mt-3 w-full rounded-lg border border-primary/25 bg-card py-2 font-mono text-xs font-semibold text-primary transition-colors hover:bg-muted/50 disabled:opacity-60"
    >
      {loading ? "加载中…" : `加载更多（${shown}/${total}）`}
    </Button>
  );
}

export function SubjectComments({ id }: { id: string }) {
  const [data, setData] = useState<Loaded | null>(() => clientCache.get(id) ?? null);
  const [state, setState] = useState<"idle" | "loading" | "error">(() =>
    clientCache.get(id) ? "idle" : "loading",
  );
  const [loadingComments, setLoadingComments] = useState(false);
  const [loadingReviews, setLoadingReviews] = useState(false);

  useEffect(() => {
    const cached = clientCache.get(id);
    if (cached) {
      setData(cached);
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
      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <p className="text-sm text-muted-foreground">评论加载中…</p>
      </section>
    );
  }
  if (state === "error" || !data) return null;

  const { comments, commentsTotal, reviews, reviewsTotal } = data;
  if (!comments.length && !reviews.length) return null;

  return (
    <>
      {reviews.length ? (
        <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-3 flex items-baseline gap-2 font-serif text-lg font-bold text-foreground">
            评论
            <span className="font-mono text-sm text-muted-foreground">({reviewsTotal})</span>
          </h2>
          <ul className="space-y-3">
            {reviews.map((r) => (
              <li key={r.id}>
                <Link
                  to={`/anime/blog/${r.entryId}`}
                  prefetch="intent"
                  className="block rounded-lg border border-primary/25 bg-card p-3 transition-colors hover:border-primary/25 hover:bg-muted/50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="min-w-0 truncate font-serif text-sm font-bold text-foreground">
                      {r.title}
                    </h3>
                    <span className="flex shrink-0 items-center gap-1 font-mono text-[11px] text-muted-foreground">
                      <MessageSquare className="size-3" />
                      {r.replies}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-foreground">
                    {r.summary}
                  </p>
                  <p className="mt-1.5 font-mono text-[11px] text-muted-foreground">
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
        <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-3 flex items-baseline gap-2 font-serif text-lg font-bold text-foreground">
            吐槽
            <span className="font-mono text-sm text-muted-foreground">({commentsTotal})</span>
          </h2>
          <ul className="space-y-3">
            {comments.map((c) => (
              <li key={c.id} className="flex gap-3">
                <Avatar url={c.avatar} name={c.nickname} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-mono text-xs font-semibold text-foreground">
                      {c.nickname}
                    </span>
                    {c.rate ? (
                      <span className="flex shrink-0 items-center gap-0.5 font-mono text-[11px] text-rating">
                        <Star className="size-3 fill-rating" />
                        {c.rate}
                      </span>
                    ) : null}
                    <span className="ml-auto shrink-0 font-mono text-[11px] text-muted-foreground">
                      {formatDate(c.date)}
                    </span>
                  </div>
                  <p className="mt-0.5 whitespace-pre-line text-sm leading-relaxed text-foreground">
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
