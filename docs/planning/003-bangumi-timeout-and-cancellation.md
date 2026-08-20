# 003：统一 Bangumi 请求超时与取消传播

## 元信息

| 字段       | 值                                                                                        |
| ---------- | ----------------------------------------------------------------------------------------- |
| 状态       | 已实施                                                                                    |
| 优先级     | P0                                                                                        |
| 类别       | 可靠性 / 网络边界 / 资源治理                                                              |
| 证据置信度 | 高：Bangumi 三类基础 fetch 未传 signal 可静态确认；生产环境挂起时长和错误占比需运行时验证 |

## 问题摘要

Bangumi 基础客户端的 GET、Legacy GET 和 POST 三类请求没有设置 `signal`，调用链也没有接收路由 `request.signal`。这意味着客户端离开页面、导航被替换或服务端请求被取消时，底层上游请求可能继续运行；上游迟迟不返回时，也缺少应用层明确截止时间。

项目中的 RSS、Bilibili、Comicat 和新闻请求多数已使用 `AbortSignal.timeout(...)`，但做法分散，且仅有超时信号，没有与调用方取消信号统一组合。应建立一致的超时、取消和错误分类策略。

## 当前证据

### 静态确认

1. `start/app/lib/bangumi/server/client.server.ts:12-26`：`bgmGet` 的 `fetch` 仅传入 headers，没有 `signal`。
2. `start/app/lib/bangumi/server/client.server.ts:29-34`：`bgmGetLegacy` 同样只有 headers。
3. `start/app/lib/bangumi/server/client.server.ts:37-59`：`bgmPost` 传 method、headers、body，但没有 `signal`。
4. `start/app/lib/bangumi/server/detail.server.ts:10-27`：详情 subject、persons、episodes 调用上述 `bgmGet`，函数签名未接收 signal。
5. `start/app/routes/anime/detail.tsx:47-51`：路由 loader 只解构 `params`，没有读取和下传 `request.signal`。
6. `start/app/routes/api/anime.list.ts:13-18`：列表 API 虽接收 `request`，但只读取 URL，未向 `fetchAnimeList` 传播 signal。
7. `start/app/lib/bangumi/server/blog/rss.server.ts:18-24`：Bangumi RSS 使用 10 秒 `AbortSignal.timeout`。
8. `start/app/lib/bangumi/server/blog/list.server.ts:5` 和 `start/app/lib/bangumi/server/blog/list.server.ts:97-105`、`start/app/lib/bangumi/server/blog/detail.server.ts:6` 和 `start/app/lib/bangumi/server/blog/detail.server.ts:121-133`：其他 Bangumi 网页抓取也有 10 秒 timeout。
9. `start/app/lib/bilibili/search.ts:27-46`：Bilibili 搜索使用 4 秒 timeout。
10. `start/app/lib/comicat/fetch-rss.ts:20-26`：Comicat fetch 使用配置化 timeout。

### 需要运行时验证

- Cloudflare Pages/Workers 目标运行时对 `AbortSignal.timeout`、`AbortSignal.any` 及 abort reason 的实际支持。
- 导航取消时 React Router 是否及时触发每个 loader 的 `request.signal`，以及服务端断连信号传播行为。
- Bangumi 各接口合理的 P95/P99 延迟，据此确定 timeout，而不是随意复制 10 秒。
- timeout、用户取消、上游 4xx/5xx、解析错误目前各占多少。
- 上游 fetch 被 abort 后是否真正释放连接和 Worker 执行资源；不同运行时可能存在差异。

## 工作原理 / 为什么会慢

`fetch` 默认没有业务截止时间。若网络连接建立后长时间无响应，Promise 可能持续等待到运行时或基础设施的更长超时。上层 `Promise.all` 会被其中最慢的请求拖住。

取消传播解决另一类浪费：当用户开始新的导航时，旧 loader 的结果已无用。React Router 提供的 `request.signal` 可以表达这一事实，但只有一路传到底层 `fetch` 才有效。若中间函数不接收 signal，旧请求仍可能占用连接、上游配额和 CPU。

统一信号通常需要组合两个来源：

- **调用方取消**：`request.signal`，表示结果不再需要。
- **本地截止时间**：`AbortSignal.timeout(ms)`，表示上游超过预算。

组合后还必须区分原因。用户取消通常不应记录为服务故障；超时应进入可靠性指标；HTTP 4xx/5xx、网络错误和 JSON 解析错误也应分别处理。

## 影响

