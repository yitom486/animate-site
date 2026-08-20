import type { Route } from "./+types/anime.list";
import { createCache, withCache } from "~/lib/cache";
import { listCacheKey } from "~/lib/bangumi/params";
import { fetchAnimeList } from "~/lib/bangumi/server/list.server";
import type { AnimeListResult } from "~/lib/bangumi/types";
import { throwRouteUpstreamError, upstreamFromRequest } from "~/lib/upstream";

const listCache = createCache<AnimeListResult>();

/** 同源列表 API：聚合 Bangumi 多接口，带内存缓存（上线可换 KV） */
export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const key = listCacheKey(url.searchParams);
  const upstream = upstreamFromRequest(request);

  try {
    return await withCache(
      listCache,
      key,
      () => fetchAnimeList(url.searchParams, upstream),
      upstream,
    );
  } catch (error) {
    throwRouteUpstreamError(error);
  }
}
