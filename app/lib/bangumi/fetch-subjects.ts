import { bgmGet } from "./client";
import { BGM_API_ROUTES } from "./urls";
import { LIST_PAGE_SIZE } from "./constants";
import { trimSubjects } from "./trim";
import type { AnimeCardData } from "~/lib/anime-meta";
import type { ListQuery, SubjectListResponse } from "./types";

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

  if (view === "cat" && cat) {
    return fetchSubjectsBrowse({
      type,
      sort: "rank",
      cat,
      limit: LIST_PAGE_SIZE,
      offset,
    });
  }

  if (view === "season" && year) {
    return fetchSubjectsBrowse({
      type,
      sort: "rank",
      year,
      month: month || undefined,
      limit: LIST_PAGE_SIZE,
      offset,
    });
  }

  return fetchSubjectsBrowse({
    type,
    sort,
    year: year || undefined,
    month: month || undefined,
    limit: LIST_PAGE_SIZE,
    offset,
  });
}
