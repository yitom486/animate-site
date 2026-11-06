import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getPlatformProxy } from "wrangler";
import type { D1Database } from "@cloudflare/workers-types";
import {
  decodeJiluMetadata,
  fetchJiluMetadata,
  reserveJiluRequest,
} from "../app/lib/bilibili/metadata.server";

const directory = await mkdtemp(join(tmpdir(), "bilibili-metadata-"));
const proxy = await getPlatformProxy<{ NEWS_DB: D1Database }>({
  configPath: "wrangler.toml",
  persist: { path: directory },
});
const db = proxy.env.NEWS_DB;
const env = {
  NEWS_DB: db,
  JILU_API_KEY: "test-only-key",
  JILU_API_BASE_URL: "https://metadata.example.test/api",
};
const originalFetch = globalThis.fetch;
let requests = 0;
const payload = (mediaId: number, stale = false) => ({
  schemaVersion: 1,
  status: "matched",
  mediaId,
  seasonId: 42,
  title: "正确作品",
  updatedAt: "2026-11-06T17:44:13Z",
  stale,
  episodes: [
    { epId: 123, indexLabel: "特别篇" },
    { epId: 124, indexLabel: "2", title: "第二集" },
  ],
});
let handler = (mediaId: number) => Response.json(payload(mediaId));
globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
  requests++;
  const url = new URL(String(input));
  assert.equal(url.origin, "https://metadata.example.test");
  assert.equal(new Headers(init?.headers).get("Authorization"), "Bearer test-only-key");
  assert.equal(init?.redirect, "manual");
  assert.ok(init?.signal);
  return handler(Number(url.pathname.split("/").at(-1)));
}) as typeof fetch;
try {
  const migration = await readFile("migrations/0005_bilibili_metadata.sql", "utf8");
  await db.batch(
    migration
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => db.prepare(s)),
  );
  const parallel = await Promise.all([
    fetchJiluMetadata(991001, env, "one"),
    fetchJiluMetadata(991001, env, "two"),
  ]);
  assert.equal(requests, 1, "并发同 ID 只访问服务一次");
  assert.equal(parallel[0].body.match?.seasonId, 42, "seasonId 不应使用 mediaId");
  assert.deepEqual(
    parallel[0].body.match?.episodes.map((e) => e.indexLabel),
    ["特别篇", "2"],
  );
  assert.equal(
    new URL(parallel[0].body.match!.episodes[0].embedUrl!).searchParams.get("episodeId"),
    "123",
  );
  assert.ok(!JSON.stringify(parallel[0].body).includes("test-only-key"));
  assert.ok(!JSON.stringify(parallel[0].body).includes("metadata.example.test"));
  assert.ok(
    await db
      .prepare("SELECT media_id FROM bilibili_metadata_cache WHERE media_id = 991001")
      .first(),
  );
  const valid = payload(991002, true);
  assert.equal(decodeJiluMetadata(valid, 991002).stale, true);
  assert.equal(
    decodeJiluMetadata(
      { ...valid, episodes: [{ epId: 123, indexLabel: "1", title: null, badge: null }] },
      991002,
    ).episodes[0].title,
    undefined,
  );
  assert.throws(() => decodeJiluMetadata({ ...valid, mediaId: 1 }, 991002));
  assert.throws(() => decodeJiluMetadata({ ...valid, episodes: [] }, 991002));
  assert.throws(() => decodeJiluMetadata({ ...valid, seasonId: -1 }, 991002));

  handler = () => new Response("secret error", { status: 401 });
  const before401 = requests;
  const unauthorized = await fetchJiluMetadata(991003, env, "401");
  assert.equal(unauthorized.body.status, "unavailable");
  assert.equal(requests, before401 + 1, "401 不自动重试");
  assert.ok(!JSON.stringify(unauthorized).includes("secret error"));
  handler = () => Response.json({ status: "empty" }, { status: 404 });
  assert.equal((await fetchJiluMetadata(991004, env, "404")).body.status, "empty");
  const previous = decodeJiluMetadata(payload(991005), 991005);
  await db
    .prepare("INSERT INTO bilibili_metadata_cache VALUES (?, ?, ?)")
    .bind(991005, JSON.stringify(previous), Date.now() - 7200000)
    .run();
  handler = () => Response.json({ status: "blocked" }, { status: 503 });
  const fallback = await fetchJiluMetadata(991005, env, "stale");
  assert.equal(fallback.httpStatus, 200);
  assert.equal(fallback.body.match?.stale, true);
  assert.equal(fallback.body.match?.updatedAt, previous.updatedAt);
  assert.equal((await fetchJiluMetadata(991006, env, "503")).body.status, "blocked");
  handler = () => new Response(null, { status: 429, headers: { "Retry-After": "120" } });
  assert.equal((await fetchJiluMetadata(991007, env, "429")).body.retryAfterSeconds, 120);
  const beforeCooldown = requests;
  const cooldown = await fetchJiluMetadata(991008, env, "another");
  assert.equal(cooldown.body.status, "rate_limited");
  assert.ok(cooldown.body.retryAfterSeconds! > 60);
  assert.equal(requests, beforeCooldown, "遵守共享的 Retry-After，不继续请求服务");

  await db.prepare("DELETE FROM bilibili_metadata_requests").run();
  const now = Date.now();
  const simultaneous = await Promise.all(
    Array.from({ length: 6 }, () => reserveJiluRequest(db, "same-client", now)),
  );
  assert.equal(simultaneous.filter(Boolean).length, 5, "访客限流原子生效");
  for (let i = 0; i < 45; i++) assert.equal(await reserveJiluRequest(db, `client-${i}`, now), true);
  assert.equal(await reserveJiluRequest(db, "over-global", now), false, "全站滚动一分钟最多 50 次");
  assert.equal(await reserveJiluRequest(db, "next-window", now + 60001), true);
  console.log(
    "集录接入检查通过：鉴权/定向请求、分集顺序、并发缓存、旧缓存、错误脱敏、Retry-After 与 D1 原子限流。",
  );
} finally {
  globalThis.fetch = originalFetch;
  await proxy.dispose();
  await rm(directory, { recursive: true, force: true });
}
