import type { Route } from "./+types/anime.related.$id";
import { fetchSubjectRelations } from "~/lib/bangumi/server/detail.server";
import { throwRouteUpstreamError, upstreamFromRequest } from "~/lib/upstream";

export async function loader({ params, request }: Route.LoaderArgs) {
  const id = params.id;
  if (!id) throw new Response("缺少 id", { status: 400 });

  try {
    return await fetchSubjectRelations(id, upstreamFromRequest(request));
  } catch (error) {
    throwRouteUpstreamError(error);
  }
}
