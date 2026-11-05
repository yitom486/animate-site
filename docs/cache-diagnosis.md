# 缓存诊断与优化

检查日期：2026-11-05（Asia/Shanghai）。用户提供的 **0.16% 是整站请求命中率**，尚未提供统计时间范围、路径分布、状态码分布或现有 Cache Rules 导出。以下线上抽样与代码问题不能单独证明这个百分比的全部成因，也不是上线后的效果数据。

## 线上抽样

对 `https://lowbculture.com` 发起公开 GET 请求；以下资源均重复读取两次，`CF-Ray` 后缀均为 NRT。检查对象都没有 `Set-Cookie`，没有发现 `Cache-Control: no-store`。

| 请求                               | 状态 | Cache-Control                                                  | CF-Cache-Status   |
| ---------------------------------- | ---- | -------------------------------------------------------------- | ----------------- |
| `/`                                | 200  | 未声明                                                         | DYNAMIC           |
| `/assets/root-AGzjjuZh.css`        | 200  | public, max-age=14400, must-revalidate                         | EXPIRED → EXPIRED |
| `/assets/entry.client-FEj619k6.js` | 200  | public, max-age=14400, must-revalidate                         | EXPIRED → EXPIRED |
| `/data/bangumi-data/2026.json`     | 200  | public, max-age=0, must-revalidate                             | DYNAMIC → DYNAMIC |
| `/favicon.ico`                     | 200  | public, max-age=14400, must-revalidate                         | EXPIRED → EXPIRED |
| `/api/anime/card/541336`           | 200  | public, max-age=120, s-maxage=1800, stale-while-revalidate=300 | DYNAMIC → DYNAMIC |

观察：静态文件存在且返回正确内容类型，但重复请求没有观察到外层 CDN HIT。JSON 缺少浏览器新鲜期；公开 API 已声明共享缓存头，说明仅增加响应头并不能证明当前部署已经缓存了完整 HTTP 响应。是否存在 Edge TTL 为 0、规则覆盖、Worker 路由或其他配置，需要实际控制台配置或 Trace 才能确定。

## 缓存分层

