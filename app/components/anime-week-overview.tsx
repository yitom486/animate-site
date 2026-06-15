import { AnimeCard } from "~/components/anime-card";
import { cn } from "~/lib/utils";
import {
  buildDetailUrl,
  type CalendarDayGroup,
} from "~/lib/bangumi";

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
                "overflow-hidden rounded-lg border bg-white/52 shadow-sm",
                isSelected
                  ? "border-cyan-300 ring-2 ring-cyan-500/15"
                  : "border-white/80",
              )}
            >
              <button
                type="button"
                onClick={() => onSelectDay(day.weekday.id)}
                className={cn(
                  "flex w-full items-center justify-between border-b px-4 py-3 text-left transition-colors",
                  isSelected
                    ? "border-cyan-300 bg-gradient-to-r from-cyan-600 to-teal-500 text-white"
                    : "border-cyan-100 bg-white/70 text-slate-700 hover:bg-cyan-50 hover:text-cyan-800",
                )}
              >
                <div>
                  <div className="font-serif text-base font-bold">
                    {day.weekday.cn.replace("星期", "周")}
                    {isToday ? (
                      <span className="ml-1 font-mono text-[10px] opacity-85">
                        今天
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-0.5 font-mono text-[10px] opacity-80">
                    {day.weekday.en}
                  </div>
                </div>
                <div className="rounded-lg border border-white/50 bg-white/20 px-3 py-1.5 font-mono text-xs font-bold">
                  {day.items.length} 部
                </div>
              </button>

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
                  <p className="py-8 text-center text-[11px] text-slate-400">
                    暂无
                  </p>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
