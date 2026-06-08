import { bgmGet } from "./client";
import type { Episode, Person, SubjectDetail } from "./types-detail";

export type { Episode, Person, SubjectDetail };

/** GET /v0/subjects/{id} — 条目详情 */
export async function fetchSubjectDetail(id: string): Promise<SubjectDetail> {
  return bgmGet<SubjectDetail>(`/subjects/${id}`);
}

/** GET /v0/subjects/{id}/persons — 制作人员 / 声优 */
export async function fetchSubjectPersons(id: string): Promise<Person[]> {
  return bgmGet<Person[]>(`/subjects/${id}/persons`);
}

/** GET /v0/episodes — 章节列表 */
export async function fetchSubjectEpisodes(
  id: string,
  limit = 100,
): Promise<Episode[]> {
  const res = await bgmGet<{ data: Episode[] }>("/episodes", {
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
