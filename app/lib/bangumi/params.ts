import {
  ANIME_CAT_LABEL,
  SUBJECT_TYPE,
  SUBJECT_TYPE_ALL,
  SUBJECT_TYPE_LABEL,
  isSubjectType,
  type ListQuery,
  type ListTypeValue,
  type ListView,
  type SubjectTypeValue,
} from "./types";
import { subjectCatLabel } from "./subject-categories";

const LIST_PARAM_KEYS = [
  "type",
  "sort",
  "view",
  "page",
  "cat",
  "tag",
  "q",
  "year",
  "month",
  "series",
  "platform",
] as const;

const DETAIL_BACK_PARAM_KEYS = [...LIST_PARAM_KEYS, "date", "calendar"] as const;

export type ListHrefParams = {
  type?: string;
  sort?: string;
  view?: string;
  page?: number | string;
  cat?: string;
  tag?: string;
  q?: string;
  year?: string;
  month?: string;
  date?: string;
  calendar?: string;
  series?: string | boolean | number;
  platform?: string;
};

export function getDefaultView(type: ListTypeValue): ListView {
  return type === SUBJECT_TYPE.anime ? "calendar" : "";
}

/** 仅裸 /anime（无 sort/view/筛选参数）时默认每日放送 */
function isBareAnimeHome(searchParams: URLSearchParams, type: ListTypeValue): boolean {
  if (type !== SUBJECT_TYPE.anime) return false;
  if (searchParams.get("view")) return false;
  if (searchParams.has("sort")) return false;
  if (searchParams.get("cat")) return false;
  if (searchParams.get("tag")) return false;
  if (searchParams.get("q")) return false;
  if (searchParams.get("year")) return false;
  if (searchParams.get("month")) return false;
  if (searchParams.get("page")) return false;
  return true;
}

export function resolveView(searchParams: URLSearchParams, type: ListTypeValue): ListView {
  const rawView = searchParams.get("view") ?? "";
  if (rawView) return rawView as ListView;
  if (isBareAnimeHome(searchParams, type)) return getDefaultView(type);
  return "";
}

function parseListType(searchParams: URLSearchParams, view: string): ListTypeValue {
  const rawType = searchParams.get("type");
  if (view === "search" && (!rawType || rawType === SUBJECT_TYPE_ALL)) {
    return SUBJECT_TYPE_ALL;
  }
  if (rawType && isSubjectType(rawType)) return rawType;
  return SUBJECT_TYPE.anime;
}

export function parseListQuery(searchParams: URLSearchParams): ListQuery {
  const rawView = searchParams.get("view") ?? "";
  const typeHint = parseListType(searchParams, rawView);
  const view = rawView ? (rawView as ListView) : resolveView(searchParams, typeHint);
  const type = parseListType(searchParams, view);
  const sort = searchParams.get("sort") === "date" ? "date" : "rank";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);

  return {
    type,
    sort,
    view,
    page,
    cat: searchParams.get("cat") ?? "",
    tag: searchParams.get("tag") ?? "",
    q: searchParams.get("q") ?? "",
    year: searchParams.get("year") ?? "",
    month: searchParams.get("month") ?? "",
    series: searchParams.get("series") === "1" || searchParams.get("series") === "true",
    platform: searchParams.get("platform")?.trim() ?? "",
  };
}

export function buildBaseParams(query: ListQuery): Record<string, string> {
  const params: Record<string, string> = { type: query.type };

  if (query.view) params.view = query.view;
  else params.sort = query.sort;

  if (query.cat) params.cat = query.cat;
  if (query.tag) params.tag = query.tag;
  if (query.q) params.q = query.q;
  if (query.year) params.year = query.year;
  if (query.month) params.month = query.month;
  if (query.series) params.series = "1";
  if (query.platform) params.platform = query.platform;

  return params;
}

/** 合并 baseParams 与当前页码，用于详情链接 / 关闭返回 */
export function mergeListParams(baseParams: Record<string, string>, page: number): URLSearchParams {
  const params = new URLSearchParams(baseParams);
  if (page > 1) params.set("page", String(page));
  return params;
}

export function listParamsFromSearch(searchParams: URLSearchParams): URLSearchParams {
  const params = new URLSearchParams();
  for (const key of DETAIL_BACK_PARAM_KEYS) {
    const v = searchParams.get(key);
    if (v) params.set(key, v);
  }
  return params;
}

export function buildListUrl(listParams: URLSearchParams): string {
  const qs = listParams.toString();
  return qs ? `/anime?${qs}` : "/anime";
}

/** 用对象拼列表 URL，避免在 UI 里做字符串拼接 */
export function buildListHref(params: ListHrefParams = {}): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value == null || value === "" || value === false) continue;
    if (key === "series") {
      if (value === true || value === 1 || value === "1" || value === "true") {
        search.set("series", "1");
      }
      continue;
    }
    search.set(key, String(value));
  }
  return buildListUrl(search);
}

export function buildSearchHref(q: string, type: ListTypeValue = SUBJECT_TYPE_ALL): string {
  return buildListHref({ view: "search", q, type });
}

export function buildDetailUrl(id: string | number, listParams: URLSearchParams): string {
  const qs = listParams.toString();
  return qs ? `/anime/${id}?${qs}` : `/anime/${id}`;
}

/**
 * 列表缓存键：基于 parseListQuery 的规范业务值，带版本前缀。
 * 语义等价输入（缺省 page、默认 sort/view、首尾空白）映射为同一 key。
 */
export function listCacheKey(searchParams: URLSearchParams): string {
  const query = parseListQuery(searchParams);
  const parts = [
    "list:v2",
    `type=${query.type}`,
    `view=${query.view}`,
    `sort=${query.sort}`,
    `cat=${query.cat}`,
    `tag=${query.tag.trim()}`,
    `q=${query.q.trim()}`,
    `year=${query.year}`,
    `month=${query.month}`,
    `series=${query.series ? "1" : "0"}`,
    `platform=${query.platform}`,
  ];
  if (query.view !== "calendar") {
    parts.push(`page=${query.page}`);
  }
  return parts.join("&");
}

export function getTypeLabel(type: string): string {
  if (type === SUBJECT_TYPE_ALL) return "全部类型";
  return SUBJECT_TYPE_LABEL[type as SubjectTypeValue] ?? "条目";
}

export function getViewLabel(query: ListQuery): string {
  switch (query.view) {
    case "calendar":
      return "每日放送";
    case "heat":
      return "近期注目";
    case "cat": {
      const label = subjectCatLabel(query.type, query.cat) ?? ANIME_CAT_LABEL[query.cat];
      return label ? `分类 · ${label}` : "分类浏览";
    }
    case "tag":
      return query.tag ? `标签 · ${query.tag}` : "标签浏览";
    case "search":
      return query.q ? `搜索 · ${query.q}` : "搜索";
    case "season":
      return query.month
        ? `${query.year}年${query.month}月`
        : query.year
          ? `${query.year}年`
          : "季度浏览";
    case "links":
      return "外链入口";
    default:
      if (query.platform) return `平台 · ${query.platform}`;
      if (query.series) return "系列作品";
      if (query.sort === "rank" && query.year) {
        return `${query.year}年排行榜`;
      }
      if (query.sort === "date" && query.year) {
        return `${query.year}年最新发布`;
      }
      return query.sort === "date" ? "最新发布" : "排行榜";
  }
}

export const LIST_REVALIDATE_KEYS = LIST_PARAM_KEYS;
