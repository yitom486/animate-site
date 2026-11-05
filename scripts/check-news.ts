import assert from "node:assert/strict";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getPlatformProxy } from "wrangler";
import type { NewsEnv } from "../app/lib/news/db.server";
import { readHomeNews, readNewsArticle, readNewsFeed } from "../app/lib/news/db.server";
import { newsArticleId, parseNewsRss, sanitizeNewsHtml } from "../app/lib/news/parse.server";
import { NEWS_RETENTION_MS } from "../app/lib/news/config";
import { syncNewsFeeds } from "../app/lib/news/sync.server";

const directory = await mkdtemp(join(tmpdir(), "celadon-news-check-"));
const proxy = await getPlatformProxy<NewsEnv>({
  configPath: "wrangler.toml",
  persist: { path: directory },
});
const db = proxy.env.NEWS_DB;
const sources = {
  NEWS_ANIME_RSS_URL: "https://feeds.example.test/anime.xml",
  NEWS_EVENTS_RSS_URL: "https://feeds.example.test/events.xml",
};
const now = Date.UTC(2026, 10, 6, 0);
const date = new Date(now - 3600000).toUTCString();
const item = (guid: string, content = "<p>正文 &amp; 来源</p>", pubDate = date) =>
  `<item><guid isPermaLink="false">${guid}</guid><title>中文资讯</title><link>https://example.com/source</link><pubDate>${pubDate}</pubDate><description><![CDATA[<p>摘要回退</p>]]></description><content:encoded><![CDATA[${content}]]></content:encoded></item>`;
const rss = (items: string) =>
  `<?xml version="1.0"?><rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/"><channel><title>test</title>${items}</channel></rss>`;
let requests = 0;
let handler: (url: string, init?: RequestInit) => Response = (url) =>
  new Response(rss(item(url.includes("anime") ? "anime-1" : "events-1")), {
    headers: { ETag: '"v1"' },
  });
const fetcher = (async (input: string | URL | Request, init?: RequestInit) => {
  requests++;
  return handler(String(input), init);
}) as typeof fetch;

