import type { Route } from "./+types/anime.list";
import {
  fetchAnimeList,
  listCacheKey,
  withCache,
  createCache,
  type AnimeListResult,
} from "~/lib/bangumi";

const listCache = createCache<AnimeListResult>();

/** 同源列表 API：聚合 Bangumi 多接口，带内存缓存（上线可换 KV） */
export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const key = listCacheKey(url.searchParams);
  return withCache(listCache, key, () =>
    fetchAnimeList(url.searchParams),
  );
}
