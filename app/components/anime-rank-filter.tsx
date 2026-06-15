import { Link, useNavigate } from "react-router";
import { CalendarDays, Trophy } from "lucide-react";
import { cn } from "~/lib/utils";

const CURRENT_YEAR = new Date().getFullYear();
const FIRST_ANIME_YEAR = 1960;
const YEAR_OPTIONS = Array.from(
  { length: CURRENT_YEAR - FIRST_ANIME_YEAR + 1 },
  (_, i) => CURRENT_YEAR - i,
);

type AnimeRankFilterProps = {
  type: string;
  sort: string;
  view: string;
  year?: string;
};

function buildRankUrl(type: string, year?: string): string {
  const params = new URLSearchParams({ type, sort: "rank" });
  if (year) params.set("year", year);
  return `/anime?${params.toString()}`;
}

export function AnimeRankFilter({
  type,
  sort,
  view,
  year,
}: AnimeRankFilterProps) {
  const navigate = useNavigate();
  const isRankView = !view && sort === "rank";
  if (!isRankView) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="hidden items-center gap-1.5 rounded-lg border border-cyan-100 bg-white/60 px-3 py-2 text-xs font-bold text-cyan-800 shadow-sm sm:inline-flex">
        <Trophy className="size-3.5" />
        年份排行
      </div>

      <Link
        to={buildRankUrl(type)}
        prefetch="intent"
        className={cn(
          "inline-flex h-9 items-center rounded-lg border px-3 text-xs font-bold shadow-sm transition-colors",
          !year
            ? "border-cyan-300 bg-gradient-to-r from-cyan-600 to-teal-500 text-white"
            : "border-cyan-100 bg-white/70 text-cyan-800 hover:bg-white",
        )}
      >
        全部
      </Link>

      <div className="relative">
        <CalendarDays className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-cyan-600" />
        <select
          value={year || ""}
          onChange={(event) => {
            navigate(buildRankUrl(type, event.target.value || undefined));
          }}
          className="h-9 rounded-lg border border-cyan-100 bg-white/75 pr-8 pl-8 text-xs font-bold text-cyan-800 shadow-sm outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-500/20"
        >
          <option value="">选择年份</option>
          {YEAR_OPTIONS.map((y) => (
            <option key={y} value={String(y)}>
              {y} 年
            </option>
          ))}
        </select>
      </div>

      {year ? (
        <span className="rounded-lg border border-cyan-100 bg-cyan-50 px-3 py-2 font-mono text-xs font-bold text-cyan-700">
          当前：{year} 年
        </span>
      ) : null}
    </div>
  );
}