1. **静态资源 CDN / 浏览器缓存**：JS、CSS、字体和数据切片，应尽量不经过 Functions。
2. **应用数据缓存**：Worker 进程内 LRU + Cache API，减少 Bangumi/RSS 等上游请求。L1 不跨 isolate；Cache API 不跨数据中心复制，也不支持 Tiered Cache。不能用整站 CDN 命中率推导它们的命中率。[Cache API 官方说明](https://developers.cloudflare.com/workers/runtime-apis/cache/)
3. **完整 HTTP 响应缓存**：缓存整个公开 JSON 响应，甚至跳过 Worker 执行，是另一层能力。本轮没有把所有 SSR、路由 `.data` 或 API 响应一律放入共享 HTTP 缓存。
4. **浏览器 TanStack Query 缓存**：评论分页、条目侧栏和首页详情抽屉在当前浏览器中复用数据、合并并发请求；减少发到本站的请求，与 CDN HIT 是两个指标。

Pages 静态资产已有平台缓存和 Tiered Cache 默认能力，不能照搬普通源站的优化步骤。自定义域名上的缓存规则也可能覆盖 Pages 的预期行为。[Pages 缓存说明](https://developers.cloudflare.com/pages/configuration/serving-pages/)

## 本轮代码修复

- `public/_routes.json`：`/assets/*`、`/data/bangumi-data/*`、`/favicon.ico` 明确排除 Functions。旧适配器会先尝试 `ASSETS.fetch()`，但仍进入函数，并删除 `If-None-Match`；显式排除避免这些路径经过该逻辑。线上最终自动生成的路由尚未取得，不能断言旧部署的排除列表为空。
- `public/_headers`：哈希资源一年 `immutable`；年份 JSON 浏览器 300 秒、共享缓存 3600 秒；favicon 一天。年份 JSON 会原地更新，不能套用一年 immutable。
- `withCache`：等待 Cache API 写入，避免未经 `waitUntil` 管理的悬空写入；修复缓存 `false`、`0`、空字符串无法命中，以及 fetcher 同步抛错后残留 in-flight 的问题。
- `listCacheKey`：结构化编码，防止搜索词中的 `&`、`=` 与字段分隔符碰撞；查询词/标签在实际取数与生成 key 时统一去空白；页码规范为有限正整数。保留类型、页码、搜索词等业务参数。
- 列表、详情、单卡和资讯 API：添加 `X-App-Cache` 诊断。`L1_HIT` 为进程内命中，`L2_HIT` 为 Cache API 命中，`MISS` 为进入取数路径，`COALESCED` 为同 isolate 并发请求合并。它表示该响应生成时的数据缓存状态；如果响应本身被浏览器/CDN 缓存，旧诊断头会随响应重放，不能当作实时统计。
- SSR HTML 与 root loader：显式 `private, no-cache`。它们包含请求 Cookie 决定的主题，不能让一个用户的主题 HTML 被不区分请求地共享给其他用户。
- `bun run check:cache`：无外网回归检查，覆盖过期、并发、取消、重试、边缘写入完成后返回、模拟不同 isolate 的 L2 命中，以及 API 诊断头。
- 工作区同期新增的 `/api/img`：保留图片代理实现，仅修正 Cloudflare `caches.default` 类型声明，并等待图片缓存写入完成。其 `url` 查询参数决定图片内容，不能被忽略或从缓存 key 中删除。

`_headers` 只作用于静态响应，Functions 响应必须在代码里设置；`_routes.json` 的排除规则负责让静态请求真正绕过 Functions。[Headers](https://developers.cloudflare.com/pages/configuration/headers/)、[路由控制](https://developers.cloudflare.com/pages/functions/routing/)

## 对用户贴出的 AI 建议的修正

- “Aggressive 是最高级”不足以证明缓存应该命中；缓存级别不等于资源可缓存、TTL 或规则正确。
- 扩展名字段应使用 `"css"`、`"js"`，不是 `".css"`、`".js"`；本项目用路径前缀规则更清楚。[字段定义](https://developers.cloudflare.com/ruleset-engine/rules-language/fields/reference/http.request.uri.path.extension/)
- 只匹配 `.html/.htm` 抓不到本项目的 `/`、`/anime`、`/anime/123`。这些 SSR 页面又带主题偏好，本轮不建议共享缓存。
- 不要因为 `/api/` 前缀就一律绕过缓存。当前条目、卡片、资讯等是公开数据，但仍须逐端点检查、保留业务参数、不缓存失败响应。
- 不要全站忽略 query，否则 `q`、`type`、`page`、评论 offset、批量 ids 等会串结果。
- 不需要为 Pages 静态资源单独“开启 Tiered Cache”；它也不能让应用的 `cache.put()` 自动变为跨区域缓存。
- 不把 Purge Everything 当成日常优化步骤，它会清空热缓存。只有有证据表明旧对象/旧响应头仍被缓存时，才针对性清理受影响 URL。

## Cloudflare 控制台建议

本轮未修改账号中的规则，也没有清除线上缓存。部署代码后，先查看现有规则的匹配与顺序；如果现有规则把 TTL 压为 0 或覆盖源站策略，应先纠正冲突。

需要显式 Cache Rules 时，建议只对以下静态前缀操作：

| 范围         | 匹配表达式                                                                                     | 建议                                                                              |
| ------------ | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| 内容哈希资源 | `http.host eq "lowbculture.com" and starts_with(http.request.uri.path, "/assets/")`            | Eligible；尊重正确的源站缓存头，或明确设置长 Edge TTL；不要让后续 Bypass 规则覆盖 |
| 年份 JSON    | `http.host eq "lowbculture.com" and starts_with(http.request.uri.path, "/data/bangumi-data/")` | Eligible；Edge TTL 3600 秒；Browser TTL 尊重源站 300 秒；不是 immutable           |

保留默认 query 行为。只有确认某一静态前缀的查询参数完全不参与内容选择时，再考虑该前缀独立忽略 query。

公开 API 的 HTTP 缓存层可在确认流量占比和 Pages 运行方式后进一步设计。当前已有应用 L2 缓存，不能只为了提高一个整站百分比就把所有路径 Cache Everything。后续若使用响应级 Cache API，需要白名单、200 状态检查、错误/部分失败结果策略、规范化 key 和明确的过期时间；Cache API 的 stale-while-revalidate 需要应用主动实现，不能只写一个响应头假设生效。

## TanStack Query 的使用范围

- 根组件为每棵应用树创建独立 QueryClient；浏览器路由切换保留实例，SSR 请求间不共享，服务端不创建缓存 GC 定时器。
- 侧栏与首页抽屉共用条目详情查询，新鲜期 30 分钟；评论分页新鲜期 5 分钟。浏览器中无使用者的查询保留 30 分钟后回收，刷新整页后重新建立内存缓存，不写 localStorage。
- 评论合并接口只提供两个列表的初始页，两个 infinite query 独立累计后续页；初始种子不自动刷新，由分页查询负责刷新，避免挂载时重复请求第一页。
- 窗口重新获得焦点不自动请求；过期后重新挂载或网络恢复仍可更新。网络错误、429 和 5xx 最多自动重试一次，其他 4xx 不自动重试；手动重试不丢已加载列表。
- 所有 queryFn 向同源 fetch 传递 AbortSignal；同一条目共享请求，关闭最后一个使用者时取消未完成请求。HTTP 失败不会当成功 JSON 缓存。
- 保留现有路由 loader 和 Worker L1/L2，不为主页面另做一套取数。验证命令为 `bun run check:queries`。

引入 Query 后仍要部署静态资源配置并核查 CDN。它不会替本站创建 Cloudflare Cache Rules，也不会让 Cache API 的命中自动计入外层 CDN HIT。部署后先按下面步骤核验，再决定是否需要补充控制台规则；现有 Pages 缓存正常时不必重复添加。

## 上线后怎样验收

1. 部署后对同一哈希 CSS/JS、同一年份 JSON 连续 GET，核对 Cache-Control、CF-Cache-Status、Age、ETag；使用同一地点测试。单次 MISS 不是失败；若持续 EXPIRED/DYNAMIC，则用 Cloudflare Trace 检查实际命中的规则。
2. 分开过滤 `/assets/`、`/data/bangumi-data/`、`/api/`、HTML/`.data`，查看各自请求量、缓存状态和状态码。将异常路径、扫描流量和错误响应单独统计；不要为了让错误请求也 HIT 而缓存它们。
3. 公开 API 先看 `X-App-Cache`：同 isolate 第二次应能出现 L1_HIT；模拟冷进程或部署实例时可验证 L2_HIT。DYNAMIC + L2_HIT 代表上游数据被复用，不能解读为完全未缓存。
4. 比较相近流量时段的静态资源命中率、上游请求数、API P50/P95 与错误率；整站请求命中率作为辅助指标。没有完整路径分布前，不承诺从 0.16% 提升到某个固定数字。
5. 若跨地区冷启动仍是主要成本，再评估 KV 作为共享数据层；不要先凭空填写 namespace ID 或改变现有部署资源。

本地预览可以验证路由和响应头，不能证明真实 Cloudflare POP 的 CDN 命中率。真正效果必须在发布后验收。

## 本轮验证记录

- 类型检查、Lint、缓存回归检查及主题检查通过。
- 客户端查询回归检查通过：并发去重、新鲜/过期缓存、请求隔离与取消、HTTP 错误重试策略、初始页复用、两类评论同时翻页、失败后重试、重新打开恢复分页；服务端渲染检查确认评论组件不会额外发起客户端请求。
- 生产构建生成了 `_routes.json` 与 `_headers`。
- Wrangler Pages 本地运行时识别了 3 条静态响应头规则。
- 本地 CSS、年份 JSON、favicon 的 Cache-Control 均符合策略，带 ETag 的条件请求均返回 304。
- 带亮色 / 暗色 Cookie 的 SSR 响应均返回对应主题和 `private, no-cache`。
- 不访问任何上游的空搜索 API 连续请求观察到 `MISS → L1_HIT`。
- 线上部署、Cloudflare 账号规则核查和部署后命中率提升尚未验证。
