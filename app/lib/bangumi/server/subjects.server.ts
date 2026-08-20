import { bgmGet } from "./client.server";
import { BGM_API_ROUTES } from "./api-routes.server";
import { LIST_PAGE_SIZE } from "../constants";
import { trimSubjects } from "./trim.server";
import type { AnimeCardData } from "~/lib/anime-meta";
import { SUBJECT_TYPE, isSubjectType, type ListQuery } from "../types";
import type { SubjectListResponse } from "./api-types.server";
import type { UpstreamRequestOptions } from "~/lib/upstream";
import { BGM_TIMEOUT_MS } from "./config.server";

type BrowseParams = {
  type: string;
  sort?: string;
  cat?: string;
  year?: string;
  month?: string;
  series?: boolean;
  platform?: string;
  limit?: number;
  offset?: number;
};

/** GET /v0/subjects — 排行榜 / 最新 / 分类 / 季度 / 平台 / 系列 */
export async function fetchSubjectsBrowse(
  params: BrowseParams,
  options?: UpstreamRequestOptions,
): Promise<{ items: AnimeCardData[]; total: number }> {
  const query: Record<string, string | number | boolean | undefined> = {
    type: params.type,
    sort: params.sort ?? "rank",
    cat: params.cat,
    year: params.year,
    month: params.month,
    limit: params.limit ?? LIST_PAGE_SIZE,
    offset: params.offset ?? 0,
  };
  if (params.series) query.series = true;
  if (params.platform) query.platform = params.platform;

  const body = await bgmGet<SubjectListResponse>(BGM_API_ROUTES.subjects(), query, {
    ...options,
    timeoutMs: options?.timeoutMs ?? BGM_TIMEOUT_MS.list,
  });
  return { items: trimSubjects(body.data), total: body.total };
}

export async function fetchSubjectsList(
  query: ListQuery,
  offset: number,
  options?: UpstreamRequestOptions,
): Promise<{ items: AnimeCardData[]; total: number }> {
  const { type, sort, view, cat, year, month, series, platform } = query;
  const browseType = isSubjectType(type) ? type : SUBJECT_TYPE.anime;

  if (view === "cat" && cat) {
    return fetchSubjectsBrowse(
      {
        type: browseType,
        sort: "rank",
        cat,
        series: series || undefined,
        platform: platform || undefined,
        limit: LIST_PAGE_SIZE,
        offset,
      },
      options,
    );
  }

  if (view === "season" && year) {
    return fetchSubjectsBrowse(
      {
        type: browseType,
        sort: "rank",
        year,
        month: month || undefined,
        limit: LIST_PAGE_SIZE,
        offset,
      },
      options,
    );
  }

  return fetchSubjectsBrowse(
    {
      type: browseType,
      sort,
      cat: cat || undefined,
      year: year || undefined,
      month: month || undefined,
      series: series || undefined,
      platform: platform || undefined,
      limit: LIST_PAGE_SIZE,
      offset,
    },
    options,
  );
}
