import { Miniflare, createFetchMock } from "miniflare";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";

// Node 提供完整 Undici MockAgent；依赖和构建仍由 Bun 管理。
const mock = createFetchMock();
mock.disableNetConnect();
const date = new Date().toUTCString();
for (const channel of ["anime", "events"]) {
  mock
    .get("https://feeds.example.test")
    .intercept({ path: `/${channel}.xml`, method: "GET" })
    .reply(
      200,
      `<rss version="2.0"><channel><title>test</title><item><guid>${channel}-runtime</guid><title>运行时资讯</title><link>https://example.com/source</link><pubDate>${date}</pubDate><description><![CDATA[<p>运行时正文</p>]]></description></item></channel></rss>`,
      { headers: { ETag: '"runtime-v1"' } },
    );
}
const runtime = new Miniflare({
  modules: true,
  scriptPath: ".wrangler/news-worker/index.js",
  compatibilityDate: "2025-01-01",
  compatibilityFlags: ["nodejs_compat"],
  d1Databases: { NEWS_DB: "runtime-news" },
  bindings: {
    NEWS_ANIME_RSS_URL: "https://feeds.example.test/anime.xml",
    NEWS_EVENTS_RSS_URL: "https://feeds.example.test/events.xml",
  },
  fetchMock: mock,
});
try {
  const db = await runtime.getD1Database("NEWS_DB");
  const { readdir } = await import("node:fs/promises");
  const migrationFiles = (await readdir("migrations"))
    .filter((name) => name.endsWith(".sql"))
    .sort();
  for (const file of migrationFiles) {
    const schema = await readFile(`migrations/${file}`, "utf8");
    await db.batch(
      schema
        .split(";")
        .map((sql) => sql.trim())
        .filter(Boolean)
        .map((sql) => db.prepare(sql)),
    );
  }
  const worker = await runtime.getWorker();
  const result = await worker.scheduled({ cron: "*/15 * * * *", scheduledTime: new Date() });
  assert.equal(result.outcome, "ok");
  assert.equal((await db.prepare("SELECT COUNT(*) AS total FROM news_articles").first()).total, 2);
  assert.equal(
    (await db.prepare("SELECT COUNT(*) AS total FROM news_feeds WHERE error IS NOT NULL").first())
      .total,
    0,
  );
  await worker.scheduled({ cron: "*/15 * * * *", scheduledTime: new Date() });
  mock.assertNoPendingInterceptors();
  console.log(
    "资讯运行时检查通过：真实 workerd scheduled、Secrets、HTTPS fetch、XML/HTML 处理与 D1 写入。",
  );
} finally {
  await runtime.dispose();
  await mock.close();
}
