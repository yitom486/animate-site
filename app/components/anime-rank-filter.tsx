import { Link, useNavigate } from "react-router";
import { CalendarDays } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { getShanghaiParts } from "~/lib/bangumi/calendar-utils";
import { buildListHref } from "~/lib/bangumi/params";

const CURRENT_YEAR = getShanghaiParts().year;
const FIRST_ANIME_YEAR = 1960;
const YEAR_OPTIONS = [
  { value: "all", label: "全部年份" },
  ...Array.from({ length: CURRENT_YEAR - FIRST_ANIME_YEAR + 1 }, (_, i) => ({
    value: String(CURRENT_YEAR - i),
    label: `${CURRENT_YEAR - i} 年`,
  })),
];

type AnimeRankFilterProps = { type: string; sort: string; view: string; year?: string };

export function AnimeRankFilter({ type, sort, view, year }: AnimeRankFilterProps) {
  const navigate = useNavigate();
  if (view || sort !== "rank") return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant={year ? "outline" : "secondary"}
        render={<Link to={buildListHref({ type, sort: "rank" })} prefetch="intent" />}
        nativeButton={false}
      >
        全部
      </Button>
      <Select
        value={year || "all"}
        items={YEAR_OPTIONS}
        onValueChange={(value) =>
          navigate(
            buildListHref({
              type,
              sort: "rank",
              year: value && value !== "all" ? value : undefined,
            }),
          )
        }
      >
        <SelectTrigger aria-label="按年份筛选排行" className="min-w-32 bg-card">
          <CalendarDays className="size-3.5 text-muted-foreground" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end" alignItemWithTrigger={false}>
          {YEAR_OPTIONS.map(({ value, label }) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
