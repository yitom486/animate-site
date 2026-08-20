import { fetchCalendarSchedule } from "./calendar.server";
import { fetchSearchList } from "./search.server";
import { fetchSubjectsList } from "./subjects.server";
import { LIST_PAGE_SIZE } from "../constants";
import { BGM_SEARCH_PAGE_SIZE, SEARCH_GROUP_PAGE_SIZE } from "./config.server";
import { buildBaseParams, getTypeLabel, getViewLabel, parseListQuery } from "../params";
import { SUBJECT_TYPE_ALL, type AnimeListResult } from "../types";
import type { UpstreamRequestOptions } from "~/lib/upstream";

/** 统一列表入口：按 view 分发到对应 Bangumi 接口 */
export async function fetchAnimeList(
  searchParams: URLSearchParams,
  options?: UpstreamRequestOptions,
): Promise<AnimeListResult> {
  const query = parseListQuery(searchParams);
  const isGroupedSearch = query.view === "search" && query.type === SUBJECT_TYPE_ALL;
  const isSearchView = query.view === "heat" || query.view === "tag" || query.view === "search";
  const pageSize = isGroupedSearch
    ? SEARCH_GROUP_PAGE_SIZE
    : isSearchView
      ? BGM_SEARCH_PAGE_SIZE
      : LIST_PAGE_SIZE;
  const offset = (query.page - 1) * pageSize;

  let items: AnimeListResult["items"];
  let total: number;
  let groups: AnimeListResult["groups"];

  switch (query.view) {
    case "calendar": {
      const calendar = await fetchCalendarSchedule(options);
      return {
        items: [],
        schedule: calendar.schedule,
        type: query.type,
        sort: query.sort,
        view: query.view,
        page: 1,
        pageSize: LIST_PAGE_SIZE,
        total: calendar.total,
        baseParams: buildBaseParams(query),
        typeLabel: getTypeLabel(query.type),
        viewLabel: getViewLabel(query),
      };
    }
    case "heat":
    case "tag":
    case "search": {
      const result = await fetchSearchList(query, offset, options);
      items = result.items;
      total = result.total;
      groups = result.groups?.length ? result.groups : undefined;
      break;
    }
    default:
      ({ items, total } = await fetchSubjectsList(query, offset, options));
      break;
  }

  return {
    items,
    groups,
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
