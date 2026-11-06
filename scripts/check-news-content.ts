import assert from "node:assert/strict";
import { renderNewsContent } from "../app/lib/news/content.server";
import { prepareNewsContent, sanitizeNewsHtml, parseNewsRss } from "../app/lib/news/parse.server";
import { parseNewsPush } from "../app/lib/news/push.server";
import { parseNewsIframeUrl } from "../app/lib/news/video";

const youtube = "https://www.youtube-nocookie.com/embed/M7lc1UVf-VE";
const bilibili = "https://player.bilibili.com/player.html?bvid=BV1B7411m7LV&autoplay=0";
const iframe = (src: string, attrs = "") =>
  `<iframe src="${src}" title="官方预告" loading="lazy" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin" ${attrs}></iframe>`;
for (const src of [
  youtube,
  bilibili,
  "https://player.bilibili.com/player.html?aid=123&cid=456",
  "https://player.bilibili.com/player.html?episodeId=68540&seasonId=1565",
]) {
  assert.ok(parseNewsIframeUrl(src), src);
  const safe = sanitizeNewsHtml(
    iframe(src, 'onclick="bad()" onload="bad()" srcdoc="bad" style="width:5000px"'),
  );
  assert.equal((safe.match(/<iframe /g) ?? []).length, 1);
  assert.ok(safe.includes('class="news-official-player"'));
  assert.ok(safe.includes('title="官方预告"'));
  assert.ok(safe.includes('loading="lazy"'));
  assert.ok(safe.includes("allowfullscreen"));
  assert.ok(safe.includes('referrerpolicy="strict-origin-when-cross-origin"'));
  assert.ok(!/onclick|onload|srcdoc|style=/.test(safe));
  assert.equal(sanitizeNewsHtml(safe), safe, "重复入库/读取不删除受控播放器");
}
for (const src of [
  "https://www.youtube-nocookie.com.evil.test/embed/M7lc1UVf-VE",
  "https://www.youtube-nocookie.com@evil.test/embed/M7lc1UVf-VE",
  "https://user@www.youtube-nocookie.com/embed/M7lc1UVf-VE",
  "http://www.youtube-nocookie.com/embed/M7lc1UVf-VE",
  "//www.youtube-nocookie.com/embed/M7lc1UVf-VE",
  "https://www.youtube-nocookie.com:8443/embed/M7lc1UVf-VE",
  "https://www.youtube-nocookie.com/watch?v=M7lc1UVf-VE",
  "https://www.youtube.com/embed/M7lc1UVf-VE",
  "https://www.youtube-nocookie.com/embed/bad",
  "https://player.bilibili.com/other.html?bvid=BV1B7411m7LV",
  "https://player.bilibili.com/player.html?seasonId=1565",
  "https://evil.test/?next=https://player.bilibili.com/player.html",
  "javascript:alert(1)",
  "data:text/html,bad",
]) {
  assert.equal(parseNewsIframeUrl(src), null, src);
  assert.ok(!sanitizeNewsHtml(iframe(src)).includes("iframe"), src);
}
const restricted = sanitizeNewsHtml(
  `<iframe src="${youtube}" allow="camera; microphone; geolocation; fullscreen" referrerpolicy="no-referrer"></iframe>`,
);
assert.ok(restricted.includes('allow="fullscreen"'));
assert.ok(restricted.includes('referrerpolicy="strict-origin-when-cross-origin"'));

