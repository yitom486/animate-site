import { Button } from "~/components/ui/button";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { MessageSquare, Star } from "lucide-react";
import { toProxiedImageUrl } from "~/lib/anime-meta";
import { discussionPagesQuery, subjectCommentsQuery } from "~/lib/subject-queries";
import type { SubjectComments as SubjectCommentsData } from "~/lib/bangumi/types-comments";

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
      src={toProxiedImageUrl(url)}
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
  hasMore,
  loading,
  failed,
  onClick,
}: {
  shown: number;
  total: number;
  hasMore: boolean;
  loading: boolean;
  failed: boolean;
  onClick: () => void;
}) {
  if (!hasMore) return null;
  return (
    <Button
      variant="ghost"
      type="button"
      onClick={onClick}
      disabled={loading}
      className="mt-3 w-full rounded-lg border border-primary/25 bg-card py-2 font-mono text-xs font-semibold text-primary transition-colors hover:bg-muted/50 disabled:opacity-60"
    >
      {loading ? "加载中…" : failed ? "加载失败，点击重试" : `加载更多（${shown}/${total}）`}
    </Button>
  );
}

export function SubjectComments({ id }: { id: string }) {
  const query = useQuery(subjectCommentsQuery(id));
  if (query.isPending) {
    return (
      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <p className="text-sm text-muted-foreground" role="status">
          评论加载中…
        </p>
      </section>
    );
  }
  if (!query.data) {
    return (
      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <p className="text-sm text-muted-foreground" role="status">
          评论暂时无法加载。
        </p>
        <Button variant="ghost" onClick={() => void query.refetch()} disabled={query.isFetching}>
          {query.isFetching ? "重试中…" : "重新加载"}
        </Button>
      </section>
    );
  }
  return <CommentLists key={id} id={id} initial={query.data} updatedAt={query.dataUpdatedAt} />;
}

function CommentLists({
  id,
  initial,
  updatedAt,
}: {
  id: string;
  initial: SubjectCommentsData;
  updatedAt: number;
}) {
  const commentQuery = useInfiniteQuery(
    discussionPagesQuery(
      id,
      "comments",
      {
        items: initial.comments,
        total: initial.commentsTotal,
      },
      updatedAt,
    ),
  );
  const reviewQuery = useInfiniteQuery(
    discussionPagesQuery(
      id,
      "reviews",
      {
        items: initial.reviews,
        total: initial.reviewsTotal,
      },
      updatedAt,
    ),
  );
  // 上游翻页期间若插入新条目，按 id 去重；两个列表各自更新，避免并发写覆盖。
  const comments = [
    ...new Map(
      commentQuery.data.pages.flatMap((page) => page.items).map((item) => [item.id, item]),
    ).values(),
  ];
  const reviews = [
    ...new Map(
      reviewQuery.data.pages.flatMap((page) => page.items).map((item) => [item.id, item]),
    ).values(),
  ];
  const commentsTotal = commentQuery.data.pages.at(-1)?.total ?? initial.commentsTotal;
  const reviewsTotal = reviewQuery.data.pages.at(-1)?.total ?? initial.reviewsTotal;
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
            hasMore={Boolean(reviewQuery.hasNextPage)}
            loading={reviewQuery.isFetching}
            failed={reviewQuery.isFetchNextPageError}
            onClick={() => void reviewQuery.fetchNextPage({ cancelRefetch: false })}
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
            hasMore={Boolean(commentQuery.hasNextPage)}
            loading={commentQuery.isFetching}
            failed={commentQuery.isFetchNextPageError}
            onClick={() => void commentQuery.fetchNextPage({ cancelRefetch: false })}
          />
        </section>
      ) : null}
    </>
  );
}
