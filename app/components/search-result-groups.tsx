import { Link } from "react-router";
import { AnimeCard } from "~/components/anime-card";
import { COVER_PRIORITY_COUNT } from "~/lib/anime-meta";
import { buildDetailUrl, buildListHref } from "~/lib/bangumi/params";
import type { SearchGroup } from "~/lib/bangumi/types";

type SearchResultGroupsProps = {
  groups: SearchGroup[];
  query: string;
  listParams: URLSearchParams;
  activeId?: string;
};

export function SearchResultGroups({
  groups,
  query,
  listParams,
  activeId,
}: SearchResultGroupsProps) {
  if (groups.length === 0) {
    return <p className="px-4 py-8 text-center text-sm text-muted-foreground">暂无结果</p>;
  }

  return (
    <div className="flex flex-col gap-6 p-4">
      {groups.map((group) => (
        <section key={group.type} className="min-w-0">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h3 className="font-serif text-base font-bold text-slate-800">
              {group.label}
              <span className="ml-2 font-mono text-xs font-semibold text-slate-400">
                {group.total} 条
              </span>
            </h3>
            {group.total > group.items.length ? (
              <Link
                to={buildListHref({
                  view: "search",
                  type: group.type,
                  q: query,
                })}
                prefetch="intent"
                className="text-xs font-bold text-rose-700 hover:text-rose-800"
              >
                查看更多
              </Link>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
            {group.items.map((item, idx) => (
              <AnimeCard
                key={item.id}
                item={item}
                to={buildDetailUrl(item.id, listParams)}
                active={activeId === String(item.id)}
                priority={idx < COVER_PRIORITY_COUNT}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
