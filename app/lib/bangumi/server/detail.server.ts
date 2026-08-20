import { bgmGet } from "./client.server";
import { BGM_API_ROUTES } from "./api-routes.server";
import type { DetailPayload, Episode, Person, SubjectDetail } from "../types-detail";
import { createCache } from "~/lib/cache";
import { isAbortLike } from "~/lib/upstream";
import type { UpstreamRequestOptions } from "~/lib/upstream";
import { BGM_TIMEOUT_MS, CACHE_TTL_DETAIL_MS } from "./config.server";

export const serverDetailCache = createCache<DetailPayload>(CACHE_TTL_DETAIL_MS);

const detailOpts = (options?: UpstreamRequestOptions): UpstreamRequestOptions => ({
  ...options,
  timeoutMs: options?.timeoutMs ?? BGM_TIMEOUT_MS.detail,
});

/** GET /v0/subjects/{id} — 条目详情 */
export async function fetchSubjectDetail(
  id: string,
  options?: UpstreamRequestOptions,
): Promise<SubjectDetail> {
  return bgmGet<SubjectDetail>(BGM_API_ROUTES.subjectDetail(id), undefined, detailOpts(options));
}

/** GET /v0/subjects/{id}/persons — 制作人员 / 声优 */
export async function fetchSubjectPersons(
  id: string,
  options?: UpstreamRequestOptions,
): Promise<Person[]> {
  return bgmGet<Person[]>(BGM_API_ROUTES.subjectPersons(id), undefined, detailOpts(options));
}

/** GET /v0/episodes — 章节列表 */
export async function fetchSubjectEpisodes(
  id: string,
  limit = 100,
  options?: UpstreamRequestOptions,
): Promise<Episode[]> {
  const res = await bgmGet<{ data: Episode[] }>(
    BGM_API_ROUTES.episodes(),
    { subject_id: id, limit },
    detailOpts(options),
  );
  return res.data ?? [];
}

export function pickStaff(persons: Person[]) {
  const pick = (relation: string) =>
    persons
      .filter((p) => p.relation === relation)
      .map((p) => p.name)
      .join("、");

  return {
    原作: pick("原作"),
    制作: pick("动画制作"),
    监督: pick("导演"),
  };
}

/** 复合查询详情接口（包含基本信息、人员、章节），并自动存入共享服务端缓存 */
export async function fetchCachedDetail(
  id: string,
  options?: UpstreamRequestOptions,
): Promise<DetailPayload> {
  const cacheKey = `detail:${id}`;
  const cached = serverDetailCache.get(cacheKey);
  if (cached) return cached;

  const opts = detailOpts(options);
  try {
    const [subject, persons, episodes] = await Promise.all([
      fetchSubjectDetail(id, opts),
      fetchSubjectPersons(id, opts),
      fetchSubjectEpisodes(id, 100, opts),
    ]);

    if (opts.signal?.aborted) {
      throw opts.signal.reason;
    }

    const data = {
      subject,
      staff: pickStaff(persons),
      episodes,
    };
    serverDetailCache.set(cacheKey, data);
    return data;
  } catch (error) {
    if (isAbortLike(error)) throw error;
    throw error;
  }
}
