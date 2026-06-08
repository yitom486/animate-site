import type { Route } from "./+types/anime.detail.$id";
import {
  CACHE_TTL_DETAIL_MS,
  createCache,
  fetchSubjectDetail,
  fetchSubjectEpisodes,
  fetchSubjectPersons,
  pickStaff,
  withCache,
} from "~/lib/bangumi";

type DetailPayload = {
  subject: Awaited<ReturnType<typeof fetchSubjectDetail>>;
  staff: ReturnType<typeof pickStaff>;
  episodes: Awaited<ReturnType<typeof fetchSubjectEpisodes>>;
};

const detailCache = createCache<DetailPayload>(CACHE_TTL_DETAIL_MS);

/** 同源详情 API：并行拉取条目 + 人员 + 章节，带缓存 */
export async function loader({ params }: Route.LoaderArgs) {
  const id = params.id;
  if (!id) throw new Response("缺少 id", { status: 400 });

  return withCache(detailCache, `detail:${id}`, async () => {
    const [subject, persons, episodes] = await Promise.all([
      fetchSubjectDetail(id),
      fetchSubjectPersons(id),
      fetchSubjectEpisodes(id),
    ]);
    return { subject, staff: pickStaff(persons), episodes };
  });
}
