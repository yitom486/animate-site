import assert from "node:assert/strict";
import { readFile, readdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getPlatformProxy } from "wrangler";
import type { NewsEnv } from "../app/lib/news/db.server";
import { readHomeNews, readNewsArticle, readNewsFeed } from "../app/lib/news/db.server";
import {
  extractCoverImageUrl,
  newsArticleId,
  parseNewsRss,
  prepareNewsContent,
  sanitizeNewsHtml,
} from "../app/lib/news/parse.server";
import { looksLikeMarkdown } from "../app/lib/news/markdown.server";
import { NEWS_RETENTION_MS } from "../app/lib/news/config";
import {
  collapseDuplicateNewsArticles,
  mergeNewsArticlePair,
  syncNewsFeeds,
} from "../app/lib/news/sync.server";
import { newsSourceUrls } from "../app/lib/news/settings.server";
import { pickNewsShowcase } from "../app/lib/news/display";
import { normalizeSourceUrl } from "../app/lib/news/url";

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
const item = (
  guid: string,
  content = "<p>正文 &amp; 来源</p>",
  pubDate = date,
  extras = "",
  link = `https://example.com/source/${guid}`,
) =>
  `<item><guid isPermaLink="false">${guid}</guid><title>中文资讯</title><link>${link}</link><pubDate>${pubDate}</pubDate><description><![CDATA[<p>摘要回退</p>]]></description><content:encoded><![CDATA[${content}]]></content:encoded>${extras}</item>`;
