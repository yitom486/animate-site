import type { NewsItem } from "./types";

export type ParsedNewsMeta = {
  cleanExcerpt: string;
  location?: string;
  venue?: string;
  eventDates?: string;
  status?: string;
};

/**
 * 结构化解析漫展与动漫资讯的摘要，提取地点、场馆、排期等胶囊标签，
 * 并剔除重复冗余的样板前缀，提升二次元卡片的易读性与现代信息层级。
 */
export function parseNewsItemMeta(item: NewsItem): ParsedNewsMeta {
  const excerpt = item.excerpt?.trim() ?? "";
  if (!excerpt) return { cleanExcerpt: "" };

  if (item.channel === "events") {
    const locationMatch = excerpt.match(
      /地区[：:]\s*([^\r\n]+?)(?=\s+(?:场馆|聚合站状态|活动开始|活动结束|活动聚合线索|$))/,
    );
    const venueMatch = excerpt.match(
      /场馆[：:]\s*([^\r\n]+?)(?=\s+(?:聚合站状态|活动开始|活动结束|活动聚合线索|地区|$))/,
    );
    const startMatch = excerpt.match(/活动开始(?:（[^）]*）)?[：:]\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/);
    const endMatch = excerpt.match(/活动结束(?:（[^）]*）)?[：:]\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/);
    const statusMatch = excerpt.match(/聚合站状态[：:]\s*([^\r\n]+?)(?=\s+(?:活动聚合线索|$))/);

    let eventDates: string | undefined;
    if (startMatch && endMatch) {
      eventDates =
        startMatch[1] === endMatch[1] ? startMatch[1] : `${startMatch[1]} ~ ${endMatch[1]}`;
    } else if (startMatch) {
      eventDates = startMatch[1];
    }

    const detailMatch = excerpt.match(/活动聚合线索[，,]待主办方核实[：:]\s*(.+)$/);
    let clean = detailMatch?.[1]?.trim() ?? "";

    if (!clean) {
      clean = excerpt
        .replace(/资讯内容\s*[·•]\s*中文摘要\s*/g, "")
        .replace(/资讯归纳\s*/g, "")
        .replace(/背景补充\s*/g, "")
        .replace(/解读\s*/g, "")
        .replace(/第三方活动聚合线索[，,]待主办方核实[。.]?\s*/g, "")
        .replace(/时间为本服务收录时间[，,]不代表主办方刚刚官宣[。.]?\s*/g, "")
        .replace(/具体安排以主办方最新公告为准[。.]?\s*/g, "")
        .replace(/活动开始(?:（[^）]*）)?[：:][^\s]+\s*/g, "")
        .replace(/活动结束(?:（[^）]*）)?[：:][^\s]+\s*/g, "")
        .replace(/地区[：:][^\s]+\s*/g, "")
        .replace(/场馆[：:][^\s]+\s*/g, "")
        .replace(/聚合站状态[：:][^\s]+\s*/g, "")
        .trim();
    }

    if (!clean || clean.length < 5) {
      clean = "漫展活动聚合线索，具体开展时间、嘉宾阵容与门票安排请以主办方最新公告为准。";
    }

    return {
      cleanExcerpt: clean,
      location: locationMatch?.[1]?.replace(/[·•]/g, " · "),
      venue: venueMatch?.[1],
      eventDates,
      status: statusMatch?.[1],
    };
  }

  // 日本动漫资讯：去除样板引言与栏目标题，保留 2–3 行可读摘要
  let clean = excerpt
    .replace(/^资讯内容\s*[·•]\s*中文翻译与摘要\s*/g, "")
    .replace(/^仅据来源摘要编译[，,]?\s*/g, "")
    .replace(/^据[A-Za-z0-9\u4e00-\u9fa5]+(?:动画频道|报道|网)?[，,]?\s*/g, "")
    .replace(/资讯归纳\s*/g, "")
    .replace(/背景补充\s*/g, "")
    .replace(/解读\s*/g, "")
    .replace(/参考链接\s*/g, "")
    .trim();

  return { cleanExcerpt: clean || excerpt };
}

/** Pick the first N items in the given order (already published_at DESC from the feed). */
export function pickNewsShowcase<T>(items: T[], limit: number): T[] {
  return items.slice(0, limit);
}
