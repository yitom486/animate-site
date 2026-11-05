import type { NewsEnv } from "../../app/lib/news/db.server";
import { syncNewsFeeds } from "../../app/lib/news/sync.server";

export default {
  async scheduled(_event: unknown, env: NewsEnv) {
    const results = await syncNewsFeeds(env.NEWS_DB);
    console.log(JSON.stringify({ job: "news-sync", results }));
    if (results.some((result) => result.status === "error"))
      throw new Error("部分 RSS 同步失败，已保留上次成功内容");
  },
  // 无公开同步写入接口，定时任务通过 Cloudflare scheduled 事件执行。
  fetch() {
    return new Response("Not found", { status: 404 });
  },
};
