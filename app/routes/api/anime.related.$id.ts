import { data } from "react-router";
import type { Route } from "./+types/anime.related.$id";
import { fetchSubjectRelations } from "~/lib/bangumi/server/detail.server";
import { HTTP_CACHE, publicCacheHeaders } from "~/lib/cache";
import { throwRouteUpstreamError, upstreamFromRequest } from "~/lib/upstream";

export async function loader({ params, request }: Route.LoaderArgs) {
  const id = params.id;
  if (!id) throw new Response("缺少 id", { status: 400 });

  try {
    const payload = await fetchSubjectRelations(id, upstreamFromRequest(request));
    return data(payload, { headers: publicCacheHeaders(HTTP_CACHE.detail) });
  } catch (error) {
    throwRouteUpstreamError(error);
  }
}
