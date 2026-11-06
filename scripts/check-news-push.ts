import assert from "node:assert/strict";
import { parseNewsPush, handleNewsPush } from "../app/lib/news/push.server";
const item = {
  channel: "events",
  guid: "push-check",
  title: "Test",
  sourceUrl: "https://example.com/story",
  publishedAt: Date.now(),
  contentMarkdown: "## Heading\n\nFinished news",
  coverUrl: "https://example.com/cover.jpg",
};
const parsed = parseNewsPush({ items: [item, item], batchId: "test" });
assert.equal(parsed.articles.length, 1);
assert.match(parsed.articles[0]!.contentHtml, /<h2>Heading<\/h2>/);
assert.doesNotMatch(
  parseNewsPush({ items: [{ ...item, contentHtml: "<p>Safe</p><script>alert(1)</script>" }] })
    .articles[0]!.contentHtml,
  /script/,
);
for (const body of [
  { items: [] },
  { items: Array(51).fill(item) },
  { items: [{ ...item, channel: "other" }] },
  { items: [{ ...item, sourceUrl: "javascript:alert(1)" }] },
  { items: [{ ...item, coverUrl: "http://example.com/a" }] },
  { items: [{ ...item, publishedAt: "invalid" }] },
])
  assert.throws(() => parseNewsPush(body));
assert.equal(parseNewsPush({ items: [{ ...item, publishedAt: 0 }] }).articles.length, 0);
for (const coverUrl of [null, undefined, ""]) {
  const withMissingCover = parseNewsPush({
    items: [{ ...item, coverUrl: coverUrl as unknown as string }],
  });
  assert.equal(withMissingCover.articles.length, 1);
}
assert.equal(parseNewsPush({ items: [{ ...item, version: 2 }] }).articles[0]!.version, 2);
assert.equal(parseNewsPush({ items: [{ ...item, version: "7" }] }).articles[0]!.version, 7);
assert.throws(() => parseNewsPush({ items: [{ ...item, version: -1 }] }));
assert.throws(() => parseNewsPush({ items: [{ ...item, version: 1.5 }] }));
assert.throws(() => parseNewsPush({ items: [{ ...item, version: "x" }] }));
const env = { NEWS_PUSH_TOKEN: "test-token" } as Parameters<typeof handleNewsPush>[1];
assert.equal(
  (await handleNewsPush(new Request("https://example.com/feeds/push", { method: "POST" }), env))
    .status,
  401,
);
assert.equal(
  (
    await handleNewsPush(
      new Request("https://example.com/feeds/push", {
        method: "POST",
        headers: { Authorization: "Bearer test-token" },
        body: '{"items":[]}',
      }),
      env,
    )
  ).status,
  422,
);
console.log(
  "News push checks passed: validation, HTML sanitization, Markdown, retention, deduplication, version, auth.",
);
