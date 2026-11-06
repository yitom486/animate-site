import { createCache, withCache } from "~/lib/cache";
import { shanghaiDateKey } from "../calendar-utils";
import { CACHE_MAX_ENTRIES, CACHE_TTL_LIST_MS } from "../constants";
import { bgmGetLegacy } from "./client.server";
import { BGM_API_ROUTES } from "./api-routes.server";
import { trimSubjects } from "./trim.server";
import type { CalendarDayGroup } from "../types";
import type { RawSubject } from "./api-types.server";
import type { UpstreamRequestOptions } from "~/lib/upstream";
import { BGM_TIMEOUT_MS } from "./config.server";

type CalendarResponse = Array<{
  weekday: CalendarDayGroup["weekday"];
  items: RawSubject[];
}>;

const calendarCache = createCache<{ schedule: CalendarDayGroup[]; total: number }>({
  // 键已带上海日历日；TTL 覆盖当日反复访问即可，跨日靠 key 失效。
  ttlMs: CACHE_TTL_LIST_MS * 3,
  maxEntries: CACHE_MAX_ENTRIES.list,
});

async function fetchCalendarScheduleUncached(options?: UpstreamRequestOptions): Promise<{
  schedule: CalendarDayGroup[];
  total: number;
}> {
  const cal = await bgmGetLegacy<CalendarResponse>(BGM_API_ROUTES.calendar(), {
    ...options,
    timeoutMs: options?.timeoutMs ?? BGM_TIMEOUT_MS.calendar,
  });

  const schedule = cal.map((day) => ({
    weekday: day.weekday,
    items: trimSubjects(day.items).sort((a, b) => (b.rating?.score ?? 0) - (a.rating?.score ?? 0)),
  }));

  const total = schedule.reduce((n, d) => n + d.items.length, 0);
  return { schedule, total };
}

/** GET /calendar — 按星期分组，组内按评分降序；L1+L2，键含上海日。 */
export async function fetchCalendarSchedule(options?: UpstreamRequestOptions): Promise<{
  schedule: CalendarDayGroup[];
  total: number;
}> {
  const key = `calendar:v1:${shanghaiDateKey()}`;
  return withCache(calendarCache, key, () => fetchCalendarScheduleUncached(options), {
    signal: options?.signal,
    useEdge: true,
    onStatus: options?.onCacheStatus,
  });
}
