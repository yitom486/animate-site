import { bgmPost } from "./client.server";
import { BGM_API_ROUTES } from "./api-routes.server";
import { BGM_SEARCH_PAGE_SIZE, SEARCH_GROUP_PAGE_SIZE } from "./config.server";
import { getCurrentAnimeSeasonAirDateFilter } from "./season.server";
import { trimSubjects } from "./trim.server";
import { getTypeLabel } from "../params";
import type { AnimeCardData } from "~/lib/anime-meta";
import {
  SUBJECT_TYPE_ALL,
  SUBJECT_TYPE_ORDER,
  type ListQuery,
  type SearchGroup,
  type SubjectTypeValue,
} from "../types";
import type { SearchSubjectsBody, SubjectListResponse } from "./api-types.server";

type SearchPage = { items: AnimeCardData[]; total: number };

type GroupedSearch = SearchPage & { groups: SearchGroup[] };

async function postSearch(
  body: SearchSubjectsBody,
  limit: number,
  offset: number,
): Promise<SearchPage> {
  const res = await bgmPost<SubjectListResponse>(BGM_API_ROUTES.searchSubjects(), body, {
    limit,
    offset,
  });

  return {
    items: trimSubjects(res.data),
    total: res.total ?? 0,
  };
}

async function searchByType(
  query: ListQuery,
  type: SubjectTypeValue,
  offset: number,
  limit = BGM_SEARCH_PAGE_SIZE,
): Promise<SearchPage> {
  const filter: SearchSubjectsBody["filter"] = { type: [Number(type)] };

  if (query.view === "tag" && query.tag) {
    filter.tag = [query.tag];
  }

  let sort: SearchSubjectsBody["sort"] = "match";
  let keyword = query.q;

  if (query.view === "heat") {
    sort = "heat";
    keyword = keyword || "";
    filter.air_date = getCurrentAnimeSeasonAirDateFilter();
  } else if (query.view === "search") {
    sort = "match";
    if (!keyword) return { items: [], total: 0 };
  } else if (query.view === "tag") {
    sort = "rank";
    keyword = keyword || query.tag || "";
  }

  return postSearch({ keyword, sort, filter }, limit, offset);
}

async function fetchGroupedSearch(query: ListQuery): Promise<GroupedSearch> {
  if (!query.q) return { items: [], total: 0, groups: [] };

  const settled = await Promise.allSettled(
    SUBJECT_TYPE_ORDER.map(async (type) => {
      const page = await searchByType(query, type, 0, SEARCH_GROUP_PAGE_SIZE);
      const group: SearchGroup = {
        type,
        label: getTypeLabel(type),
        items: page.items,
        total: page.total,
      };
      return group;
    }),
  );

  const groups = settled.flatMap((result) => {
    if (result.status === "fulfilled" && result.value.total > 0) {
      return [result.value];
    }
    return [];
  });

  return {
    items: groups.flatMap((group) => group.items),
    groups,
    total: groups.reduce((sum, group) => sum + group.total, 0),
  };
}

/**
 * POST /v0/search/subjects — 近期注目 / 标签 / 关键词搜索
 *
 * limit/offset 必须放在 URL query，不能放在 body。
 * sort=heat 为总收藏人数；「30 日注目」无公开 API，heat 视图用当季 air_date 近似。
 * type=all 时按分类并发搜索，结果分块返回。
 */
export async function fetchSearchList(query: ListQuery, offset: number): Promise<GroupedSearch> {
  if (query.view === "search" && query.type === SUBJECT_TYPE_ALL) {
    return fetchGroupedSearch(query);
  }

  if (query.type === SUBJECT_TYPE_ALL) {
    return { items: [], total: 0, groups: [] };
  }

  const page = await searchByType(query, query.type, offset);
  return { ...page, groups: [] };
}
