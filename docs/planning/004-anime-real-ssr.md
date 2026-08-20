# 004：让 Anime 列表获得真实 SSR 数据

## 元信息

| 字段       | 值                                                                                                 |
| ---------- | -------------------------------------------------------------------------------------------------- |
| 状态       | 已实施                                                                                             |
| 优先级     | P1                                                                                                 |
| 类别       | SSR / 首屏渲染 / 路由数据架构                                                                      |
| 证据置信度 | 高：SSR 配置与仅 clientLoader 的路由结构可静态确认；对 LCP、SEO 和服务器成本的实际改善需运行时验证 |

## 问题摘要

项目全局启用了 SSR，但 Anime 布局路由只有 `clientLoader`。该 loader 在浏览器中请求同源 `/api/anime/list`，并设置 `clientLoader.hydrate = true`；路由同时提供只包含导航和列表骨架的 `HydrateFallback`。

因此，SSR 能力虽已开启，Anime 列表的真实数据并没有由该布局的服务端 loader 在初始 HTML 中提供。用户先得到骨架，再等待客户端 JavaScript、hydration、同源 API 请求和上游数据。目标是增加服务端 `loader`，让初始文档带真实列表数据，同时保留客户端导航缓存。

## 当前证据

### 静态确认

1. `start/react-router.config.ts:3-6`：全局配置明确为 `ssr: true`。
2. `start/app/routes.ts:15-19`：`anime` 是父布局路由，`layout.tsx` 承载 `/anime` 及 `/anime/:id`。
3. `start/app/routes/anime/layout.tsx:21-39`：模块只导出 `clientLoader`；它读取浏览器内存缓存，未命中时 fetch 相对地址 `/api/anime/list?...`，并设置 `clientLoader.hydrate = true`。
4. `start/app/routes/anime/layout.tsx:71-79`：hydration fallback 渲染 `SiteNav` 和 `AnimeListSkeleton`，没有真实列表项。
5. `start/app/routes/anime/layout.tsx:82-95`：正式组件依赖 `loaderData.items`、`schedule`、分页和标签等真实数据。
6. `start/app/routes/api/anime.list.ts:10-18`：同源 API 已具备服务端聚合能力，使用进程内缓存和 `fetchAnimeList`。
7. `start/app/lib/bangumi/server/list.server.ts:9-69`：列表服务函数能从 `URLSearchParams` 直接产生完整 `AnimeListResult`，可被路由 server loader 复用，无需在服务端绕回 HTTP API。
8. `start/package.json:6-9`：项目已有 `react-router build` 和 Cloudflare 本地启动脚本，可用于 SSR 构建验证。

### 需要运行时验证

- 当前部署返回的 Anime 初始 HTML 是否确实只含 fallback，以及搜索引擎/禁用 JS 情况下的可见内容。
- 真实列表 SSR 对 TTFB、FCP、LCP、hydration 数据大小和 Worker CPU 的影响。
- React Router 7.17 中 `clientLoader`、`serverLoader`、`hydrate` 在当前路由组合下的精确调用次数。
- Cloudflare Pages 多实例缓存命中率与上游延迟。
- 日历视图和普通列表的 HTML/JSON 体积，确认不会因 SSR 产生不可接受的响应膨胀。

## 工作原理 / 为什么会慢

SSR 配置只表示框架可以在服务端渲染路由，并不自动把客户端 loader 变成服务端数据源。当前初次访问 Anime 路由时，真实数据路径包含：

1. 服务端输出 fallback HTML。
2. 浏览器下载并执行 JavaScript。
3. React Router hydration 运行 `clientLoader`。
4. `clientLoader` 再请求同源 `/api/anime/list`。
5. API loader 访问缓存或外部 Bangumi。
6. JSON 回到浏览器后才渲染真实列表。

这增加了一个 hydration 前置条件和一次浏览器到同源 API 的往返。服务端 loader 可以在生成初始 HTML 前直接调用 `fetchAnimeList`，把真实卡片随 HTML/loader data 送达。代价是 TTFB 会包含列表数据加载时间，因此 timeout、缓存和错误处理必须可靠。

## 影响

潜在现状影响：

- 首屏真实内容依赖 JavaScript 和第二阶段数据请求。
- 骨架到列表的替换可能推迟 LCP，并增加视觉等待。
- 无 JavaScript 或爬虫执行受限时，列表内容可能不可见。
- 同源 API 往返增加请求和序列化成本。

潜在 SSR 代价：