- 慢 Bangumi 请求可能拖长详情、列表、SSR 或预取响应。
- 已失效导航仍可能继续访问上游，浪费资源并放大限流。
- 错误全部抛为通用 `Response` 时，监控难以区分 timeout、abort 与 HTTP 错误。
- 不一致的 timeout 数值会让不同数据源表现不可预测。
- 太短的 timeout 会增加误失败；太长则无法有效保护尾延迟。

静态代码只能证明缺少应用层 signal，不能证明生产中已经发生特定数量的挂起或资源泄漏。

## 优化目标

- 所有 Bangumi 外部 fetch 都有明确、可配置的时间预算。
- 路由 `request.signal` 能传播到基础客户端和底层 fetch。
- 统一区分 `aborted`、`timeout`、`http`、`network`、`parse` 等错误。
- 用户取消不污染错误率，超时与真实上游错误可观测。
- 对关键数据和可选数据使用不同预算，并避免无依据的一刀切。

## 非目标

- 本计划不实施代码。
- 不自动重试所有请求；重试可能放大压力，尤其是 POST。
- 不保证 abort 一定让远端服务器停止处理，目标是尽快停止本端等待和后续工作。
- 不在本项重构缓存容量或详情 UI。
- 不把所有异常静默转换为空数据。

## 方案比较

### 方案 A：每个 fetch 直接使用 `AbortSignal.timeout`

**做法**：像现有 RSS 一样，在 `bgmGet`、`bgmGetLegacy`、`bgmPost` 内写固定 timeout。

**优点**：

- 实现简单，立刻避免无限等待。
- 与项目已有代码一致。

**缺点**：

- 无法响应路由取消。
- 固定值难以适配列表、详情、日志等不同预算。
- 分散实现容易继续出现不一致。
- timeout 与上层 signal 冲突时没有组合策略。

### 方案 B：基础客户端接收 signal，并统一组合 timeout

**做法**：为客户端方法增加 options，例如 `{ signal, timeoutMs }`；用 `AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)])` 或兼容性 helper 合并信号。

**优点**：

- 同时覆盖调用方取消和超时。
- 集中设置默认值、错误转换和指标。
- 可按请求类别覆盖预算。

**缺点**：

- 需要贯穿多个函数签名和调用点。
- 必须验证 `AbortSignal.any` 的目标运行时兼容性，或维护手动组合 helper。
- abort reason 在不同环境的细节需要归一化。

### 方案 C：只在 route loader 外层做超时竞赛

**做法**：用 `Promise.race` 给整个 loader 设置总超时。

**优点**：

- 调用点改动少。
- 可以限制整条路由的等待预算。

**缺点**：

- 竞赛失败并不会自动取消底层 fetch，容易产生后台悬挂工作。
- 无法知道具体哪一个上游超时。
- 不适合作为唯一方案；最多只能补充总预算。

## 推荐方案

采用 **方案 B**，并可在路由层增加总预算作为补充，但不使用裸 `Promise.race` 代替底层取消。

建议建立一个共享 helper：

- 接收可选调用方 signal 和 timeoutMs。
- 在支持时组合信号；否则用 `AbortController` 转发调用方 abort 并设置/清理定时器。
- 保留可判别的 abort 原因。
- 在基础客户端统一把错误归一化为带 `kind`、`upstream`、`operation`、`status` 的错误。

默认预算应由测量得出；初始值可以参考现有 4 秒和 10 秒，但不能未经验证直接视为最终 SLA。

## 分步骤实施计划（当前不要实施代码）

1. **盘点请求入口**
   - 列出所有 Bangumi API、Legacy API、网页和 RSS fetch。
   - 标注调用它们的 route loader、缓存层和是否关键数据。
2. **定义请求 options**
   - 设计统一类型，如 `UpstreamRequestOptions { signal?: AbortSignal; timeoutMs?: number }`。
   - 避免把完整 `Request` 传入底层库，降低与框架耦合。
3. **实现信号组合 helper**
   - 优先评估 `AbortSignal.any`。
   - 若需兼容实现，确保调用方已 aborted 时立即 abort，并在结束后移除监听器、清理 timer。
   - 明确“调用方取消优先于 timeout”或按 reason 判断的规则。
4. **定义错误模型**
   - `aborted`：用户导航/客户端断开，不计上游失败。
   - `timeout`：超过应用预算，应计入上游可靠性。
   - `http`：保留 status 和安全的 endpoint 标识。
   - `network` / `parse`：分别记录，不泄露敏感 URL 参数。
