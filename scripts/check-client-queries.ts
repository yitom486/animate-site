import assert from "node:assert/strict";
import { InfiniteQueryObserver, QueryClientProvider, QueryObserver } from "@tanstack/react-query";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { SubjectComments } from "../app/components/subject-comments";
import { ApiQueryError, createQueryClient } from "../app/lib/query-client";
import {
  discussionPagesQuery,
  subjectCommentsQuery,
  subjectDetailQuery,
} from "../app/lib/subject-queries";
import type { SubjectComment } from "../app/lib/bangumi/types-comments";

const originalFetch = globalThis.fetch;
const client = createQueryClient();
client.setDefaultOptions({
  queries: { ...client.getDefaultOptions().queries, retryDelay: 0 },
});
const requests: string[] = [];
let respond: (url: string, signal: AbortSignal) => Promise<Response> = async () =>
  Response.json({ subject: { id: 1 } });
globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
  const url = String(input);
  requests.push(url);
  return respond(url, init!.signal!);
}) as typeof fetch;

try {
  // 同时打开同一条目只发一次请求；返回缓存、其他条目不串数据。
  await Promise.all([
    client.fetchQuery(subjectDetailQuery("1")),
    client.fetchQuery(subjectDetailQuery("1")),
  ]);
  await client.fetchQuery(subjectDetailQuery("1"));
  assert.equal(requests.length, 1);
  await client.fetchQuery(subjectDetailQuery("2"));
  assert.equal(requests.length, 2);
  assert.notDeepEqual(subjectDetailQuery("1").queryKey, subjectDetailQuery("2").queryKey);
  const isolated = createQueryClient();
  assert.equal(isolated.getQueryData(subjectDetailQuery("1").queryKey), undefined);
  isolated.clear();
  client.setQueryData(
    subjectDetailQuery("1").queryKey,
    client.getQueryData(subjectDetailQuery("1").queryKey),
    { updatedAt: 1 },
  );
  await client.fetchQuery(subjectDetailQuery("1"));
  assert.equal(requests.length, 3, "过期数据应重新请求");

  // 关闭最后一个使用者会取消网络请求，不能将旧条目结果写入新条目。
  let signal: AbortSignal | undefined;
  respond = async (_url, nextSignal) => {
    signal = nextSignal;
    return new Promise((_resolve, reject) => {
      nextSignal.addEventListener("abort", () => reject(nextSignal.reason), { once: true });
    });
  };
  const detailObserver = new QueryObserver(client, subjectDetailQuery("cancel"));
  const unsubscribe = detailObserver.subscribe(() => {});
  assert.ok(signal);
  unsubscribe();
  assert.equal(signal.aborted, true);
  assert.equal(client.getQueryData(subjectDetailQuery("cancel").queryKey), undefined);

  // HTTP 错误不会当 JSON 成功缓存；404 不自动重试，503 最多再试一次。
  let attempts = 0;
  respond = async () => {
    attempts++;
    return new Response("missing", { status: 404 });
  };
  await assert.rejects(client.fetchQuery(subjectDetailQuery("404")), ApiQueryError);
  assert.equal(attempts, 1);
  assert.equal(client.getQueryData(subjectDetailQuery("404").queryKey), undefined);
  attempts = 0;
  respond = async () => {
    attempts++;
    return attempts === 1
      ? new Response("busy", { status: 503 })
      : Response.json({ subject: { id: 3 } });
  };
  await client.fetchQuery(subjectDetailQuery("retry"));
  assert.equal(attempts, 2);

  // 合并响应作为初始页，挂载两个分页流时不再请求第一页。
  const comment = (id: number): SubjectComment => ({
    id,
    nickname: "test",
    rate: 0,
    comment: "text",
    date: 0,
  });
  respond = async () =>
    Response.json({ comments: [comment(1)], commentsTotal: 3, reviews: [], reviewsTotal: 0 });
  const initialQuery = subjectCommentsQuery("pages");
  const initial = await client.fetchQuery(initialQuery);
  const commentsOptions = discussionPagesQuery(
    "pages",
    "comments",
    { items: initial.comments, total: initial.commentsTotal },
    Date.now(),
  );
  const reviewOptions = discussionPagesQuery(
    "pages",
    "reviews",
    { items: initial.reviews, total: initial.reviewsTotal },
    Date.now(),
  );
  const comments = new InfiniteQueryObserver(client, commentsOptions);
  const reviews = new InfiniteQueryObserver(client, reviewOptions);
  const requestCount = requests.length;
  const stopComments = comments.subscribe(() => {});
  const stopReviews = reviews.subscribe(() => {});
  assert.equal(requests.length, requestCount);
  assert.equal(reviews.getCurrentResult().hasNextPage, false);

  respond = async (url) => {
    assert.ok(url.endsWith("kind=comments&offset=1"));
    return Response.json({ items: [comment(2)], total: 3 });
  };
  await comments.fetchNextPage();
  assert.deepEqual(comments.getCurrentResult().data?.pageParams, [0, 1]);
  // 分页失败保留已有页，手动重试仍从失败的 offset 继续。
  respond = async () => new Response("missing", { status: 404 });
  await comments.fetchNextPage();
  assert.equal(comments.getCurrentResult().isFetchNextPageError, true);
  assert.deepEqual(comments.getCurrentResult().data?.pageParams, [0, 1]);
  respond = async (url) => {
    assert.ok(url.endsWith("kind=comments&offset=2"));
    return Response.json({ items: [], total: 100 });
  };
  await comments.fetchNextPage();
  assert.equal(comments.getCurrentResult().hasNextPage, false, "即使 total 过时，空页也停止翻页");
  stopComments();
  stopReviews();
  const reopened = new InfiniteQueryObserver(client, commentsOptions);
  const beforeReopen = requests.length;
  const stopReopened = reopened.subscribe(() => {});
  assert.deepEqual(reopened.getCurrentResult().data?.pageParams, [0, 1, 2]);
  assert.equal(requests.length, beforeReopen, "重新打开保留已展开页，无重复请求");
  stopReopened();

  client.setQueryData(initialQuery.queryKey, initial, { updatedAt: 1 });
  const seedObserver = new QueryObserver(client, initialQuery);
  const beforeSeed = requests.length;
  const stopSeed = seedObserver.subscribe(() => {});
  assert.equal(requests.length, beforeSeed, "初始种子不与分页查询重复刷新");
  stopSeed();

  // 两类列表同时翻页，不会像旧的闭包 setData 那样覆盖对方刚加载的数据。
  const review = {
    id: 10,
    nickname: "test",
    entryId: 10,
    title: "review",
    summary: "text",
    replies: 0,
    date: 0,
  };
  const concurrentComments = new InfiniteQueryObserver(
    client,
    discussionPagesQuery("parallel", "comments", { items: [comment(1)], total: 2 }, Date.now()),
  );
  const concurrentReviews = new InfiniteQueryObserver(
    client,
    discussionPagesQuery("parallel", "reviews", { items: [review], total: 2 }, Date.now()),
  );
  const stopParallelComments = concurrentComments.subscribe(() => {});
  const stopParallelReviews = concurrentReviews.subscribe(() => {});
  respond = async (url) =>
    Response.json({
      items: url.includes("kind=comments") ? [comment(2)] : [{ ...review, id: 11 }],
      total: 2,
    });
  await Promise.all([concurrentComments.fetchNextPage(), concurrentReviews.fetchNextPage()]);
  assert.deepEqual(
    concurrentComments
      .getCurrentResult()
      .data?.pages.flatMap((page) => page.items.map((item) => item.id)),
    [1, 2],
  );
  assert.deepEqual(
    concurrentReviews
      .getCurrentResult()
      .data?.pages.flatMap((page) => page.items.map((item) => item.id)),
    [10, 11],
  );
  stopParallelComments();
  stopParallelReviews();

  const beforeSsr = requests.length;
  const renderComments = (id: string) =>
    renderToString(
      createElement(
        QueryClientProvider,
        { client },
        createElement(MemoryRouter, null, createElement(SubjectComments, { id })),
      ),
    );
  assert.ok(renderComments("pages").includes("text"), "组件能渲染缓存中的分页内容");
  assert.ok(renderComments("ssr-cold").includes("评论加载中"));
  assert.equal(requests.length, beforeSsr, "SSR 不额外发起客户端取数");
  console.log(
    "客户端查询检查通过：去重、新鲜/过期缓存、请求隔离、取消、重试、初始页复用与分页恢复。",
  );
} finally {
  globalThis.fetch = originalFetch;
  client.clear();
}
