/** Bangumi weekday.id：周一=1 … 周日=7（与 JS Date.getDay() 不同） */
export function getBangumiWeekdayId(date = new Date()): number {
  const d = date.getDay();
  return d === 0 ? 7 : d;
}

const WEEKDAY_CN = ["", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六", "星期日"];

export function getWeekdayLabel(id: number): string {
  return WEEKDAY_CN[id] ?? "";
}

export function formatCurrentDateTime(date = new Date()): string {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const wd = getWeekdayLabel(getBangumiWeekdayId(date));
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${y}年${m}月${d}日 ${wd} ${hh}:${mm}:${ss}`;
}

export function formatAirDate(airDate?: string): string {
  if (!airDate) return "";
  const [y, m, d] = airDate.split("-");
  if (!y || !m || !d) return airDate;
  return `${y}年${Number(m)}月${Number(d)}日`;
}
