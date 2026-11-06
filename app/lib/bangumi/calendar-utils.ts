/** 站点时区：放送「今日」与排行年份一律按北京时间，避免 Worker UTC 串日。 */
export const SITE_TIME_ZONE = "Asia/Shanghai";

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  /** 1=周一 … 7=周日（与 Bangumi weekday.id 一致） */
  weekdayId: number;
  hour: number;
  minute: number;
  second: number;
};

const weekdayShortToId: Record<string, number> = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
  Sun: 7,
};

/** 把任意瞬间解释为 Asia/Shanghai 的年月日与星期。 */
export function getShanghaiParts(date = new Date()): ZonedParts {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: SITE_TIME_ZONE,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const map: Record<string, string> = {};
  for (const part of fmt.formatToParts(date)) {
    if (part.type !== "literal") map[part.type] = part.value;
  }
  const weekdayId = weekdayShortToId[map.weekday ?? ""] ?? 1;
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    weekdayId,
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

/** Bangumi weekday.id：周一=1 … 周日=7；按 Asia/Shanghai，不用宿主本地/UTC。 */
export function getBangumiWeekdayId(date = new Date()): number {
  return getShanghaiParts(date).weekdayId;
}

/** `YYYY-MM-DD`（上海日历日），用作放送/首页缓存键，跨日后自动失效。 */
export function shanghaiDateKey(date = new Date()): string {
  const p = getShanghaiParts(date);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/** 距下一个上海午夜的毫秒数；供 TTL 与 CDN max-age 上限。 */
export function msUntilNextShanghaiMidnight(date = new Date()): number {
  const p = getShanghaiParts(date);
  // 构造「上海当日 00:00」对应的 UTC 毫秒：用格式化偏移倒推不稳，改用迭代到次日 key 变化。
  // 更稳：上海比 UTC+8，当日剩余 = 到 24:00 的时分秒。
  const msLeftToday =
    ((24 - p.hour - 1) * 60 * 60 + (60 - p.minute - 1) * 60 + (60 - p.second)) * 1000;
  return Math.max(1000, msLeftToday);
}

/** CDN/浏览器公开缓存：不超过「到上海午夜」与业务上限。 */
export function secondsUntilShanghaiMidnightCapped(capSeconds: number, date = new Date()): number {
  const until = Math.floor(msUntilNextShanghaiMidnight(date) / 1000);
  return Math.max(1, Math.min(capSeconds, until));
}

const WEEKDAY_CN = ["", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六", "星期日"];

export function getWeekdayLabel(id: number): string {
  return WEEKDAY_CN[id] ?? "";
}

export function formatCurrentDateTime(date = new Date()): string {
  const p = getShanghaiParts(date);
  const wd = getWeekdayLabel(p.weekdayId);
  const hh = String(p.hour).padStart(2, "0");
  const mm = String(p.minute).padStart(2, "0");
  const ss = String(p.second).padStart(2, "0");
  return `${p.year}年${p.month}月${p.day}日 ${wd} ${hh}:${mm}:${ss}`;
}

export function formatAirDate(airDate?: string): string {
  if (!airDate) return "";
  const [y, m, d] = airDate.split("-");
  if (!y || !m || !d) return airDate;
  return `${y}年${Number(m)}月${Number(d)}日`;
}
