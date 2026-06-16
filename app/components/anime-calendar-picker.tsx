import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "~/lib/utils";

const WEEKDAY_LABELS = ["一", "二", "三", "四", "五", "六", "日"] as const;

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function monthTitle(date: Date): string {
  return `${date.getFullYear()}年${date.getMonth() + 1}月`;
}

function buildMonthDays(month: Date): Date[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const mondayIndex = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - mondayIndex);

  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

type AnimeCalendarPickerProps = {
  open: boolean;
  selectedDate: Date;
  onSelect: (date: Date) => void;
  onClose: () => void;
};

export function AnimeCalendarPicker({
  open,
  selectedDate,
  onSelect,
  onClose,
}: AnimeCalendarPickerProps) {
  const [cursor, setCursor] = useState(() =>
    new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1),
  );
  const today = useMemo(() => startOfDay(new Date()), []);
  const days = useMemo(() => buildMonthDays(cursor), [cursor]);

  useEffect(() => {
    if (!open) return;
    setCursor(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
  }, [open, selectedDate]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 p-4 backdrop-blur-sm">
      <button
        type="button"
        aria-label="关闭日期选择"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />

      <section className="relative w-full max-w-md overflow-hidden rounded-lg border border-white/80 bg-white/92 shadow-2xl shadow-rose-950/10 backdrop-blur-xl">
        <header className="flex items-center justify-between border-b border-rose-100 bg-rose-50/60 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-lg border border-rose-200 bg-white text-rose-700 shadow-inner">
              <CalendarDays className="size-4" />
            </span>
            <div>
              <h2 className="font-serif text-base font-bold text-slate-800">
                选择放送日期
              </h2>
              <p className="font-mono text-[10px] text-rose-700">
                按所选日期映射到对应星期放送表
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-rose-100 bg-white/80 p-2 text-slate-500 transition-colors hover:text-rose-700"
            aria-label="关闭"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="space-y-4 p-4">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() =>
                setCursor(
                  new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1),
                )
              }
              className="rounded-lg border border-rose-100 bg-white/80 p-2 text-rose-700 transition-colors hover:bg-rose-50"
              aria-label="上个月"
            >
              <ChevronLeft className="size-4" />
            </button>
            <div className="font-serif text-lg font-bold text-slate-800">
              {monthTitle(cursor)}
            </div>
            <button
              type="button"
              onClick={() =>
                setCursor(
                  new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1),
                )
              }
              className="rounded-lg border border-rose-100 bg-white/80 p-2 text-rose-700 transition-colors hover:bg-rose-50"
              aria-label="下个月"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAY_LABELS.map((label) => (
              <span
                key={label}
                className="py-1 font-mono text-[11px] font-bold text-slate-400"
              >
                {label}
              </span>
            ))}

            {days.map((date) => {
              const selected = isSameDay(date, selectedDate);
              const current = isSameDay(date, today);
              const outside = date.getMonth() !== cursor.getMonth();

              return (
                <button
                  key={date.toISOString()}
                  type="button"
                  onClick={() => onSelect(startOfDay(date))}
                  className={cn(
                    "relative flex aspect-square items-center justify-center rounded-lg border text-sm font-bold transition-colors",
                    selected
                      ? "border-rose-400 bg-gradient-to-r from-rose-300 to-sky-300 text-slate-700 shadow-sm"
                      : "border-transparent bg-white/60 text-slate-700 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-800",
                    outside && !selected && "text-slate-300",
                  )}
                >
                  {date.getDate()}
                  {current ? (
                    <span
                      className={cn(
                        "absolute bottom-1 size-1 rounded-full",
                        selected ? "bg-white" : "bg-rose-500",
                      )}
                    />
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="flex justify-between gap-2 border-t border-rose-100 pt-4">
            <button
              type="button"
              onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))}
              className="rounded-lg border border-rose-100 bg-white/80 px-3 py-2 text-xs font-bold text-slate-600 transition-colors hover:text-rose-700"
            >
              回到本月
            </button>
            <button
              type="button"
              onClick={() => onSelect(today)}
              className="rounded-lg bg-gradient-to-r from-rose-300 to-sky-300 px-4 py-2 text-xs font-bold text-slate-700 shadow-sm transition-colors hover:from-rose-200 hover:to-sky-200"
            >
              选择今天
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