- 冷缓存时服务端 TTFB 可能增加。
- HTML 和 hydration payload 增大。
- 每个初始请求都可能触发上游访问，要求有界缓存和 single-flight。

这些效果方向可推导，但哪一项主导必须通过目标环境测量。

## 优化目标

- 初始 `/anime` 及筛选列表响应包含真实可读内容，而非只有骨架。
- 客户端后续筛选、翻页和返回导航继续复用缓存。
- 服务端与 API 路由共享同一列表服务逻辑，避免服务端通过 HTTP 调自己。
- 避免 hydration 重复请求同一份初始数据。
- 保持日历、搜索参数、分页和详情嵌套路由行为一致。

## 非目标

- 本计划不实施代码。
- 不移除客户端导航或把所有页面变成纯服务端跳转。
- 不承诺 SSR 一定降低 TTFB；它主要改善真实内容的交付路径。
- 不在本项更换部署平台或引入新的持久数据库。
- 不把可选详情面板一并塞入列表 SSR。

## 方案比较

### 方案 A：增加 server `loader`，clientLoader 通过 `serverLoader` 获取数据

**做法**：`layout.tsx` 导出 server loader，直接调用共享列表服务/缓存；clientLoader 先查浏览器缓存，未命中时调用 `serverLoader()`。初始 hydration 默认使用 server loader 数据，不强制 client loader 重跑。

**优点**：

- 初始 HTML 可包含真实列表。
- 客户端导航仍保留本地缓存能力。
- 复用 React Router 数据请求协议，不需要手写 `/api` fetch。
- 能消除初始 hydration 的重复 API 请求。

**缺点**：

- 需理解并测试 `clientLoader.hydrate` 语义。
- server loader 与 API 路由若各自创建模块级缓存，可能存在缓存实例/策略重复。
- TTFB 受上游和缓存影响。

### 方案 B：只增加 server loader，移除 clientLoader

**做法**：所有初始和客户端导航都交给 React Router server loader，依靠 HTTP/服务端缓存。

**优点**：

- 架构最简单，单一数据来源。
- 没有浏览器内存缓存失效和双层一致性问题。

**缺点**：

- 返回已浏览筛选页时仍可能发数据请求。
- 无法实现当前注释所期望的浏览器内快速切页体验。
- 对服务端缓存和网络依赖更强。

### 方案 C：保留 client-only 数据，但优化 API 和骨架

**做法**：维持现状，只加强 `/api/anime/list` 缓存、预连接或 fallback。

**优点**：

- 改动最少，TTFB 不等待列表上游。
- 服务端 HTML 较小。

**缺点**：

- 没有实现“真实 SSR”。
- 真实内容仍依赖 hydration 和额外往返。
- SEO、禁用 JS 和首屏内容问题依旧。

## 推荐方案

推荐 **方案 A：server loader + clientLoader/serverLoader 缓存模式**。

建议语义：

- server `loader({ request })`：解析 URL，生成规范缓存键，调用共享 `withCache/fetchAnimeList`，并传播 `request.signal`。
- `clientLoader({ request, serverLoader })`：浏览器内存命中则返回；未命中调用 `serverLoader()`，成功后写入客户端缓存。
- 初始 hydration：优先使用服务端已序列化数据，移除无必要的 `clientLoader.hydrate = true`，避免 fallback 和重复请求。若框架语义要求保留 hydrate，则必须显式用服务端数据预热客户端缓存并证明不会重复拉取。
- `/api/anime/list`：若还有其他调用者可保留，但应复用同一服务函数和缓存策略；不要让 server loader HTTP 回环调用它。

## 分步骤实施计划（当前不要实施代码）

1. **记录现状基线**
   - 保存 `/anime`、普通列表和搜索视图的初始 HTML。
   - 测量 TTFB、FCP、LCP、请求数、HTML/loader data 大小。
   - 在禁用 JavaScript时检查可见内容。
2. **抽取服务端共享加载函数**
   - 输入为 URL/search params 和 signal，输出 `AnimeListResult`。
   - 统一规范缓存键，避免 route 与 API 各写一套解析逻辑。
   - 保证函数不依赖 `window` 或浏览器相对 URL。
3. **新增布局 server loader**
   - 从 `request.url` 解析参数。
   - 直接调用共享列表加载函数，不 fetch 自己的 `/api`。
   - 传播 `request.signal`，设置明确错误响应。
4. **调整 clientLoader**
   - 保留客户端 `clientCache`。
   - 未命中时使用 `serverLoader()`。
   - 成功后写缓存；取消、超时或失败不得写缓存。
