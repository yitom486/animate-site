import type { NewsSyncEnv } from "../../app/lib/news/settings.server";
import { syncNewsFeeds } from "../../app/lib/news/sync.server";

import { handleNewsPush } from "../../app/lib/news/push.server";

type ForceEnv = NewsSyncEnv & { NEWS_SYNC_FORCE_TOKEN?: string; NEWS_PUSH_TOKEN?: string };

export default {
  async scheduled(_event: unknown, env: NewsSyncEnv) {
    const results = await syncNewsFeeds(env.NEWS_DB, { sources: env });
    console.log(JSON.stringify({ job: "news-sync", results }));
    if (results.some((result) => result.status === "error"))
      throw new Error("部分 RSS 同步失败，已保留上次成功内容");
  },
  async fetch(request: Request, env: ForceEnv) {
    const url = new URL(request.url);
    if (url.pathname === "/feeds/push") return handleNewsPush(request, env);
    if (request.method === "POST" && url.pathname === "/__force-sync") {
      const token = request.headers.get("x-sync-token") || url.searchParams.get("token") || "";
      const expected = env.NEWS_SYNC_FORCE_TOKEN || "";
      if (!expected || token !== expected) {
        return new Response("forbidden", { status: 403 });
      }
      const results = await syncNewsFeeds(env.NEWS_DB, { sources: env, force: true });
      const failed = results.some((result) => result.status === "error");
      return Response.json({ ok: !failed, results }, { status: failed ? 500 : 200 });
    }
    return new Response("Not found", { status: 404 });
  },
};
