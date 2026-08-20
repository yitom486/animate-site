import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { CalendarDays, Eye, Heart, Star, Tv } from "lucide-react";
import { AnimeCalendarPicker } from "~/components/anime-calendar-picker";
import { AnimeWeekOverview } from "~/components/anime-week-overview";
import { SummaryModal, useCardExtra } from "~/components/anime-card-extra";
import { cn } from "~/lib/utils";
import { AnimeCover } from "~/components/anime-cover";
import { buildCardMeta, getCoverUrl, type AnimeCardData } from "~/lib/anime-meta";
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
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-rose-100 bg-white/62 p-4 shadow-sm">
      <div className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-700 shadow-inner">
        <CalendarDays className="size-5" />
      </div>
      <div className="min-w-[220px] flex-1">
        <span className="block font-serif text-sm font-bold text-slate-800">日历新番星历</span>
        <time className="mt-0.5 block truncate font-mono text-[11px] font-semibold text-rose-700">
          {now}
        </time>
        <span className="mt-1 block font-mono text-[11px] text-slate-500">
          当前选择：{formatDisplayDate(selectedDate)}
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={onOpenPicker}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-rose-100 bg-white/80 px-3 text-xs font-bold text-rose-800 shadow-sm transition-colors hover:bg-white"
        >
          <CalendarDays className="size-3.5" />
          选择日期
        </button>
        <button
          type="button"
          onClick={mode === "overview" ? onShowDay : onShowOverview}
          className={cn(
            "inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-bold shadow-sm transition-colors",
            mode === "overview"
              ? "border border-rose-100 bg-white/80 text-rose-800 hover:bg-white"
              : "bg-gradient-to-r from-rose-300 to-sky-300 text-slate-700 hover:from-rose-200 hover:to-sky-200",
          )}
        >
          {mode === "overview" ? "单日视图" : "周总览"}
        </button>

        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="rounded-lg border border-rose-100 bg-white/72 px-3 py-2">
            <span className="block font-mono text-sm font-bold text-rose-800">{selectedCount}</span>
            <span className="text-[10px] text-slate-500">选日放送</span>
          </div>
          <div className="rounded-lg border border-sky-100 bg-white/72 px-3 py-2">
            <span className="block font-mono text-sm font-bold text-sky-800">{totalCount}</span>
            <span className="text-[10px] text-slate-500">本周收录</span>
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
      className="flex items-center gap-1 font-mono text-[10px] font-semibold text-slate-500"
      title={`${label} ${value.toLocaleString()}`}
    >
      <Icon className="size-3 text-rose-400" />
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
  const cover = getCoverUrl(item.images);
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
        "group relative flex flex-col gap-4 overflow-hidden rounded-lg border border-white/85 bg-white/56 p-4 shadow-sm transition-all duration-300 sm:flex-row",
        "hover:border-rose-300 hover:bg-white/86 hover:shadow-md",
        active && "border-rose-400 bg-white shadow-md ring-2 ring-rose-500/25",
      )}
    >
      <div className="relative aspect-[3/4] w-full shrink-0 overflow-hidden rounded-lg border border-rose-100 bg-rose-50 sm:w-28 md:w-32">
        <AnimeCover
          url={cover}
          alt={title}
          className="transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-rose-600/5 mix-blend-overlay" />
        <span className="absolute top-2 left-2 rounded-md border border-rose-200 bg-white/90 px-2 py-0.5 font-mono text-[10px] font-bold text-rose-800 backdrop-blur-sm">
          #{rank}
        </span>
        {score != null ? (
          <span className="absolute right-2 bottom-2 flex items-center gap-1 rounded-md border border-amber-200 bg-white/92 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-600 backdrop-blur-sm">
            <Star className="size-3 fill-amber-500 text-amber-500" />
            {score}
          </span>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between gap-3 py-1">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="line-clamp-2 font-serif text-base font-bold leading-snug text-slate-800 transition-colors group-hover:text-rose-700">
                {title}
              </h3>
              {nameJa ? (
                <p className="mt-0.5 truncate font-mono text-[11px] text-slate-400">{nameJa}</p>
              ) : null}
            </div>
            {airDate ? (
              <span className="hidden shrink-0 rounded-full border border-rose-100 bg-rose-50 px-2.5 py-1 font-mono text-[10px] font-semibold text-rose-700 md:inline-flex">
                {airDate}
              </span>
            ) : null}
          </div>

          {subtitle ? (
            <p className="truncate font-mono text-xs font-semibold text-slate-500">{subtitle}</p>
          ) : null}

          {/* 简介：两行省略 + 展开弹窗（仅文字溢出时显示展开） */}
          {summary ? (
            <div className="text-xs leading-relaxed text-slate-600">
              <p ref={summaryRef} className="line-clamp-2">
                {summary}
              </p>
              {summaryTruncated ? (
                <button
                  type="button"
                  onClick={() => setSummaryOpen(true)}
                  className="mt-0.5 font-semibold text-rose-600 hover:underline"
                >
                  展开
                </button>
              ) : null}
            </div>
          ) : null}

          {/* staff：导演 / 原作 / 制作 */}
          {staff && (staff.导演 || staff.原作 || staff.制作) ? (
            <dl className="space-y-0.5 text-[11px] text-slate-500">
              {staff.导演 ? (
                <div className="flex gap-1.5">
                  <dt className="shrink-0 text-slate-400">导演</dt>
                  <dd className="min-w-0 truncate text-slate-600">{staff.导演}</dd>
                </div>
              ) : null}
              {staff.原作 ? (
                <div className="flex gap-1.5">
                  <dt className="shrink-0 text-slate-400">原作</dt>
                  <dd className="min-w-0 truncate text-slate-600">{staff.原作}</dd>
                </div>
              ) : null}
              {staff.制作 ? (
                <div className="flex gap-1.5">
                  <dt className="shrink-0 text-slate-400">制作</dt>
                  <dd className="min-w-0 truncate text-slate-600">{staff.制作}</dd>
                </div>
              ) : null}
            </dl>
          ) : null}

          {/* 标签：官方元标签 + 普通标签 */}
          {metaTags.length || tags.length ? (
            <div className="flex flex-wrap gap-1.5">
              {metaTags.map((tag) => (
                <span
                  key={`m-${tag}`}
                  className="rounded-full border border-rose-200 bg-rose-100/70 px-2 py-0.5 font-mono text-[10px] font-semibold text-rose-700"
                >
                  {tag}
                </span>
              ))}
              {tags.map((tag) => (
                <span
                  key={`t-${tag}`}
                  className="rounded-full border border-rose-100 bg-rose-50 px-2 py-0.5 font-mono text-[10px] text-rose-700"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-rose-100 pt-3">
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-mono text-[10px] font-semibold text-slate-500">
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
            className="shrink-0 rounded-lg bg-gradient-to-r from-rose-300 to-sky-300 px-3 py-1.5 text-[11px] font-bold text-slate-700 shadow-sm transition-colors hover:from-rose-200 hover:to-sky-200"
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
    <div className="flex min-h-0 flex-1 flex-col gap-5 p-4">
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
        <div className="no-scrollbar flex shrink-0 gap-2 overflow-x-auto rounded-lg border border-white/80 bg-white/42 p-1.5 shadow-inner">
          {orderedDays.map((day) => {
            const isActive = selectedDay?.weekday.id === day.weekday.id;
            const isToday = todayId === day.weekday.id;

            return (
              <button
                key={day.weekday.id}
                ref={isActive ? selectedButtonRef : undefined}
                type="button"
                onClick={() => selectDay(day.weekday.id)}
                className={cn(
                  "relative flex min-w-[82px] flex-1 flex-col items-center justify-center gap-1 rounded-lg border px-4 py-3 font-serif text-xs font-bold tracking-wider transition-all duration-300",
                  isActive
                    ? "border-rose-300 bg-gradient-to-r from-rose-300 to-sky-300 text-slate-700 shadow-md"
                    : "border-white/70 bg-white/55 text-slate-600 hover:border-rose-200 hover:text-rose-700",
                )}
              >
                <span>
                  {day.weekday.cn.replace("星期", "周")}
                  {isToday ? (
                    <span className="ml-1 font-mono text-[10px] opacity-80">今天</span>
                  ) : null}
                </span>
                <span className="flex items-center gap-1 font-mono text-[10px] font-semibold opacity-85">
                  {day.items.length} 部
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      isActive ? "bg-white" : isToday ? "bg-rose-500" : "bg-slate-300",
                    )}
                  />
                </span>
              </button>
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
            <div className="rounded-lg border border-dashed border-rose-200 bg-white/42 py-14 text-center shadow-inner">
              <Tv className="mx-auto size-8 text-rose-500/35" />
              <p className="mt-3 font-serif text-sm font-semibold text-slate-500">
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