const markdown = `> 这是上游已经完成的摘要导读。\n\n## 资讯正文\n\n<span>预告</span> **已公开**，~~旧日期~~，行内代码 \`code\`。\n\n1. 有序列表\n\n- 无序列表\n\n| 项目 | 信息 |\n| --- | --- |\n| 时间 | 今日 |\n\n<figure><img src="https://cdn.example.com/story.jpg" alt="官方配图"><figcaption>配图说明 © 制作委员会</figcaption></figure>\n\n${iframe(youtube)}\n\n[到 YouTube 观看](https://www.youtube.com/watch?v=M7lc1UVf-VE)\n\n${iframe(bilibili)}\n\n[到 B 站观看](https://www.bilibili.com/video/BV1B7411m7LV)\n\n\`\`\`html\n${iframe(youtube)}\n\`\`\``;
const stored = prepareNewsContent(markdown);
assert.ok(stored.startsWith("<blockquote>"));
assert.ok(stored.includes("<h2>资讯正文</h2>"));
assert.ok(stored.includes("<strong>已公开</strong>"));
assert.ok(stored.includes("<del>旧日期</del>"));
assert.ok(stored.includes("<code>code</code>"));
assert.ok(stored.includes("<ol>"));
assert.ok(stored.includes("<ul>"));
assert.ok(stored.includes("<table>"));
assert.ok(stored.includes("<figcaption>配图说明 © 制作委员会</figcaption>"));
assert.equal((stored.match(/<img /g) ?? []).length, 1, "不追加重复配图");
assert.equal((stored.match(/<iframe /g) ?? []).length, 2, "代码示例中的 iframe 不执行");
assert.ok(stored.includes("&lt;iframe"));
assert.ok(stored.includes("到 YouTube 观看"));
assert.ok(stored.includes("到 B 站观看"));
assert.equal(renderNewsContent(stored), stored, "详情只渲染成品，不重新组织正文");
assert.equal(prepareNewsContent("<p>已有 HTML</p><h2>标题</h2>"), "<p>已有 HTML</p><h2>标题</h2>");
assert.ok(prepareNewsContent("https://youtu.be/M7lc1UVf-VE").includes("<a href="));
assert.ok(!renderNewsContent("https://youtu.be/M7lc1UVf-VE").includes("iframe"));
assert.ok(
  !sanitizeNewsHtml('<script>bad()</script><a href="javascript:bad()">bad</a>').includes("script"),
);
assert.ok(
  !sanitizeNewsHtml(
    '<a href="https://evil.test/?youtube.com" class="news-video-link">链接</a>',
  ).includes("news-video-link"),
);

const now = Date.UTC(2026, 10, 7);
const base = {
  channel: "anime",
  guid: "markdown-video-check",
  title: "成品资讯",
  sourceUrl: "https://example.com/news/1",
  publishedAt: now,
};
const pushed = parseNewsPush({ items: [{ ...base, contentMarkdown: markdown, version: 3 }] }, now)
  .articles[0];
assert.equal(pushed.contentHtml, stored);
assert.equal(pushed.version, 3);
const htmlAlternative = parseNewsPush(
  { items: [{ ...base, contentHtml: stored, contentMarkdown: "不要重复展示这段" }] },
  now,
).articles[0];
assert.equal(htmlAlternative.contentHtml, stored);

const rss = (version: string, rootAttrs = "") =>
  `<rss version="2.0" ${rootAttrs}><channel><item><guid>contract-rss</guid><title>成品</title><link>https://example.com/news/1</link><pubDate>${new Date(now).toUTCString()}</pubDate><description><![CDATA[${markdown}]]></description>${version}</item></channel></rss>`;
assert.equal(
  parseNewsRss(rss('<news:version xmlns:news="urn:anime-rss:news:1">3</news:version>'), "anime")[0]
    .version,
  3,
);
assert.equal(
  parseNewsRss(
    rss("<news:version>0</news:version>", 'xmlns:news="urn:anime-rss:news:1"'),
    "anime",
  )[0].version,
  0,
);
assert.equal(
  parseNewsRss(rss('<v:version xmlns:v="urn:anime-rss:news:1">4</v:version>'), "anime")[0].version,
  4,
);
assert.equal(
  parseNewsRss(rss('<news:version xmlns:news="urn:wrong">5</news:version>'), "anime")[0].version,
  undefined,
);
assert.equal(parseNewsRss(rss(""), "anime")[0].version, undefined);
for (const invalid of ["-1", "1.5", "1e3", "9007199254740992", ""]) {
  assert.throws(() =>
    parseNewsRss(
      rss(`<news:version xmlns:news="urn:anime-rss:news:1">${invalid}</news:version>`),
      "anime",
    ),
  );
}
assert.equal(
  parseNewsRss(rss('<news:version xmlns:news="urn:anime-rss:news:1">3</news:version>'), "anime")[0]
    .contentHtml,
  stored,
);

console.log(
  "资讯正文契约通过：GFM/导读/图注、双平台 iframe 白名单与重复清洗、成品二选一、RSS 命名空间版本解析。",
);
