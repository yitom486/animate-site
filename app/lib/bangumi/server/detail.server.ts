import { bgmGet } from "./client.server";
import { BGM_API_ROUTES } from "./api-routes.server";
import type { DetailPayload, Episode, Person, SubjectDetail } from "../types-detail";
import { createCache, withCache } from "~/lib/cache";
import type { UpstreamRequestOptions } from "~/lib/upstream";
import { BGM_TIMEOUT_MS, CACHE_MAX_ENTRIES, CACHE_TTL_DETAIL_MS } from "./config.server";
import { pickStaffByType } from "../staff-by-type";
import { isAnimeSubjectType } from "../subject-display";
import { toHttps } from "~/lib/anime-meta";

export const serverDetailCache = createCache<DetailPayload>({
  ttlMs: CACHE_TTL_DETAIL_MS,
  maxEntries: CACHE_MAX_ENTRIES.detail,
});

const detailOpts = (options?: UpstreamRequestOptions): UpstreamRequestOptions => ({
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

/** @deprecated 使用 pickStaffByType */
export function pickStaff(persons: Person[]) {
  return pickStaffByType(persons, 2);
}

/** 复合查询详情接口（包含基本信息、人员、章节），带 LRU + single-flight */
export async function fetchCachedDetail(
  id: string,
  options?: UpstreamRequestOptions,
): Promise<DetailPayload> {
  return withCache(
    serverDetailCache,
    `detail:v2:${id}`,
    async () => {
      const opts = detailOpts(options);
      const [subject, persons] = await Promise.all([
        fetchSubjectDetail(id, opts),
        fetchSubjectPersons(id, opts),
      ]);

      const episodes = isAnimeSubjectType(subject.type)
        ? await fetchSubjectEpisodes(id, 100, opts)
        : [];

      return {
        subject,
        staff: pickStaffByType(persons, subject.type),
        episodes,
      };
    },
    { signal: options?.signal, useEdge: true },
  );
}

export type RelatedSubjectLite = {
  id: number;
  name: string;
  nameCn: string;
  relation: string;
  type: number;
  image?: string;
};

export type CharacterLite = {
  id: number;
  name: string;
  relation: string;
  image?: string;
};

export type SubjectRelationsPayload = {
  related: RelatedSubjectLite[];
  characters: CharacterLite[];
};

type RawRelated = {
  id: number;
  name?: string;
  name_cn?: string;
  relation?: string;
  type?: number;
  images?: { grid?: string; small?: string; medium?: string };
};

type RawCharacter = {
  id: number;
  name?: string;
  relation?: string;
  images?: { grid?: string; small?: string; medium?: string };
};

const relationsCache = createCache<SubjectRelationsPayload>({
  ttlMs: CACHE_TTL_DETAIL_MS,
  maxEntries: CACHE_MAX_ENTRIES.detail,
});

/** 关联条目 + 角色（详情增强；与核心详情分离，避免拉长首屏） */
export async function fetchSubjectRelations(
  id: string,
  options?: UpstreamRequestOptions,
): Promise<SubjectRelationsPayload> {
  return withCache(
    relationsCache,
    `relations:${id}`,
    async () => {
      const opts = detailOpts(options);
      const [relatedRaw, charactersRaw] = await Promise.all([
        bgmGet<RawRelated[]>(BGM_API_ROUTES.subjectRelated(id), undefined, opts).catch(
          () => [] as RawRelated[],
        ),
        bgmGet<RawCharacter[]>(BGM_API_ROUTES.subjectCharacters(id), undefined, opts).catch(
          () => [] as RawCharacter[],
        ),
      ]);

      const related: RelatedSubjectLite[] = (relatedRaw ?? []).slice(0, 24).map((row) => ({
        id: row.id,
        name: row.name ?? "",
        nameCn: row.name_cn ?? "",
        relation: row.relation ?? "",
        type: row.type ?? 0,
        image: toHttps(row.images?.grid || row.images?.small || row.images?.medium),
      }));

      const characters: CharacterLite[] = (charactersRaw ?? []).slice(0, 16).map((row) => ({
        id: row.id,
        name: row.name ?? "",
        relation: row.relation ?? "",
        image: toHttps(row.images?.grid || row.images?.small || row.images?.medium),
      }));

      return { related, characters };
    },
    { signal: options?.signal, useEdge: true },
  );
}
