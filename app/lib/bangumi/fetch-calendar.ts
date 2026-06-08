import { bgmGetLegacy } from "./client";
import { trimSubjects } from "./trim";
import type { CalendarDayGroup } from "./types";
import type { RawSubject } from "./types";

type CalendarResponse = Array<{
  weekday: CalendarDayGroup["weekday"];
  items: RawSubject[];
}>;

/** GET /calendar — 按星期分组，组内按评分降序 */
export async function fetchCalendarSchedule(): Promise<{
  schedule: CalendarDayGroup[];
  total: number;
}> {
  const cal = await bgmGetLegacy<CalendarResponse>("/calendar");

  const schedule = cal.map((day) => ({
    weekday: day.weekday,
    items: trimSubjects(day.items).sort(
      (a, b) => (b.rating?.score ?? 0) - (a.rating?.score ?? 0),
    ),
  }));

  const total = schedule.reduce((n, d) => n + d.items.length, 0);
  return { schedule, total };
}
