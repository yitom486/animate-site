import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import type { SubjectRelationsPayload } from "~/lib/bangumi/server/detail.server";
import { SUBJECT_TYPE_LABEL, type SubjectTypeValue } from "~/lib/bangumi/types";
import { buildDetailUrl } from "~/lib/bangumi/params";
import { AnimeCover } from "~/components/anime-cover";

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ok"; data: SubjectRelationsPayload };

export function SubjectRelationsPanel({ id, enabled }: { id: string; enabled: boolean }) {
  const [state, setState] = useState<State>({ status: "idle" });
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (!enabled) return;
    const ac = new AbortController();
    setState({ status: "loading" });

    fetch(`/api/anime/related/${id}`, { signal: ac.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return (await res.json()) as SubjectRelationsPayload;
      })
      .then((data) => {
        if (!ac.signal.aborted) setState({ status: "ok", data });
      })
      .catch((err: unknown) => {
        if (ac.signal.aborted) return;
        const message = err instanceof Error ? err.message : "加载失败";
        setState({ status: "error", message });
      });

    return () => ac.abort();
  }, [id, enabled]);

  if (!enabled) return null;

  if (state.status === "loading" || state.status === "idle") {
    return (
      <section className="rounded-lg border border-dashed border-primary/25 bg-card px-4 py-6 text-center text-xs text-muted-foreground">
        正在加载关联信息…
      </section>
    );
  }

  if (state.status === "error") {
    return (
      <section className="rounded-lg border border-dashed border-primary/25 bg-card px-4 py-6 text-center text-xs text-muted-foreground">
        关联信息暂不可用（{state.message}）
      </section>
    );
  }

  const { related, characters } = state.data;
  if (related.length === 0 && characters.length === 0) return null;

  const listQs = new URLSearchParams(searchParams);

  return (
    <div className="space-y-4">
      {characters.length > 0 ? (
        <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <h2 className="mb-3 font-serif text-lg font-bold text-foreground">角色</h2>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {characters.map((c) => (
              <li
                key={c.id}
                className="flex items-center gap-2 rounded-lg border border-primary/25 bg-card px-2 py-1.5"
              >
                {c.image ? (
                  <div className="size-10 shrink-0 overflow-hidden rounded">
                    <AnimeCover url={c.image} alt={c.name} className="size-full object-cover" />
                  </div>
                ) : (
                  <span className="size-10 shrink-0 rounded bg-accent" />
                )}
                <span className="min-w-0">
                  <span className="block truncate text-xs font-medium text-foreground">
                    {c.name}
                  </span>
                  {c.relation ? (
                    <span className="block truncate text-[10px] text-muted-foreground">
                      {c.relation}
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {related.length > 0 ? (
        <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <h2 className="mb-3 font-serif text-lg font-bold text-foreground">关联条目</h2>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {related.map((r) => {
              const title = r.nameCn || r.name;
              const typeLabel =
                SUBJECT_TYPE_LABEL[String(r.type) as SubjectTypeValue] ?? `类型${r.type}`;
              return (
                <li key={`${r.id}-${r.relation}`}>
                  <Link
                    to={buildDetailUrl(r.id, listQs)}
                    prefetch="intent"
                    className="flex items-center gap-2 rounded-lg border border-primary/25 bg-card px-2 py-1.5 transition-colors hover:border-primary/25 hover:bg-muted/50"
                  >
                    {r.image ? (
                      <div className="h-12 w-9 shrink-0 overflow-hidden rounded">
                        <AnimeCover url={r.image} alt={title} className="size-full object-cover" />
                      </div>
                    ) : (
                      <span className="h-12 w-9 shrink-0 rounded bg-accent" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {title}
                      </span>
                      <span className="mt-0.5 flex flex-wrap gap-x-2 text-[10px] text-muted-foreground">
                        {r.relation ? <span>{r.relation}</span> : null}
                        <span>{typeLabel}</span>
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