const rss = (items: string) =>
  `<?xml version="1.0"?><rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:media="http://search.yahoo.com/mrss/"><channel><title>test</title>${items}</channel></rss>`;
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
    '<h2>背景与解读</h2><script>alert(1)</script><p onclick="bad()" style="color:red">待主办方核实</p><a href="javascript:alert(1)">bad</a><a href="https://example.com">来源</a><iframe src="https://evil.example"></iframe>',
  );
  assert.ok(safe.includes("<h2>背景与解读</h2>"));
  assert.ok(safe.includes("待主办方核实"));
  assert.ok(safe.includes('rel="noopener noreferrer nofollow"'));
  assert.ok(!/script|onclick|style=|javascript:|iframe/.test(safe));

  const withImage = sanitizeNewsHtml(
    '<p>图</p><img src="https://cdn.example.com/a.jpg" alt="封面" onclick="x"><img src="http://insecure.example/a.jpg"><iframe src="https://evil.example"></iframe>',
  );
  assert.ok(withImage.includes('src="https://cdn.example.com/a.jpg"'));
  assert.ok(withImage.includes('loading="lazy"'));
  assert.ok(!withImage.includes("http://insecure.example"));
  assert.ok(!withImage.includes("iframe"));
  assert.ok(!withImage.includes("onclick"));

  const enclosureRss = rss(
    item(
      "cover-1",
      "<p>有封面</p>",
      date,
      '<enclosure url="https://cdn.example.com/cover.jpg" type="image/jpeg" length="0" /><media:content url="https://cdn.example.com/cover.jpg" medium="image" />',
    ),
  );
  const covered = parseNewsRss(enclosureRss, "anime");
  assert.equal(covered[0].imageUrl, "https://cdn.example.com/cover.jpg");
  assert.equal(
    extractCoverImageUrl('<p><img src="https://cdn.example.com/from-body.jpg" alt="" /></p>'),
    "https://cdn.example.com/from-body.jpg",
  );

  const md = "## 资讯归纳\n\n正文 **加粗**，看图 ![x](https://cdn.example.com/m.jpg)";
  assert.equal(looksLikeMarkdown(md), true);
  const mdHtml = prepareNewsContent(md);
  assert.ok(mdHtml.includes("<h2>"));
  assert.ok(mdHtml.includes("<strong>"));
  assert.ok(mdHtml.includes('src="https://cdn.example.com/m.jpg"'));
  assert.equal(looksLikeMarkdown("<p>已经是 HTML</p><h2>标题</h2>"), false);

  const first = await syncNewsFeeds(db, { sources, now, fetcher });
  assert.deepEqual(
    first.map((row) => row.status),
    ["updated", "updated"],
  );
  const feed = await readNewsFeed(db, { now });
  assert.equal(feed.total, 2, "不同频道可共享相同原文 URL");
  assert.ok(feed.sources.every((source) => source.ok));
  assert.equal(feed.items[0].image, undefined);
  assert.equal(normalizeSourceUrl("https://CDN.Example.com/path/"), "https://cdn.example.com/path");
  assert.deepEqual(
    newsSourceUrls("anime", {
      NEWS_ANIME_RSS_URL: "https://feeds.example.test/anime.xml",
      NEWS_ANIME_RSS_URL_SECONDARY: "https://feeds.example.test/anime-b.xml",
      NEWS_ANIME_RSS_URLS:
        "https://feeds.example.test/anime.xml\nhttps://feeds.example.test/anime-c.xml",
    }),
    [
      "https://feeds.example.test/anime.xml",
      "https://feeds.example.test/anime-b.xml",
      "https://feeds.example.test/anime-c.xml",
    ],
  );
  assert.deepEqual(
    pickNewsShowcase(
      [
        { id: "1", image: undefined },
        { id: "2", image: "https://cdn.example.com/a.jpg" },
        { id: "3", image: undefined },
      ],
      2,
    ).map((row) => row.id),
    ["2", "1"],
  );
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
        url.includes("anime")
          ? item(
              "anime-1",
              '<p>更新后的解读</p><img src="https://cdn.example.com/body.jpg" alt="" />',
              date,
              '<enclosure url="https://cdn.example.com/anime-cover.jpg" type="image/jpeg" />',
            ) + item("anime-update")
          : "",
      ),
      { headers: { ETag: '"v2"' } },
    );
  await syncNewsFeeds(db, { sources, now: now + 60 * 60000, force: true, fetcher });
  assert.equal(
    (await readNewsFeed(db, { now })).total,
    3,
    "新 GUID 增量导入；源内消失的条目仍保留",
  );
  const updatedArticle = await readNewsArticle(db, id, now);
  assert.ok(updatedArticle?.contentHtml.includes("更新后的解读"));
  assert.ok(updatedArticle?.contentHtml.includes("https://cdn.example.com/body.jpg"));
  assert.equal(updatedArticle?.image, "https://cdn.example.com/anime-cover.jpg");
  assert.equal(
    (await readNewsFeed(db, { channel: "anime", now })).items.find((row) => row.id === id)?.image,
    "https://cdn.example.com/anime-cover.jpg",
  );

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

  await db
    .prepare("UPDATE news_feeds SET lease_until=?")
    .bind(now + 86400000)
    .run();
  const beforeLease = requests;
  await syncNewsFeeds(db, { sources, now: now + 240 * 60000, force: true, fetcher });
  assert.equal(requests, beforeLease);
  await db.prepare("UPDATE news_feeds SET lease_until=0").run();

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
  // Dual-feed merge: two anime URLs, overlapping source_url with richer Bot-style row.
  const multiNow = expiredNow + 180000;
  const multiDate = new Date(multiNow - 3600000).toUTCString();
  handler = (url) => {
    if (url.includes("anime-thick")) {
      return new Response(
        rss(
          item(
            "celadon:story-1",
            '<p>加厚解读</p><p><img src="https://cdn.example.com/thick-cover.jpg" alt="" /></p>',
            multiDate,
            '<enclosure url="https://cdn.example.com/thick-cover.jpg" type="image/jpeg" />',
            "https://example.com/story/shared",
          ),
        ),
        { headers: { ETag: '"thick"' } },
      );
    }
    if (url.includes("anime-thin")) {
      return new Response(
        rss(
          item(
            "urn:sha256:story-1",
            "<p>更长的旧聚合正文，用来补充背景细节与原文摘录。</p>",
            multiDate,
            "",
            "https://example.com/story/shared",
          ),
        ),
        { headers: { ETag: '"thin"' } },
      );
    }
    return new Response(rss(""), { headers: { ETag: '"empty-events"' } });
  };
  const multi = await syncNewsFeeds(db, {
    sources: {
      NEWS_ANIME_RSS_URL: "https://feeds.example.test/anime-thick.xml",
      NEWS_ANIME_RSS_URL_SECONDARY: "https://feeds.example.test/anime-thin.xml",
      NEWS_EVENTS_RSS_URL: "https://feeds.example.test/events.xml",
    },
    now: multiNow,
    force: true,
    fetcher,
  });
  assert.equal(multi.filter((row) => row.status === "updated").length, 3);
  const multiIds = multi.map((row) => row.id);
  assert.equal(
    multiIds.filter((id) => id.startsWith("anime:")).length,
    2,
    "多源动漫使用 hash feed id",
  );
  assert.ok(multiIds.includes("events"), "单源漫展仍使用频道 id");
  assert.ok(!multiIds.includes("anime"), "本轮多源同步不再写入裸 anime id");
  const shared = await db
    .prepare("SELECT guid, image_url, content_html FROM news_articles WHERE source_url = ?")
    .bind("https://example.com/story/shared")
    .all<{ guid: string; image_url: string | null; content_html: string }>();
  assert.equal(shared.results.length, 1, "同 source_url 跨 feed 合并为一条");
  assert.equal(shared.results[0]?.guid, "celadon:story-1");
  assert.equal(shared.results[0]?.image_url, "https://cdn.example.com/thick-cover.jpg");
  assert.ok(shared.results[0]?.content_html.includes("thick-cover.jpg"));
  assert.ok(shared.results[0]?.content_html.includes("加厚解读"));

  // Prefer https <img> body over longer caption-only / stripped HTML.
  const mergedImgs = mergeNewsArticlePair(
    {
      id: "a",
      guid: "celadon:x",
      channel: "anime",
      title: "更长的标题给展示",
      source_url: "https://example.com/x",
      content_html:
        "原报道配图 · 来源：Anime! Anime!" + "<p>很长但没有图的旧消毒正文</p>".repeat(20),
      excerpt: "很长但没有图",
      image_url: "https://cdn.example.com/x.jpg",
      published_at: 1,
      first_seen_at: 1,
      updated_at: 1,
    },
    {
      id: "b",
      guid: "urn:sha256:x",
      channel: "anime",
      title: "短",
      source_url: "https://example.com/x",
      content_html:
        '<figure><img src="https://cdn.example.com/body.jpg" alt="" /><figcaption>原报道配图</figcaption></figure><p>短正文</p>',
      excerpt: "短正文",
      image_url: null,
      published_at: 2,
      first_seen_at: 2,
      updated_at: 2,
    },
  );
  assert.ok(mergedImgs.content_html.includes('<img src="https://cdn.example.com/body.jpg"'));
  assert.equal(mergedImgs.image_url, "https://cdn.example.com/x.jpg");
  assert.equal(mergedImgs.guid, "urn:sha256:x", "keeper follows richer body with images");

  const merged = mergeNewsArticlePair(
    {
      id: "a",
      guid: "urn:sha256:y",
      channel: "anime",
      title: "短",
      source_url: "https://example.com/y",
      content_html: "<p>long body here</p>",
      excerpt: "long body here",
      image_url: null,
      published_at: 1,
      first_seen_at: 1,
      updated_at: 1,
    },
    {
      id: "b",
      guid: "celadon:y",
      channel: "anime",
      title: "更长的标题给展示",
      source_url: "https://example.com/y",
      content_html: "<p>short</p>",
      excerpt: "short",
      image_url: "https://cdn.example.com/y.jpg",
      published_at: 2,
      first_seen_at: 2,
      updated_at: 2,
    },
  );
  assert.equal(merged.guid, "urn:sha256:y", "no images: longer body keeps guid");
  assert.equal(merged.image_url, "https://cdn.example.com/y.jpg");
  assert.ok(merged.content_html.includes("long body here"));

  // Prefer-image home ordering fills quota with covers first.
  const preferHome = await readHomeNews(db, multiNow);
  const animeHome = preferHome.items.filter((row) => row.channel === "anime");
  assert.ok(animeHome.some((row) => row.image));

  const collapseAgain = await collapseDuplicateNewsArticles(db, multiNow);
  assert.equal(collapseAgain.collapsed, 0);

  console.log(
    "资讯检查通过：真实本地 D1、GUID、双源合并/source_url 去重、封面/enclosure、无占位优先封面、图片白名单、Markdown、完整正文/过滤、ETag/304、频道周期、分页、失败保留、并发租约、事务回滚和 30 天清理。",
  );
} finally {
  await proxy.dispose();
  await rm(directory, { recursive: true, force: true });
}
