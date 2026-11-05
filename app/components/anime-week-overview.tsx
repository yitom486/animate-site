import { Button } from "~/components/ui/button";
import { AnimeCard } from "~/components/anime-card";
import { cn } from "~/lib/utils";
import { buildDetailUrl } from "~/lib/bangumi/params";
import type { CalendarDayGroup } from "~/lib/bangumi/types";

const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 7] as const;

type AnimeWeekOverviewProps = {
  schedule: CalendarDayGroup[];
  activeId?: string;
  listParams: URLSearchParams;
  todayId: number;
  selectedDayId: number;
  onSelectDay: (dayId: number) => void;
};

export function AnimeWeekOverview({
  schedule,
  activeId,
  listParams,
  todayId,
  selectedDayId,
  onSelectDay,
}: AnimeWeekOverviewProps) {
  const orderedDays = WEEKDAY_ORDER.map((id) =>
    schedule.find((day) => day.weekday.id === id),
  ).filter((day): day is CalendarDayGroup => day != null);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto pr-1">
      <div className="space-y-6">
        {orderedDays.map((day) => {
          const isToday = day.weekday.id === todayId;
          const isSelected = day.weekday.id === selectedDayId;

          return (
            <section
              key={day.weekday.id}
              className={cn(
                "overflow-hidden rounded-xl border bg-card shadow-xs transition-all duration-300",
                isSelected
                  ? "border-primary/50 shadow-md shadow-primary/10 ring-2 ring-primary/40"
                  : "border-border/70",
              )}
            >
              <Button
                variant="ghost"
                type="button"
                onClick={() => onSelectDay(day.weekday.id)}
                className={cn(
                  "flex w-full items-center justify-between border-b px-5 py-3.5 text-left transition-colors",
                  isSelected
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border/70 bg-card text-foreground hover:bg-muted/40 hover:text-primary",
                )}
              >
                <div>
                  <div className="flex items-center gap-1.5 font-serif text-base font-bold">
                    <span>{day.weekday.cn.replace("星期", "周")}</span>
                    {isToday ? (
                      <span className="flex items-center gap-1 rounded-md border border-primary/25 bg-primary/15 px-1.5 py-0.5 font-mono text-[10px] font-bold text-primary">
                        <span className="size-1.5 rounded-full bg-primary animate-pulse" />
                        今天
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                    {day.weekday.en}
                  </div>
                </div>
                <div className="rounded-lg border border-primary/20 bg-primary/10 px-3 py-1 font-mono text-xs font-bold text-primary">
                  {day.items.length} 部
                </div>
              </Button>

              <div className="p-4">
                {day.items.length ? (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
                    {day.items.map((item, index) => (
                      <AnimeCard
                        key={item.id}
                        item={item}
                        to={buildDetailUrl(item.id, listParams)}
                        active={activeId === String(item.id)}
                        rank={index + 1}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="py-8 text-center text-[11px] text-muted-foreground">暂无</p>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
