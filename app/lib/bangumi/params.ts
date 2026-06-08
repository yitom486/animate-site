import { ANIME_CAT_LABEL, SUBJECT_TYPE, type ListQuery, type ListView, type SubjectTypeValue } from "./types";

const TYPE_LABEL: Record<string, string> = {
  [SUBJECT_TYPE.book]: "书籍",
  [SUBJECT_TYPE.anime]: "动画",
  [SUBJECT_TYPE.music]: "音乐",
  [SUBJECT_TYPE.game]: "游戏",
  [SUBJECT_TYPE.real]: "三次元",
};

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
] as const;

export function getDefaultView(type: SubjectTypeValue): ListView {
  return type === SUBJECT_TYPE.anime ? "calendar" : "";
}

/** 仅裸 /anime（无 sort/view/筛选参数）时默认每日放送 */
function isBareAnimeHome(
  searchParams: URLSearchParams,
  type: SubjectTypeValue,
): boolean {
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

export function resolveView(
  searchParams: URLSearchParams,
  type: SubjectTypeValue,
): ListView {
  const rawView = searchParams.get("view") ?? "";
  if (rawView) return rawView as ListView;
  if (isBareAnimeHome(searchParams, type)) return getDefaultView(type);
  return "";
}

export function parseListQuery(searchParams: URLSearchParams): ListQuery {
  const type = (searchParams.get("type") ?? SUBJECT_TYPE.anime) as SubjectTypeValue;
  const sort = searchParams.get("sort") === "date" ? "date" : "rank";
  const view = resolveView(searchParams, type);
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

  return params;
}

/** 合并 baseParams 与当前页码，用于详情链接 / 关闭返回 */
export function mergeListParams(
  baseParams: Record<string, string>,
  page: number,
): URLSearchParams {
  const params = new URLSearchParams(baseParams);
  if (page > 1) params.set("page", String(page));
  return params;
}

export function listParamsFromSearch(
  searchParams: URLSearchParams,
): URLSearchParams {
  const params = new URLSearchParams();
  for (const key of LIST_PARAM_KEYS) {
    const v = searchParams.get(key);
    if (v) params.set(key, v);
  }
  return params;
}

export function buildListUrl(listParams: URLSearchParams): string {
  const qs = listParams.toString();
  return qs ? `/anime?${qs}` : "/anime";
}

export function buildDetailUrl(
  id: string | number,
  listParams: URLSearchParams,
): string {
  const qs = listParams.toString();
  return qs ? `/anime/${id}?${qs}` : `/anime/${id}`;
}

export function listCacheKey(searchParams: URLSearchParams): string {
  const type = (searchParams.get("type") ?? SUBJECT_TYPE.anime) as SubjectTypeValue;
  const rawView = searchParams.get("view") ?? "";
  const view = resolveView(searchParams, type);

  const keys =
    view === "calendar"
      ? LIST_PARAM_KEYS.filter((k) => k !== "page")
      : LIST_PARAM_KEYS;

  const parts = keys.map((k) => {
    if (k === "view" && !rawView && view === "calendar") return "view=calendar";
    return `${k}=${searchParams.get(k) ?? ""}`;
  });

  return parts.join("&");
}

export function getTypeLabel(type: string): string {
  return TYPE_LABEL[type] ?? "条目";
}

export function getViewLabel(query: ListQuery): string {
  switch (query.view) {
    case "calendar":
      return "每日放送";
    case "heat":
      return "近期注目";
    case "cat":
      return ANIME_CAT_LABEL[query.cat]
        ? `分类 · ${ANIME_CAT_LABEL[query.cat]}`
        : "分类浏览";
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
    default:
      return query.sort === "date" ? "最新发布" : "排行榜";
  }
}

export const LIST_REVALIDATE_KEYS = LIST_PARAM_KEYS;
