import { fetchCalendarSchedule } from "./fetch-calendar";
import { fetchSearchList } from "./fetch-search";
import { fetchSubjectsList } from "./fetch-subjects";
import { BGM_SEARCH_PAGE_SIZE, LIST_PAGE_SIZE } from "./constants";
import {
  buildBaseParams,
  getTypeLabel,
  getViewLabel,
  parseListQuery,
} from "./params";
import type { AnimeListResult } from "./types";

export type { AnimeListResult };
export {
  buildBaseParams,
  getTypeLabel,
  getViewLabel,
  listCacheKey,
  parseListQuery,
  LIST_REVALIDATE_KEYS,
} from "./params";

/** 统一列表入口：按 view 分发到对应 Bangumi 接口 */
export async function fetchAnimeList(
  searchParams: URLSearchParams,
): Promise<AnimeListResult> {
  const query = parseListQuery(searchParams);
  const isSearchView =
    query.view === "heat" || query.view === "tag" || query.view === "search";
  const pageSize = isSearchView ? BGM_SEARCH_PAGE_SIZE : LIST_PAGE_SIZE;
  const offset = (query.page - 1) * pageSize;

  let items: AnimeListResult["items"];
  let total: number;

  switch (query.view) {
    case "calendar": {
      const { schedule, total } = await fetchCalendarSchedule();
      return {
        items: [],
        schedule,
        type: query.type,
        sort: query.sort,
        view: query.view,
        page: 1,
        pageSize: LIST_PAGE_SIZE,
        total,
        baseParams: buildBaseParams(query),
        typeLabel: getTypeLabel(query.type),
        viewLabel: getViewLabel(query),
      };
    }
    case "heat":
    case "tag":
    case "search":
      ({ items, total } = await fetchSearchList(query, offset));
      break;
    default:
      ({ items, total } = await fetchSubjectsList(query, offset));
      break;
  }

  return {
    items,
    type: query.type,
    sort: query.sort,
    view: query.view,
    page: query.page,
    pageSize,
    total,
    baseParams: buildBaseParams(query),
    typeLabel: getTypeLabel(query.type),
    viewLabel: getViewLabel(query),
  };
}
