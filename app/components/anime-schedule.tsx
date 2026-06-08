import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { Clock, Star } from "lucide-react";
import { cn } from "~/lib/utils";
import { AnimeCover } from "~/components/anime-cover";
import type { AnimeCardData } from "~/lib/anime-meta";
import { getCoverUrl } from "~/lib/anime-meta";
import {
  formatCurrentDateTime,
  getBangumiWeekdayId,
  buildDetailUrl,
  type CalendarDayGroup,
} from "~/lib/bangumi";

/** Bangumi 官网列顺序：日 → 一 → … → 六 */
const COLUMN_ORDER = [7, 1, 2, 3, 4, 5, 6] as const;

const DAY_HEADER_CLASS: Record<number, string> = {
  7: "bg-red-500",
  1: "bg-orange-500",
  2: "bg-amber-400 text-amber-950",
  3: "bg-green-600",
  4: "bg-emerald-500",
  5: "bg-sky-500",
  6: "bg-blue-600",
};

function CurrentTimeBar() {
  const [now, setNow] = useState(formatCurrentDateTime);

  useEffect(() => {
    const id = setInterval(() => setNow(formatCurrentDateTime()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
      <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/40 px-3 py-1.5">
        <Clock className="size-4 shrink-0 text-primary" />
        <span className="text-muted-foreground">当前时间</span>
        <time className="font-medium tabular-nums">{now}</time>
      </div>
    </div>
  );
}

function ScheduleCard({
  item,
  rank,
  listParams,
  active,
}: {
  item: AnimeCardData;
  rank: number;
  listParams: URLSearchParams;
  active?: boolean;
}) {
  const title = item.name_cn || item.name;
  const cover = getCoverUrl(item.images);
  const score = item.rating?.score;

  return (
    <Link
      to={buildDetailUrl(item.id, listParams)}
      prefetch="viewport"
      title={title}
      className={cn(
        "group relative block overflow-hidden rounded-md ring-1 ring-border/50 transition-all",
        "hover:-translate-y-0.5 hover:shadow-md hover:ring-primary/40",
        active && "ring-2 ring-primary shadow-md",
      )}
    >
      <div className="relative aspect-[2/3] overflow-hidden bg-muted">
        <AnimeCover
          url={cover}
          alt={title}
          className="transition-transform duration-300 group-hover:scale-[1.04]"
        />

        <span className="absolute top-1 left-1 rounded bg-black/65 px-1 py-px text-[9px] font-bold text-white">
          #{rank}
        </span>

        {score != null ? (
          <div className="absolute top-1 right-1 flex items-center gap-0.5 rounded bg-black/70 px-1 py-px text-[9px] font-semibold text-orange-400">
            <Star className="size-2.5 fill-orange-400" />
            {score}
          </div>
        ) : null}

        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/55 to-transparent px-1.5 pt-6 pb-1.5">
          <p className="line-clamp-2 text-[10px] leading-snug font-medium text-white">
            {title}
          </p>
        </div>
      </div>
    </Link>
  );
}

type AnimeScheduleProps = {
  schedule: CalendarDayGroup[];
  activeId?: string;
  listParams: URLSearchParams;
};

export function AnimeSchedule({ schedule, activeId, listParams }: AnimeScheduleProps) {
  const todayId = getBangumiWeekdayId();
  const scrollRef = useRef<HTMLDivElement>(null);
  const todayColRef = useRef<HTMLDivElement>(null);

  const orderedDays = useMemo(() => {
    const map = new Map(schedule.map((d) => [d.weekday.id, d]));
    return COLUMN_ORDER.map((id) => map.get(id)).filter(
      (d): d is CalendarDayGroup => d != null,
    );
  }, [schedule]);

  const totalCount = useMemo(
    () => schedule.reduce((n, d) => n + d.items.length, 0),
    [schedule],
  );
  const todayCount =
    schedule.find((d) => d.weekday.id === todayId)?.items.length ?? 0;

  useEffect(() => {
    todayColRef.current?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
      <div className="shrink-0 space-y-2">
        <p className="text-xs text-muted-foreground">
          本季共 {totalCount} 部 · 今日 {todayCount} 部 · 组内按评分排序
        </p>
        <CurrentTimeBar />
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-x-auto overflow-y-auto pb-2">
        <div className="grid min-w-[840px] grid-cols-7 gap-2 lg:min-w-0">
          {orderedDays.map((day) => {
            const isToday = day.weekday.id === todayId;
            const headerClass =
              DAY_HEADER_CLASS[day.weekday.id] ?? "bg-muted-foreground";

            return (
              <div
                key={day.weekday.id}
                ref={isToday ? todayColRef : undefined}
                id={`weekday-${day.weekday.id}`}
                className={cn(
                  "flex min-w-0 flex-col rounded-lg",
                  isToday && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                )}
              >
                <header
                  className={cn(
                    "rounded-t-lg px-2 py-2 text-center text-white shadow-sm",
                    headerClass,
                  )}
                >
                  <div className="text-xs font-bold leading-tight">
                    {day.weekday.cn}
                    {isToday ? (
                      <span className="ml-1 text-[10px] font-normal opacity-90">
                        今天
                      </span>
                    ) : null}
                  </div>
                  <div className="text-[10px] uppercase opacity-85">
                    {day.weekday.en}
                  </div>
                </header>

                <div
                  className={cn(
                    "flex flex-1 flex-col gap-1.5 rounded-b-lg border border-t-0 border-border/60 p-1.5",
                    isToday ? "bg-primary/5" : "bg-muted/25",
                  )}
                >
                  {day.items.length === 0 ? (
                    <p className="py-8 text-center text-[10px] text-muted-foreground">
                      暂无
                    </p>
                  ) : (
                    day.items.map((item, i) => (
                      <ScheduleCard
                        key={item.id}
                        item={item}
                        rank={i + 1}
                        listParams={listParams}
                        active={activeId === String(item.id)}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
