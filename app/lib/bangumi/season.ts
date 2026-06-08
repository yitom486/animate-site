/** 当前动画季（1/4/7/10 月）的 air_date 过滤，用于近似「近期注目」 */
export function getCurrentAnimeSeasonAirDateFilter(now = new Date()): string[] {
  const y = now.getFullYear();
  const m = now.getMonth() + 1;

  let startMonth: number;
  let endMonth: number;
  if (m <= 3) {
    startMonth = 1;
    endMonth = 3;
  } else if (m <= 6) {
    startMonth = 4;
    endMonth = 6;
  } else if (m <= 9) {
    startMonth = 7;
    endMonth = 9;
  } else {
    startMonth = 10;
    endMonth = 12;
  }

  const start = `${y}-${String(startMonth).padStart(2, "0")}-01`;
  const lastDay = new Date(y, endMonth, 0).getDate();
  const end = `${y}-${String(endMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  return [`>=${start}`, `<=${end}`];
}