5. **改造 Bangumi 基础客户端**
   - 给 `bgmGet`、`bgmGetLegacy`、`bgmPost` 增加 options。
   - 三类方法都把组合 signal 传给 `fetch`。
   - 在 response body 解析阶段也保留取消语义。
6. **沿调用链传播**
   - `fetchSubjectDetail`、`fetchSubjectPersons`、`fetchSubjectEpisodes` 等接收 options。
   - `fetchCachedDetail`、列表聚合函数继续下传。
   - route loader 从 `request.signal` 取值，传入服务函数。
7. **处理缓存与取消交互**
   - 取消的请求不得写入缓存。
   - single-flight 不能简单绑定第一个等待者的 signal，否则一个调用方取消可能误杀其他仍需结果的等待者；需设计共享任务与订阅者语义。
8. **统一其他数据源**
   - 将 RSS、Bilibili、Comicat 的独立 timeout 逐步迁移到同一 helper。
   - 保留各上游不同 timeout 配置，不强迫同值。
9. **加入可观测性**
   - 记录 operation、duration、cache status、error kind，不记录用户敏感查询全文。
   - 对 abort 使用 debug/计数指标，对 timeout 使用 warning/可靠性指标。
10. **补充测试**
    - fake timer 测 timeout。
    - 主动 abort 测 request signal。
    - 测 HTTP 500、网络拒绝、无效 JSON 的分类。

## 风险与取舍

- 预算过短会把可恢复的慢响应误判为失败，需以 P95/P99 和产品容忍度校准。
- 共享 single-flight 与每个调用方 signal 的语义复杂，实施顺序需和缓存计划协调。
- `AbortSignal.any`、`TimeoutError`/`AbortError` 名称和 reason 可能存在运行时差异，不能只按字符串脆弱判断。
- 关键请求失败通常应让路由明确失败，可选请求则应局部降级；统一错误类型不等于统一 UI 策略。
- 自动重试会增加尾延迟和上游压力，应仅用于幂等请求，并采用有限次数、退避和剩余预算。

## 验证方法

### 静态验证

- 搜索所有 Bangumi `fetch(`，确认均传入组合后的 signal。
- 从 route loader 逐层检查 `request.signal` 没有在中间丢失。
- 确认 timeout/abort 路径不会执行缓存 `set`。
- 确认错误日志不包含完整敏感查询或堆栈泄露到客户端。

### 运行时验证

- 使用 mock server 提供立即响应、延迟响应、永不响应、500、断连、无效 JSON。
- 在延迟请求期间触发新导航，确认旧请求尽快 abort，且不显示为用户可见错误。
- 将响应延迟设为 timeout 前后边界，验证计时和分类。
- 在 Cloudflare 预览环境验证 signal API 和断连行为。
- 采集一段真实流量后比较 timeout 率、aborted 数、loader P95 和上游并发。

## 验收标准

- `bgmGet`、`bgmGetLegacy`、`bgmPost` 都支持调用方 signal 和可配置 timeout。
- 所有 route 到 Bangumi fetch 的关键调用链均传播 `request.signal`。
- 永不响应的 mock 在预算内结束，主动取消能早于 timeout 结束。
- timeout、用户取消、HTTP 错误、网络错误和解析错误可被稳定区分。
- 被取消或超时的请求不会写入成功缓存。
- 可选数据超时只影响对应面板；关键数据超时显示明确、可恢复的路由错误。
- 生产 timeout 数值在采样数据后确认并记录依据。

## 依赖 / 前置关系

- 建议先于 `002-detail-request-waterfall.md` 的面板拆分完成接口设计，使新请求天然支持取消。
- 与 `005-cache-bounds-and-single-flight.md` 存在共享任务取消语义依赖，需要联合设计。
- 能增强 `001-card-viewport-prefetch.md`：用户意图消失后，预取可真正停止。
- 不依赖 `004-anime-real-ssr.md`，但 SSR loader 上线前完成可降低服务端挂起风险。

## 学习要点

- 超时和取消是两个不同信号：一个表示“太慢”，一个表示“结果已无用”。
- `Promise.race` 只停止等待，不会自动停止底层 I/O。
- 取消能力必须端到端传播，任何一层丢弃 signal 都会使其失效。
- 错误分类决定可观测性：用户取消不应被统计成上游故障。
- single-flight 与取消结合时需要区分“取消一个等待者”和“取消共享上游任务”。
