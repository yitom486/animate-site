import { Button } from "~/components/ui/button";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { CalendarDays, Eye, Heart, Star, Tv } from "lucide-react";
import { AnimeCalendarPicker } from "~/components/anime-calendar-picker";
import { AnimeWeekOverview } from "~/components/anime-week-overview";
import { SummaryModal, useCardExtra } from "~/components/anime-card-extra";
import { cn } from "~/lib/utils";
import { AnimeCover } from "~/components/anime-cover";
import {
  buildCardMeta,
  COVER_SIZES_SCHEDULE,
  getCoverSources,
  type AnimeCardData,
} from "~/lib/anime-meta";
import {
  formatAirDate,
  formatCurrentDateTime,
  getBangumiWeekdayId,
  getWeekdayLabel,
} from "~/lib/bangumi/calendar-utils";
import { buildDetailUrl } from "~/lib/bangumi/params";
import type { CalendarDayGroup } from "~/lib/bangumi/types";

const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 7] as const;

type CalendarMode = "day" | "overview";

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function parseDateParam(value: string | null): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }

  return date;
}

function formatDateParam(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDisplayDate(date: Date): string {
  const wd = getWeekdayLabel(getBangumiWeekdayId(date)).replace("星期", "周");
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${wd}`;
}

function dateForWeekday(baseDate: Date, weekdayId: number): Date {
  const currentWeekdayId = getBangumiWeekdayId(baseDate);
  const next = new Date(baseDate);
  next.setDate(baseDate.getDate() + (weekdayId - currentWeekdayId));
  return startOfDay(next);
}

function CurrentTimeBar({
  totalCount,
  selectedCount,
  selectedDate,
  mode,
  onOpenPicker,
  onShowDay,
  onShowOverview,
}: {
  totalCount: number;
  selectedCount: number;
  selectedDate: Date;
  mode: CalendarMode;
  onOpenPicker: () => void;
  onShowDay: () => void;
  onShowOverview: () => void;
}) {
  const [now, setNow] = useState(formatCurrentDateTime);

  useEffect(() => {
    const id = setInterval(() => setNow(formatCurrentDateTime()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/70 bg-card p-3 sm:p-4 shadow-xs">
      <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary shadow-xs">
        <CalendarDays className="size-5" />
      </div>
      <div className="min-w-[220px] flex-1">
        <div className="flex items-center gap-2">
          <span className="block font-serif text-sm font-bold text-foreground">每日放送</span>
          <span className="flex items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-primary">
            <span className="size-1.5 rounded-full bg-primary animate-pulse" />
            LIVE
          </span>
        </div>
        <time className="mt-0.5 block truncate font-mono text-[11px] font-semibold text-primary">
          {now}
        </time>
        <span className="mt-0.5 block font-mono text-[11px] text-muted-foreground">
          当前选择：{formatDisplayDate(selectedDate)}
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          variant="ghost"
          type="button"
          onClick={onOpenPicker}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border/70 bg-card px-3 text-xs font-bold text-foreground shadow-xs transition-colors hover:border-primary/40 hover:text-primary"
        >
          <CalendarDays className="size-3.5 text-primary" />
          选择日期
        </Button>
        <Button
          variant="ghost"
          type="button"
          onClick={mode === "overview" ? onShowDay : onShowOverview}
          className={cn(
            "inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-bold shadow-xs transition-all",
            mode === "overview"
              ? "border border-border/70 bg-card text-foreground hover:border-primary/40 hover:text-primary"
              : "border border-primary/25 bg-primary/10 text-primary hover:bg-primary/20",
          )}
        >
          {mode === "overview" ? "单日视图" : "周总览"}
        </Button>

        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="rounded-xl border border-primary/25 bg-card/80 px-3 py-2 shadow-xs">
            <span className="block font-mono text-sm font-bold text-primary">{selectedCount}</span>
            <span className="text-[10px] text-muted-foreground">选日放送</span>
          </div>
          <div className="rounded-xl border border-info/25 bg-card/80 px-3 py-2 shadow-xs">
            <span className="block font-mono text-sm font-bold text-info">{totalCount}</span>
            <span className="text-[10px] text-muted-foreground">本周收录</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function CollectionStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Heart;
  label: string;
  value?: number;
}) {
  if (!value) return null;
  return (
    <span
      className="flex items-center gap-1 font-mono text-[10px] font-semibold text-muted-foreground"
      title={`${label} ${value.toLocaleString()}`}
    >
      <Icon className="size-3 text-primary" />
      {value.toLocaleString()}
    </span>
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
  const { title, subtitle, score, ratingTotal } = buildCardMeta(item);
  const cover = getCoverSources(item.images);
  const airDate = formatAirDate(item.air_date || item.date);
  // 日文原名（日历接口已返回，无需等增强数据）
  const nameJa = item.name && item.name !== title ? item.name : "";

  const { ref, data } = useCardExtra<HTMLDivElement>(item.id);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const summaryRef = useRef<HTMLParagraphElement>(null);
  const [summaryTruncated, setSummaryTruncated] = useState(false);

  // 官方元标签优先并去重，普通标签再去掉与元标签重复的部分
  const metaTags = Array.from(new Set(data?.metaTags ?? []));
  const tags = Array.from(new Set(data?.tags ?? [])).filter((t) => !metaTags.includes(t));
  const staff = data?.staff;
  const collection = data?.collection;
  const summary = data?.summary ?? "";

  // 简介加载后测量是否真的溢出 2 行，仅溢出时才显示「展开」
  useEffect(() => {
    const el = summaryRef.current;
    if (!el) {
      setSummaryTruncated(false);
      return;
    }
    setSummaryTruncated(el.scrollHeight - el.clientHeight > 1);
  }, [summary]);

  return (
    <div
      ref={ref}
      title={subtitle ? `${title} · ${subtitle}` : title}
      className={cn(
        "group relative flex flex-col gap-3.5 overflow-hidden rounded-xl border border-border/70 bg-card p-3 sm:p-4 shadow-xs transition-all duration-300 ease-out sm:flex-row [content-visibility:auto] [contain-intrinsic-size:auto_200px]",
        "hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5",
        active && "border-primary/50 bg-card shadow-md shadow-primary/10 ring-2 ring-primary/40",
      )}
    >
      <div className="relative aspect-[3/4] w-full shrink-0 overflow-hidden rounded-lg border border-border/60 bg-muted sm:w-28 md:w-32">
        <AnimeCover
          url={cover?.src}
          srcSet={cover?.srcSet}
          sizes={COVER_SIZES_SCHEDULE}
          alt={title}
          className="transition-transform duration-500 ease-out group-hover:scale-105"
        />
        <span className="absolute top-2 left-2 rounded-md border border-primary/30 bg-background/95 px-1.5 py-0.5 font-mono text-[10px] font-bold text-primary shadow-xs">
          #{rank}
        </span>
        {score != null ? (
          <span className="absolute right-2 bottom-2 flex items-center gap-1 rounded-md border border-warning/30 bg-background/95 px-1.5 py-0.5 font-mono text-[10px] font-bold text-rating shadow-xs">
            <Star className="size-2.5 fill-rating text-rating" />
            {score}
          </span>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between gap-3 py-1">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="line-clamp-2 font-serif text-base font-bold leading-snug text-foreground transition-colors group-hover:text-primary">
                {title}
              </h3>
              {nameJa ? (
                <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
                  {nameJa}
                </p>
              ) : null}
            </div>
            {airDate ? (
              <span className="hidden shrink-0 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-primary md:inline-flex">
                {airDate}
              </span>
            ) : null}
          </div>

          {subtitle ? (
            <p className="truncate font-mono text-xs font-semibold text-muted-foreground">
              {subtitle}
            </p>
          ) : null}

          {/* 简介：两行省略 + 展开弹窗（仅文字溢出时显示展开） */}
          {summary ? (
            <div className="text-xs leading-relaxed text-foreground">
              <p ref={summaryRef} className="line-clamp-2">
                {summary}
              </p>
              {summaryTruncated ? (
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => setSummaryOpen(true)}
                  className="mt-0.5 font-semibold text-primary hover:underline"
                >
                  展开
                </Button>
              ) : null}
            </div>
          ) : null}

          {staff && Object.keys(staff).length > 0 ? (
            <dl className="space-y-0.5 text-[11px] text-muted-foreground">
              {Object.entries(staff).map(([k, v]) => (
                <div key={k} className="flex gap-1.5">
                  <dt className="shrink-0 text-muted-foreground">{k}</dt>
                  <dd className="min-w-0 truncate text-foreground">{v}</dd>
                </div>
              ))}
            </dl>
          ) : null}

          {/* 标签：官方元标签 + 普通标签 */}
          {metaTags.length || tags.length ? (
            <div className="flex flex-wrap gap-1.5">
              {metaTags.map((tag) => (
                <span
                  key={`m-${tag}`}
                  className="rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-primary"
                >
                  {tag}
                </span>
              ))}
              {tags.map((tag) => (
                <span
                  key={`t-${tag}`}
                  className="rounded-full border border-border/80 bg-accent/60 px-2 py-0.5 font-mono text-[10px] text-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border/70 pt-3">
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-mono text-[10px] font-semibold text-muted-foreground">
              {ratingTotal
                ? `${ratingTotal.toLocaleString()} 人评分`
                : item.platform || "Bangumi Calendar"}
            </span>
            <CollectionStat icon={Heart} label="想看" value={collection?.wish} />
            <CollectionStat icon={Eye} label="在看" value={collection?.doing} />
          </div>
          <Link
            to={buildDetailUrl(item.id, listParams)}
            prefetch="intent"
            className="shrink-0 rounded-lg bg-primary/10 px-3 py-1.5 text-[11px] font-bold text-primary shadow-xs transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            查看详情
          </Link>
        </div>
      </div>

      {summaryOpen ? (
        <SummaryModal title={title} summary={summary} onClose={() => setSummaryOpen(false)} />
      ) : null}
    </div>
  );
}

type AnimeScheduleProps = {
  schedule: CalendarDayGroup[];
  activeId?: string;
  listParams: URLSearchParams;
};

export function AnimeSchedule({ schedule, activeId, listParams }: AnimeScheduleProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [pickerOpen, setPickerOpen] = useState(false);
  const todayId = getBangumiWeekdayId();
  const selectedButtonRef = useRef<HTMLButtonElement>(null);

  const selectedDate = useMemo(
    () => parseDateParam(searchParams.get("date")) ?? startOfDay(new Date()),
    [searchParams],
  );
  const selectedDayId = getBangumiWeekdayId(selectedDate);
  const mode: CalendarMode = searchParams.get("calendar") === "overview" ? "overview" : "day";

  const orderedDays = useMemo(() => {
    const map = new Map(schedule.map((d) => [d.weekday.id, d]));
    return WEEKDAY_ORDER.map((id) => map.get(id)).filter((d): d is CalendarDayGroup => d != null);
  }, [schedule]);

  const totalCount = useMemo(() => schedule.reduce((n, d) => n + d.items.length, 0), [schedule]);
  const selectedDay = orderedDays.find((d) => d.weekday.id === selectedDayId) ?? orderedDays[0];
  const selectedCount = selectedDay?.items.length ?? 0;

  const routedListParams = useMemo(() => {
    const params = new URLSearchParams(listParams);
    params.set("date", formatDateParam(selectedDate));
    if (mode === "overview") params.set("calendar", "overview");
    else params.delete("calendar");
    return params;
  }, [listParams, mode, selectedDate]);

  function setCalendarParams(next: { date?: Date; mode?: CalendarMode }) {
    const params = new URLSearchParams(searchParams);
    params.set("type", listParams.get("type") ?? "2");
    params.set("view", "calendar");
    params.delete("page");

    if (next.date) params.set("date", formatDateParam(next.date));

    if (next.mode === "overview") params.set("calendar", "overview");
    if (next.mode === "day") params.delete("calendar");

    setSearchParams(params, { preventScrollReset: true });
  }

  function selectDay(dayId: number) {
    setCalendarParams({
      date: dateForWeekday(selectedDate, dayId),
      mode: "day",
    });
  }

  useEffect(() => {
    selectedButtonRef.current?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [selectedDayId]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 p-3 sm:gap-5 sm:p-4">
      <CurrentTimeBar
        totalCount={totalCount}
        selectedCount={selectedCount}
        selectedDate={selectedDate}
        mode={mode}
        onOpenPicker={() => setPickerOpen(true)}
        onShowDay={() => setCalendarParams({ mode: "day" })}
        onShowOverview={() => setCalendarParams({ mode: "overview" })}
      />

      {mode === "day" ? (
        <div className="no-scrollbar flex shrink-0 gap-2 overflow-x-auto rounded-xl border border-border/70 bg-card p-2 shadow-xs">
          {orderedDays.map((day) => {
            const isActive = selectedDay?.weekday.id === day.weekday.id;
            const isToday = todayId === day.weekday.id;

            return (
              <Button
                variant="ghost"
                key={day.weekday.id}
                ref={isActive ? selectedButtonRef : undefined}
                type="button"
                onClick={() => selectDay(day.weekday.id)}
                className={cn(
                  "relative flex min-w-[84px] flex-1 flex-col items-center justify-center gap-1.5 rounded-xl border px-4 py-3 font-serif text-xs font-bold tracking-wider transition-all duration-300",
                  isActive
                    ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/95 hover:text-primary-foreground"
                    : "border-border/70 bg-card text-foreground hover:border-primary/40 hover:bg-muted/40 hover:text-primary",
                )}
              >
                <span className="flex items-center">
                  {day.weekday.cn.replace("星期", "周")}
                  {isToday ? (
                    <span
                      className={cn(
                        "ml-1.5 rounded-md px-1.5 py-0.5 font-mono text-[9px] font-bold leading-none",
                        isActive
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-primary/15 text-primary",
                      )}
                    >
                      今天
                    </span>
                  ) : null}
                </span>
                <span className="flex items-center gap-1.5 font-mono text-[10px] font-semibold opacity-90">
                  {day.items.length} 部
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      isActive
                        ? "bg-primary-foreground"
                        : isToday
                          ? "bg-primary animate-pulse"
                          : "bg-muted-foreground/40",
                    )}
                  />
                </span>
              </Button>
            );
          })}
        </div>
      ) : null}

      {mode === "overview" ? (
        <AnimeWeekOverview
          schedule={schedule}
          activeId={activeId}
          listParams={routedListParams}
          todayId={todayId}
          selectedDayId={selectedDayId}
          onSelectDay={selectDay}
        />
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          {selectedDay && selectedDay.items.length > 0 ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {selectedDay.items.map((item, i) => (
                <ScheduleCard
                  key={item.id}
                  item={item}
                  rank={i + 1}
                  listParams={routedListParams}
                  active={activeId === String(item.id)}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-primary/25 bg-card py-14 text-center shadow-inner">
              <Tv className="mx-auto size-8 text-primary" />
              <p className="mt-3 font-serif text-sm font-semibold text-muted-foreground">
                本日暂无新番放送
              </p>
            </div>
          )}
        </div>
      )}

      <AnimeCalendarPicker
        open={pickerOpen}
        selectedDate={selectedDate}
        onSelect={(date) => {
          setCalendarParams({ date, mode: "day" });
          setPickerOpen(false);
        }}
        onClose={() => setPickerOpen(false)}
      />
    </div>
  );
}
