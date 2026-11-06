import assert from "node:assert/strict";
import { buildBilibiliEmbedUrl, parseBilibiliMediaId } from "../app/lib/bilibili/player";
import { matchBilibiliBangumi, resolveBilibiliMedia } from "../app/lib/bilibili/search";

const embed = new URL(buildBilibiliEmbedUrl({ episodeId: 68540, seasonId: 1565 }));
assert.equal(embed.origin, "https://player.bilibili.com");
assert.deepEqual(Object.fromEntries(embed.searchParams), {
  episodeId: "68540",
  seasonId: "1565",
  autoplay: "0",
  danmaku: "0",
});
assert.equal(parseBilibiliMediaId("1565"), 1565);
assert.equal(parseBilibiliMediaId("https://www.bilibili.com/bangumi/media/md1565"), 1565);
for (const invalid of [
  "0",
  "-1",
  "NaN",
  "1.5",
  "9007199254740992",
  "https://example.com/bangumi/media/md1565",
  "https://www.bilibili.com/bangumi/play/ss1565",
]) {
  assert.equal(parseBilibiliMediaId(invalid), undefined);
}

const originalFetch = globalThis.fetch;
const requests: URL[] = [];
let respond = (_url: URL): Response => Response.json({ code: -412 });
globalThis.fetch = (async (input: string | URL | Request) => {
  const url = new URL(String(input));
  requests.push(url);
  return respond(url);
}) as typeof fetch;

try {
  // mediaId 和 seasonId 不相等；只有 episodeId 也能生成番剧 iframe。
  respond = (url) =>
    url.pathname === "/pgc/review/user"
      ? Response.json({ code: 0, result: { media: { season_id: 42, title: "准确作品" } } })
      : Response.json({ code: 0, result: { episodes: [{ id: 68540, title: "1" }] } });
  const results = await Promise.all([resolveBilibiliMedia(1565), resolveBilibiliMedia(1565)]);
  assert.equal(requests.length, 2, "并发查同一 mediaId 只请求一轮资料");
  assert.ok(requests.every((url) => !url.pathname.includes("search")));
  assert.equal(requests[0].searchParams.get("media_id"), "1565");
  assert.equal(requests[1].searchParams.get("season_id"), "42");
  assert.equal(results[0].match?.title, "准确作品");
  assert.equal(
    new URL(results[0].match!.episodes[0].embedUrl!).searchParams.get("episodeId"),
    "68540",
  );
  await resolveBilibiliMedia(1565);
  assert.equal(requests.length, 2, "成功结果复用缓存");

  // 分集接口被拦截时报告风控，不能当作已匹配或换成另一部作品。
  requests.length = 0;
  respond = (url) =>
    url.pathname === "/pgc/review/user"
      ? Response.json({ code: 0, result: { media: { season_id: 43, title: "另一部" } } })
      : Response.json({ code: -412 });
  assert.deepEqual(await resolveBilibiliMedia(1566), { match: null, status: "blocked" });
  assert.equal(requests.length, 2);
  await resolveBilibiliMedia(1566);
  assert.equal(requests.length, 4, "临时风控不进入成功缓存");

  requests.length = 0;
  respond = () => new Response("rate limited", { status: 429 });
  assert.deepEqual(await resolveBilibiliMedia(1567), { match: null, status: "blocked" });
  assert.equal(requests.length, 1, "精确 ID 查询失败后不再回退搜索");
  respond = () => {
    throw new TypeError("network failed");
  };
  assert.deepEqual(await resolveBilibiliMedia(1568), { match: null, status: "unavailable" });

  // 搜索的第一个结果可能属于另一个季度，不能仅因有 seasonId 就播放它。
  respond = () =>
    Response.json({
      code: 0,
      data: { result: [{ season_id: 41510, title: "攻壳机动队 2045 第二季" }] },
    });
  assert.deepEqual(await matchBilibiliBangumi(["攻壳机动队 S.A.C. 2nd GIG"]), {
    match: null,
    status: "empty",
  });
  respond = (url) =>
    url.pathname.includes("search")
      ? Response.json({
          code: 0,
          data: { result: [{ season_id: 1565, title: "<em>攻壳机动队</em> S.A.C. 2nd GIG" }] },
        })
      : Response.json({ code: 0, result: { episodes: [{ id: 68540, title: "1" }] } });
  assert.equal((await matchBilibiliBangumi(["攻壳机动队 S.A.C. 2nd GIG"])).match?.seasonId, 1565);
  console.log(
    "Bilibili: official OGV parameters, exact media lookup, cache, failure handling and title matching passed.",
  );
} finally {
  globalThis.fetch = originalFetch;
}
