import { bgmPost } from "./client";
import { BGM_API_ROUTES } from "./urls";
import { BGM_SEARCH_PAGE_SIZE } from "./constants";
import { getCurrentAnimeSeasonAirDateFilter } from "./season";
import { trimSubjects } from "./trim";
import type { AnimeCardData } from "~/lib/anime-meta";
import type { ListQuery, SearchSubjectsBody, SubjectListResponse } from "./types";


/**
 * POST /v0/search/subjects — 近期注目 / 标签 / 关键词搜索
 *
 * limit/offset 必须放在 URL query，不能放在 body。
 * sort=heat 为总收藏人数；「30 日注目」无公开 API，heat 视图用当季 air_date 近似。
 */
export async function fetchSearchList(
  query: ListQuery,
  offset: number,
): Promise<{ items: AnimeCardData[]; total: number }> {
  const typeNum = Number(query.type);
  const filter: SearchSubjectsBody["filter"] = { type: [typeNum] };

  if (query.view === "tag" && query.tag) {
    filter.tag = [query.tag];
  }

  let sort: SearchSubjectsBody["sort"] = "match";
  let keyword = query.q;

  if (query.view === "heat") {
    sort = "heat";
    keyword = keyword || "";
    // 公开 API 无「最近 30 日标记」；按当季放送 + 收藏热度近似官网「注目动画」
    filter.air_date = getCurrentAnimeSeasonAirDateFilter();
  } else if (query.view === "search") {
    sort = "match";
    if (!keyword) {
      return { items: [], total: 0 };
    }
  } else if (query.view === "tag") {
    sort = "rank";
    keyword = keyword || query.tag || "";
  }

  const res = await bgmPost<SubjectListResponse>(
    BGM_API_ROUTES.searchSubjects(),
    { keyword, sort, filter },
    {
      limit: BGM_SEARCH_PAGE_SIZE,
      offset,
    },
  );

  return {
    items: trimSubjects(res.data),
    total: res.total ?? 0,
  };
}
