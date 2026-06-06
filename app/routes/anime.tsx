import type { Route } from "./+types/anime";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";

// Bangumi /calendar 返回的数据结构（只挑我们要用的字段）
type CalendarDay = {
  weekday: { en: string; cn: string; ja: string; id: number };
  items: Array<{
    id: number;
    name: string;
    name_cn: string;
    images?: { large: string; common: string; medium: string; grid: string };
    rating?: { score: number; total: number };
    air_date?: string;
  }>;
};

// loader 跑在服务端（本地是 Node，上线是 Cloudflare Worker）
export async function loader() {
  const res = await fetch("https://api.bgm.tv/calendar", {
    headers: {
      // 官方要求：可识别身份的 User-Agent，否则可能被禁
      "User-Agent": "yhang/anime-site (https://github.com/yhang)",
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    // 抛出 Response 会被最近的 ErrorBoundary 接住
    throw new Response("加载番剧数据失败", { status: res.status });
  }

  const calendar = (await res.json()) as CalendarDay[];
  return { calendar };
}

export function meta(_: Route.MetaArgs) {
  return [
    { title: "每日番剧放送 · Anime" },
    { name: "description", content: "来自 Bangumi 的每日番剧放送表" },
  ];
}

// Bangumi 的 weekday.id: 周一=1 ... 周日=7；JS getDay(): 周日=0 ... 周六=6
function todayWeekdayId() {
  const d = new Date().getDay();
  return d === 0 ? 7 : d;
}

export default function Anime({ loaderData }: Route.ComponentProps) {
  const { calendar } = loaderData;
  const todayId = todayWeekdayId();

  return (
    <main className="container mx-auto px-6 py-10">
      <h1 className="mb-8 text-3xl font-bold">每日番剧放送</h1>

      <div className="space-y-10">
        {calendar.map((day) => (
          <section key={day.weekday.id}>
            <div className="mb-4 flex items-center gap-2">
              <h2 className="text-xl font-semibold">{day.weekday.cn}</h2>
              {day.weekday.id === todayId && <Badge>今天</Badge>}
              <span className="text-sm text-muted-foreground">
                {day.items.length} 部
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {day.items.map((item) => (
                <Card key={item.id}>
                  {item.images?.common ? (
                    <img
                      src={item.images.common}
                      alt={item.name_cn || item.name}
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      className="aspect-[3/4] w-full object-cover"
                    />
                  ) : null}
                  <CardHeader>
                    <CardTitle className="line-clamp-2">
                      {item.name_cn || item.name}
                    </CardTitle>
                  </CardHeader>
                  {item.rating?.score ? (
                    <CardContent>
                      <Badge variant="secondary">★ {item.rating.score}</Badge>
                    </CardContent>
                  ) : null}
                </Card>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