try {
  const schema = await readFile("migrations/0001_news.sql", "utf8");
  await db.batch(
    schema
      .split(";")
      .map((sql) => sql.trim())
      .filter(Boolean)
      .map((sql) => db.prepare(sql)),
  );

  const parsed = parseNewsRss(rss(item("guid-1")), "anime");
  assert.equal(parsed[0].contentHtml, "<p>正文 &amp; 来源</p>");
  assert.equal(parsed[0].excerpt, "正文 & 来源");
  assert.equal(parseNewsRss(rss(item("g") + item("g")), "anime").length, 1);
  assert.ok(parseNewsRss(rss(item("fallback", "")), "anime")[0].contentHtml.includes("摘要回退"));
  assert.throws(() => parseNewsRss("<rss><channel>", "anime"));
  assert.throws(() =>
    parseNewsRss('<!DOCTYPE rss [<!ENTITY x "value">]><rss><channel/></rss>', "anime"),
  );
  assert.throws(() => parseNewsRss(rss(item("", "<p>test</p>")), "anime"));
  const safe = sanitizeNewsHtml(
    '<h2>AI 背景与解读</h2><script>alert(1)</script><p onclick="bad()" style="color:red">待主办方核实</p><a href="javascript:alert(1)">bad</a><a href="https://example.com">来源</a><iframe src="https://evil.example"></iframe>',
  );
  assert.ok(safe.includes("<h2>AI 背景与解读</h2>"));
  assert.ok(safe.includes("待主办方核实"));
  assert.ok(safe.includes('rel="noopener noreferrer nofollow"'));
  assert.ok(!/script|onclick|style=|javascript:|iframe/.test(safe));

  const first = await syncNewsFeeds(db, { sources, now, fetcher });
  assert.deepEqual(
    first.map((row) => row.status),
    ["updated", "updated"],
  );
  const feed = await readNewsFeed(db, { now });
  assert.equal(feed.total, 2, "同一原文 URL、不同 GUID 仍分别保留");
  assert.ok(feed.sources.every((source) => source.ok));
  const id = await newsArticleId("anime-1");
  assert.ok((await readNewsArticle(db, id, now))?.contentHtml.includes("正文"));
  assert.equal(await readNewsArticle(db, "bad-id", now), null);
  assert.equal((await readNewsFeed(db, { channel: "anime", now })).total, 1);
  const secondPage = await readNewsFeed(db, { limit: 1, page: 2, now });
  assert.equal(secondPage.items.length, 1);
  assert.equal(secondPage.hasMore, false);

  await syncNewsFeeds(db, { sources, now: now + 1000, fetcher });
  assert.equal(requests, 2, "未到各自刷新时间不重复抓取");
  handler = (_url, init) => {
    assert.equal(new Headers(init?.headers).get("If-None-Match"), '"v1"');
    return new Response(null, { status: 304 });
  };
  const unchanged = await syncNewsFeeds(db, { sources, now: now + 15 * 60000, fetcher });
  assert.deepEqual(
    unchanged.map((row) => row.status),
    ["not-modified", "skipped"],
  );
  assert.equal((await readNewsFeed(db, { now })).total, 2);

  handler = (url) =>
    new Response(
      rss(
        url.includes("anime") ? item("anime-1", "<p>更新后的解读</p>") + item("anime-update") : "",
      ),
      { headers: { ETag: '"v2"' } },
    );
  await syncNewsFeeds(db, { sources, now: now + 60 * 60000, force: true, fetcher });
  assert.equal(
    (await readNewsFeed(db, { now })).total,
    3,
    "新 GUID 增量导入；源内消失的条目仍保留",
  );
  assert.ok((await readNewsArticle(db, id, now))?.contentHtml.includes("更新后的解读"));

  handler = () => new Response("invalid xml", { headers: { ETag: '"broken"' } });
  await syncNewsFeeds(db, { sources, now: now + 120 * 60000, force: true, fetcher });
  assert.equal(
    (await db.prepare("SELECT etag FROM news_feeds WHERE id='anime'").first<{ etag: string }>())
      ?.etag,
    '"v2"',
  );
  assert.equal((await readNewsFeed(db, { now })).total, 3);
  assert.ok(
    (await readNewsFeed(db, { now })).sources.every((source) => !source.ok && source.lastSuccessAt),
  );

  handler = () => {
    throw new Error("fetch failed: https://private.example.test/rss?token=private-test-token");
  };
  await syncNewsFeeds(db, { sources, now: now + 180 * 60000, force: true, fetcher });
  assert.equal((await readNewsFeed(db, { now })).total, 3);
  const errorRows = await db.prepare("SELECT error FROM news_feeds").all();
  assert.ok(!JSON.stringify(errorRows.results).includes("private.example.test"));
  assert.ok(!JSON.stringify(await readNewsFeed(db, { now })).includes("private-test-token"));

  const beforeMissingConfig = requests;
  const missingConfig = await syncNewsFeeds(db, {
    sources: {},
    now: now + 190 * 60000,
    force: true,
    fetcher,
  });
  assert.ok(missingConfig.every((result) => result.status === "error"));
  assert.equal(requests, beforeMissingConfig, "缺少 Secrets 时不请求任何默认公开地址");
  await syncNewsFeeds(db, {
    sources: { ...sources, NEWS_ANIME_RSS_URL: "http://invalid.example.test/feed" },
    now: now + 200 * 60000,
    force: true,
    fetcher,
  });
  assert.equal(requests, beforeMissingConfig + 1, "不安全地址不发请求，另一频道继续独立处理");

  // 模拟正在同步的任务：另一个任务不得覆盖其状态或重复请求。
  await db
    .prepare("UPDATE news_feeds SET lease_until=?")
    .bind(now + 86400000)
    .run();
  const beforeLease = requests;
  await syncNewsFeeds(db, { sources, now: now + 240 * 60000, force: true, fetcher });
  assert.equal(requests, beforeLease);
  await db.prepare("UPDATE news_feeds SET lease_until=0").run();

  // 同一批次后面的语句失败时，前面的文章修改必须回滚。
  await assert.rejects(
    db.batch([
      db.prepare("UPDATE news_articles SET title='should rollback'"),
      db.prepare("INSERT INTO news_feeds(id) VALUES ('invalid-channel')"),
    ]),
  );
  assert.equal((await readNewsFeed(db, { now })).items[0].title, "中文资讯");

  const expiredNow = now + NEWS_RETENTION_MS + 1;
  assert.equal((await readNewsFeed(db, { now: expiredNow })).total, 0);
  assert.equal(await readNewsArticle(db, id, expiredNow), null);
  await syncNewsFeeds(db, { sources, now: expiredNow, force: true, fetcher });
  assert.equal(
    (await db.prepare("SELECT COUNT(*) AS total FROM news_articles").first<{ total: number }>())
      ?.total,
    0,
  );
  const nextDate = new Date(expiredNow).toUTCString();
  handler = (url) =>
    new Response(
      rss(
        url.includes("anime")
          ? Array.from({ length: 25 }, (_, index) =>
              item(`many-${index}`, "<p>batch</p>", nextDate),
            ).join("") +
              item("future", "<p>future</p>", new Date(expiredNow + 3600000).toUTCString())
          : item("older-event", "<p>event</p>", new Date(expiredNow - 86400000).toUTCString()),
      ),
      { headers: { ETag: '"future"' } },
    );
  await syncNewsFeeds(db, { sources, now: expiredNow, force: true, fetcher });
  const home = await readHomeNews(db, expiredNow);
  assert.equal(home.items.filter((row) => row.channel === "anime").length, 12);
  assert.equal(
    home.items.filter((row) => row.channel === "events").length,
    1,
    "动漫高频更新不挤掉漫展入口",
  );
  const futureId = await newsArticleId("future");
  assert.equal(await readNewsArticle(db, futureId, expiredNow), null);
  assert.ok(
    await readNewsArticle(db, futureId, expiredNow + 3600000),
    "未来发布时间的条目保存但延后展示，不因 ETag 不变永久漏掉",
  );
  let authenticatedRequests = 0;
  handler = (_url, init) => {
    assert.equal(new Headers(init?.headers).get("Authorization"), "Bearer test-only-token");
    assert.equal(init?.redirect, "manual");
    authenticatedRequests++;
    return new Response(null, { status: 304 });
  };
  await syncNewsFeeds(db, {
    sources: { ...sources, NEWS_RSS_BEARER_TOKEN: "test-only-token" },
    now: expiredNow + 60000,
    force: true,
    fetcher,
  });
  assert.equal(authenticatedRequests, 2);
  const beforeRedirect = requests;
  handler = () =>
    new Response(null, {
      status: 302,
      headers: { Location: "https://redirect.example.test/private" },
    });
  const redirected = await syncNewsFeeds(db, {
    sources,
    now: expiredNow + 120000,
    force: true,
    fetcher,
  });
  assert.equal(requests, beforeRedirect + 2, "3xx 不跟随到其他地址");
  assert.ok(
    redirected.every((result) => result.status === "error" && result.error === "RSS HTTP 302"),
  );
  console.log(
    "资讯检查通过：真实本地 D1、GUID、完整正文/过滤、ETag/304、频道周期、分页、失败保留、并发租约、事务回滚和 30 天清理。",
  );
} finally {
  await proxy.dispose();
  await rm(directory, { recursive: true, force: true });
}
