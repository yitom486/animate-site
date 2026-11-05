import { getPlatformProxy } from "wrangler";
import type { NewsEnv } from "../app/lib/news/db.server";
import { syncNewsFeeds } from "../app/lib/news/sync.server";
import type { NewsSyncEnv } from "../app/lib/news/settings.server";

const proxy = await getPlatformProxy<NewsEnv>({ configPath: "wrangler.toml" });
const syncProxy = await getPlatformProxy<NewsSyncEnv>({
  configPath: "workers/news-sync/wrangler.toml",
});
try {
  const results = await syncNewsFeeds(proxy.env.NEWS_DB, { force: true, sources: syncProxy.env });
  console.log(JSON.stringify(results, null, 2));
  if (results.some((row) => row.status === "error")) process.exitCode = 1;
} finally {
  await proxy.dispose();
  await syncProxy.dispose();
}
