import { bgmGet } from "./client";
import { BGM_API_ROUTES } from "./urls";
import type { Episode, Person, SubjectDetail } from "./types-detail";
import { createCache } from "./cache";
import { CACHE_TTL_DETAIL_MS } from "./constants";

export type { Episode, Person, SubjectDetail };

export type DetailPayload = {
  subject: SubjectDetail;
  staff: Record<string, string>;
  episodes: Episode[];
};

// 共享的服务端详情缓存
export const serverDetailCache = createCache<DetailPayload>(CACHE_TTL_DETAIL_MS);

/** GET /v0/subjects/{id} — 条目详情 */
export async function fetchSubjectDetail(id: string): Promise<SubjectDetail> {
  return bgmGet<SubjectDetail>(BGM_API_ROUTES.subjectDetail(id));
}

/** GET /v0/subjects/{id}/persons — 制作人员 / 声优 */
export async function fetchSubjectPersons(id: string): Promise<Person[]> {
  return bgmGet<Person[]>(BGM_API_ROUTES.subjectPersons(id));
}

/** GET /v0/episodes — 章节列表 */
export async function fetchSubjectEpisodes(
  id: string,
  limit = 100,
): Promise<Episode[]> {
  const res = await bgmGet<{ data: Episode[] }>(BGM_API_ROUTES.episodes(), {
    subject_id: id,
    limit,
  });
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
export async function fetchCachedDetail(id: string): Promise<DetailPayload> {
  const cacheKey = `detail:${id}`;
  const cached = serverDetailCache.get(cacheKey);
  if (cached) return cached;

  const [subject, persons, episodes] = await Promise.all([
    fetchSubjectDetail(id),
    fetchSubjectPersons(id),
    fetchSubjectEpisodes(id),
  ]);

  const data = {
    subject,
    staff: pickStaff(persons),
    episodes,
  };
  serverDetailCache.set(cacheKey, data);
  return data;
}
