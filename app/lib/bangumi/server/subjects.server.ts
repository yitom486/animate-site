import { bgmGet } from "./client.server";
import { BGM_API_ROUTES } from "./api-routes.server";
import { LIST_PAGE_SIZE } from "../constants";
import { trimSubjects } from "./trim.server";
import type { AnimeCardData } from "~/lib/anime-meta";
import { SUBJECT_TYPE, isSubjectType, type ListQuery } from "../types";
import type { SubjectListResponse } from "./api-types.server";

type BrowseParams = {
  type: string;
  sort?: string;
  cat?: string;
  year?: string;
  month?: string;
  limit?: number;
  offset?: number;
};

/** GET /v0/subjects — 排行榜 / 最新 / 分类 / 季度 */
export async function fetchSubjectsBrowse(
  params: BrowseParams,
): Promise<{ items: AnimeCardData[]; total: number }> {
  const body = await bgmGet<SubjectListResponse>(BGM_API_ROUTES.subjects(), {
    type: params.type,
    sort: params.sort ?? "rank",
    cat: params.cat,
    year: params.year,
    month: params.month,
    limit: params.limit ?? LIST_PAGE_SIZE,
    offset: params.offset ?? 0,
  });
  return { items: trimSubjects(body.data), total: body.total };
}

export async function fetchSubjectsList(
  query: ListQuery,
  offset: number,
): Promise<{ items: AnimeCardData[]; total: number }> {
  const { type, sort, view, cat, year, month } = query;
  const browseType = isSubjectType(type) ? type : SUBJECT_TYPE.anime;

  if (view === "cat" && cat) {
    return fetchSubjectsBrowse({
      type: browseType,
      sort: "rank",
      cat,
      limit: LIST_PAGE_SIZE,
      offset,
    });
  }

  if (view === "season" && year) {
    return fetchSubjectsBrowse({
      type: browseType,
      sort: "rank",
      year,
      month: month || undefined,
      limit: LIST_PAGE_SIZE,
      offset,
    });
  }

  return fetchSubjectsBrowse({
    type: browseType,
    sort,
    year: year || undefined,
    month: month || undefined,
    limit: LIST_PAGE_SIZE,
    offset,
  });
}