5. **确定 hydration 策略**
   - 验证移除 `clientLoader.hydrate = true` 后，初始页面直接使用 server loader 数据且无二次请求。
   - 若需要预热客户端缓存，设计一次性、安全的注入方式，不在 hydration 重新抓取。
   - 保留 `HydrateFallback` 仅用于确有客户端 hydration loader 的场景；否则评估删除或转为常规 pending UI。
6. **统一 API 路由**
   - 保留 `/api/anime/list` 的兼容性测试。
   - 让它复用同一 service、缓存键和 signal 逻辑。
   - 明确响应 `Cache-Control`，不要仅依赖进程内 Map。
7. **处理错误和降级**
   - 冷缓存上游超时时返回可恢复错误，而非无限 SSR 等待。
   - 若业务接受，可评估 stale-while-revalidate；必须标注陈旧时间。
8. **测试嵌套路由**
   - `/anime`、`/anime/:id`、翻页、筛选、浏览器前进后退。
   - 确认父 loader 不因只切换详情 ID 而无意义重载，继续遵守 `shouldRevalidate`。
9. **部署环境验证**
   - 使用 Cloudflare 预览而非仅本地 dev。
   - 对比冷/热缓存和不同地区结果。

## 风险与取舍

- SSR 把数据等待移到 TTFB；如果上游慢且无缓存，可能从“早到骨架、晚到内容”变成“文档整体晚到”。
- 服务端渲染 42 张卡片会增加 HTML 和 hydration 成本，应测量而非假定收益。
- 浏览器缓存、Worker 内存缓存、平台缓存多层并存时，失效策略更复杂。
- `shouldRevalidate` 若配置不当，可能在详情子路由切换时重复加载父列表。
- 初始服务端数据与 hydration 的客户端 key 必须规范一致，否则会立即 miss。
- Cloudflare isolate 并不保证模块级 Map 全局共享，不能把本地热缓存结果外推到生产。

## 验证方法

### 静态验证

- `layout.tsx` 同时存在 server loader 和按预期工作的 clientLoader。
- server loader 不使用相对 `/api` fetch，而是调用共享服务函数。
- `request.signal` 被下传。
- 初始 hydration 路径没有强制重复调用 clientLoader。
- API 和 route 使用相同参数解析、缓存键和返回类型。

### 运行时验证

- `curl` 或查看页面源代码：初始 HTML/序列化数据中可找到实际条目标题。
- 禁用 JavaScript：列表主要内容仍可读，链接可用。
- DevTools Network：初始 hydration 不再额外请求 `/api/anime/list` 或重复 route data。
- 测量冷/热缓存 TTFB、FCP、LCP、HTML 大小和 hydration 时间。
- 客户端翻页后返回：确认命中 client cache，并验证数据新鲜度策略。
- Cloudflare 预览环境检查响应头、流式行为和错误状态。

## 验收标准

- SSR 保持启用，初始 Anime HTML 包含真实列表或日历内容。
- 首次 hydration 不重复请求同一份列表数据。
- 客户端筛选和翻页继续无整页刷新，并能使用客户端缓存。
- server loader 与 API 不存在 HTTP 回环和重复业务实现。
- 上游超时有明确上限，取消信号可传播。
- 禁用 JavaScript 时主要列表内容和详情链接可访问。
- 性能报告同时给出 TTFB 与 LCP/真实内容时间，不以单一指标夸大收益。

## 依赖 / 前置关系

- 建议先完成或同步设计 `003-bangumi-timeout-and-cancellation.md`，防止 SSR 被无截止时间的上游拖住。
- 建议结合 `005-cache-bounds-and-single-flight.md`，控制 SSR 并发和内存。
- `001-card-viewport-prefetch.md` 独立可先实施；真实 SSR 后仍需控制详情预取。
- 不依赖 `002-detail-request-waterfall.md`，但访问 `/anime/:id` 时详情 loader 的关键路径仍需单独优化。

## 学习要点

- 打开框架 SSR 配置不等于每个路由的数据都在服务端加载。
- clientLoader + hydrate fallback 常用于客户端数据准备，但会让真实内容依赖 JavaScript。
- server loader 改善真实内容交付，同时可能增加 TTFB；应成对观察指标。
- `serverLoader()` 是客户端导航复用服务端路由协议的边界，通常优于手写同源 API 回环。
- 多层缓存必须共享规范 key 和新鲜度语义，否则会出现重复请求或难以解释的数据陈旧。
