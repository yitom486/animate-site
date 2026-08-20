# 005：为缓存增加容量边界、Single-flight 与规范键

## 元信息

| 字段       | 值                                                                                                  |
| ---------- | --------------------------------------------------------------------------------------------------- |
| 状态       | 第一层+第二层已实施（LRU + single-flight + 规范 key + Cache API/Cache-Control）；KV 层待评估        |
| 优先级     | P1                                                                                                  |
| 类别       | 缓存 / 并发控制 / 内存治理                                                                          |
| 证据置信度 | 高：无界 Map、惰性过期和无 single-flight 可静态确认；生产内存增长、命中率与平台缓存收益需运行时验证 |

## 问题摘要

当前通用缓存用模块级 `Map` 保存条目，只有 TTL，没有最大条目数或总大小限制。过期条目仅在相同 key 再次 `get` 时删除；高基数且不再访问的 key 会继续占用当前进程/Worker isolate 内存。`withCache` 在 miss 后直接执行 fetcher，并发 miss 会分别请求上游，没有 single-flight 合并。

列表缓存键虽然只选取已知参数，但值直接来自原始 `URLSearchParams`，未全面规范化。语义等价的输入可能形成不同 key，降低命中率。应先建立有界 LRU + 在途 Promise + 规范 key，再按运行环境增加 Cache API/`Cache-Control` 分层。

## 当前证据

### 静态确认

1. `start/app/lib/cache.ts:16-17`：每次 `createCache` 创建一个普通 `Map<string, Entry<T>>`，没有容量参数。
2. `start/app/lib/cache.ts:20-30`：过期只在 `get(key)` 命中该 key 时删除；`set` 只覆盖/新增，没有 LRU 淘汰或周期清理。
3. `start/app/lib/cache.ts:35-45`：`withCache` 的 miss 路径立即 `await fetcher()`；没有保存 in-flight Promise，因此同 key 并发 miss 会重复执行 fetcher。
4. `start/app/lib/bangumi/params.ts:128-143`：`listCacheKey` 以固定 key 顺序拼接 `searchParams.get(k) ?? ""`。顺序是稳定的，但多数值保持原始字符串。
5. `start/app/lib/bangumi/params.ts:60-76`：业务解析会把 page 归一到至少 1，并为 type、sort 等提供默认值；缓存键并未完全复用这个规范化结果。
6. `start/app/routes/api/anime.list.ts:10-18`：列表 API 使用模块级 cache + `withCache`，会受到上述并发 miss 行为影响。
7. `start/app/lib/bangumi/server/detail.server.ts:7-8` 和 `start/app/lib/bangumi/server/detail.server.ts:43-61`：详情使用另一个模块级 cache，并手写同样的 get/fetch/set 流程，也没有 single-flight。
8. `start/app/routes/anime/layout.tsx:21-36`：浏览器 clientLoader 也使用相同 `createCache`，说明改造需兼顾浏览器与服务端运行时。
9. `start/app/lib/bangumi/constants.ts:21-23`：已有列表 5 分钟、详情 30 分钟 TTL，可作为新策略输入，但 TTL 本身不是容量限制。

### 需要运行时验证

- 生产环境各 cache 实例的条目数、估算字节数、命中率和淘汰率。
- 查询参数实际基数，尤其 q/tag/year/page 组合。
- 同 key 并发 miss 的频率及上游重复请求量。
- Cloudflare isolate 生命周期、并发模型和 Cache API 可用方式。
- 响应是否适合公开共享缓存，是否包含用户特定或敏感数据。
- 最合适的 maxEntries/maxBytes；不能凭静态代码直接给出最终值。

## 工作原理 / 为什么会慢

TTL 只回答“条目多旧”，不回答“最多能存多少”。如果不断出现新 key，每个条目即使最终过期，也不会自动从 Map 删除，除非再次访问该 key。这样 Map 大小可以随查询多样性增长。

并发 miss 的时序是：

1. 请求 A `get(key)` 未命中。
2. 请求 B 在 A 完成前也 `get(key)` 未命中。
3. A、B 各自调用 fetcher。
4. 两次上游结果分别写入同一 key。

single-flight 会把“当前 key 的 Promise”登记在 in-flight Map 中，B 复用 A 的 Promise，从而把同一时刻的重复上游调用合并为一次。Promise 完成或失败后必须在 `finally` 删除，失败结果通常不应作为成功缓存长期保存。

规范 key 则将业务等价输入映射为同一字符串，例如缺省 page 与 `page=1`、可接受的数字格式、空白查询等。规范化必须与实际业务解析一致，不能错误合并语义不同的请求。

## 影响

- 无界缓存可能使长寿命实例内存增长，严重程度取决于实例寿命和 key 基数。
- 惰性过期会让“过期但不再访问”的条目留存。
- 并发 miss 会放大上游流量、尾延迟和限流风险。
- 原始参数差异会降低缓存命中，并产生更多条目。
- 模块级内存缓存速度快，但不跨 isolate 共享，部署层面的命中率可能低于本地测试。
- 过度激进的淘汰会降低命中率；错误的共享缓存头可能造成数据泄露或陈旧。

## 优化目标

- 每个缓存实例都有显式容量边界和可观测大小。
- 同 key 的并发冷请求至多启动一个共享 fetcher。
- 业务等价列表参数生成相同 key，语义不同参数保持隔离。
- 浏览器内存、Worker 内存和 HTTP/平台缓存各自职责清晰。
- 缓存命中、miss、stale、eviction、in-flight join 可测量。

## 非目标

- 本计划不实施代码。
- 不把 Map 直接替换为 KV 并宣称问题自动解决。
- 不缓存错误响应或用户私有数据，除非另有明确安全设计。
- 不要求所有数据源使用相同 TTL、容量和共享策略。
- 不用缓存掩盖超时、取消和上游错误处理缺失。

## 方案比较

### 方案 A：进程内有界 LRU + single-flight

**做法**：扩展 `createCache`，增加 `maxEntries`（必要时 maxBytes 估算）、访问时更新顺序、写入时淘汰最久未使用项；`withCache` 维护独立 in-flight Promise Map。

**优点**：

- 浏览器和服务端都可复用。
- 命中延迟最低，实现和测试相对可控。
- 明确限制单实例内存，并合并突发并发。

**缺点**：

- 不跨 Worker isolate 共享。
- 按条目数限制不能精确反映大对象内存。
- LRU 更新和指标有少量开销。
- 共享 Promise 的取消语义需要谨慎设计。

### 方案 B：Cloudflare Cache API / `Cache-Control` 分层

**做法**：对可公开缓存的 route/API 响应设置 `Cache-Control`、ETag 或使用 Cache API；浏览器/边缘缓存命中后减少 Worker 和上游调用。

**优点**：

- 可跨请求甚至跨实例复用，更接近部署层缓存。
- 降低 Worker 执行与上游流量。
- 标准 HTTP 语义便于 CDN 和浏览器协作。

**缺点**：

- 只适用于安全的公开响应，key 和 Vary 设计错误风险高。
- 平台环境与本地测试差异大。
- Cache API 本身不自动解决单实例业务对象缓存或所有并发 miss。
- 失效、stale 和错误缓存策略更复杂。

### 方案 C：外部 KV/持久缓存

**做法**：将 JSON 放入 Cloudflare KV 等共享存储。

**优点**：

- 跨 isolate，共享命中。
- 容量和生命周期独立于单个 Worker。

**缺点**：

- 增加网络延迟、费用、序列化和运维复杂度。
- KV 一致性与写入频率需要评估。
- 对当前规模可能过度设计。
- 仍需 single-flight 或锁策略处理并发回源。

## 推荐方案

采用分层策略：

1. **第一层：有界内存 LRU + per-key single-flight + 规范 key**，先修复代码中可静态确认的问题。
2. **第二层：HTTP `Cache-Control` / Cloudflare Cache API**，用于公开、可共享的列表和详情响应，并按数据更新频率设置 stale 策略。
3. 只有在真实指标证明跨实例 miss 成本高且平台缓存不足时，再评估 KV。

建议将“缓存值”和“在途 Promise”分开管理：已完成值受 LRU/TTL 管理；in-flight 在 `finally` 清理，不计入长期容量。取消策略需保证一个等待者离开不会无条件中止仍被其他等待者使用的共享任务。

## 分步骤实施计划（当前不要实施代码）

1. **缓存盘点与指标设计**
   - 列出 list、detail、blog、Comicat、client cache 等实例。
   - 为每类记录 size、hit、miss、expired、evicted、joined、load error。
   - 对 value 只做安全的大小估算，不记录内容。
2. **定义统一配置**
   - `ttlMs`、`maxEntries`，必要时 `estimateSize`/`maxBytes`。
   - 为浏览器列表、服务端列表、详情、RSS 设不同初始值。
   - 初始容量基于流量采样或保守值，后续调优。
3. **实现 LRU 行为**
   - `get` 命中后更新最近使用顺序。
   - `get` 发现过期立即删除并计数。
   - `set` 前/后淘汰过期项和最久未使用项，直到满足边界。
   - 可选低频 sweep，但避免每次操作全表扫描。
4. **实现 single-flight**
   - `withCache` miss 后先查 `inFlight.get(key)`。
   - 无任务才创建 fetcher Promise，并立即登记。
   - 成功才写缓存；失败不写；`finally` 必须删除 in-flight。
   - 防止同步 throw 绕过清理。
5. **设计取消语义**
   - 共享上游任务使用独立 controller。
   - 每个调用方可停止等待；仅当所有订阅者都取消时，才考虑 abort 共享任务。
   - 若先采用简单策略，应明确共享任务不绑定首个请求 signal，并记录资源取舍。
6. **规范列表 key**
   - 基于 `parseListQuery`/`resolveView` 的规范业务值生成 key。
   - 规范 page、默认 type/sort/view、空字符串和允许的枚举。
   - 对 q/tag 是否 trim、大小写是否敏感按实际 API 语义决定，不能擅自合并。
   - 增加 key 版本前缀，未来规则变化可安全隔离。
7. **复用到手写详情缓存**
   - 将 `fetchCachedDetail` 改用支持 single-flight 的统一入口。
   - 确认数据克隆和共享对象修改边界。
8. **增加 HTTP 缓存层**
   - 仅对公开响应设置 `Cache-Control`。
   - 为列表/详情分别设计 `max-age`、`s-maxage`、`stale-while-revalidate`。
   - key 包含所有影响响应的规范参数，验证不会串数据。
9. **压测与调参**
   - 同 key 高并发、不同 key 高基数、过期风暴、大对象混合场景。
   - 观察命中率、淘汰率、内存和上游请求数。
10. **制定降级与清理策略**
    - 内存压力时允许降低容量或跳过缓存写入。
    - 发布 key 规则变化时通过版本前缀自然淘汰旧数据。

## 风险与取舍

- maxEntries 太小会频繁淘汰，太大则内存保护不足。
- LRU 按访问更新会有额外 Map 操作，但通常远低于网络成本，仍需压测。
- single-flight 把调用者绑定到同一结果；若请求上下文会影响响应，key 必须完整。
- 失败后的瞬时重试风暴可能仍存在，可评估短暂 negative backoff，但不应长期缓存错误。
- stale-while-revalidate 提升可用性但会展示旧数据，需标明可接受陈旧窗口。
- 共享 HTTP 缓存若遗漏认证、cookie 或 locale 等维度可能造成严重数据泄露；当前数据看似公开，仍需逐路由审计。

## 验证方法

### 静态验证

- 每个 `createCache` 调用都有明确或默认的容量上限。
- in-flight Promise 在成功和失败路径都通过 `finally` 清理。
- 只有成功结果进入值缓存。
- 规范 key 单元测试覆盖默认值、参数顺序、page、calendar 和空参数。
- HTTP 缓存仅用于审计通过的公开响应。

### 运行时验证

- 发起 50 个同 key 并发 miss，mock fetcher 调用次数应为 1。
- 发起超过 maxEntries 的唯一 key，cache size 不超过边界，LRU 顺序符合预期。
- 写入短 TTL 条目并等待过期，验证访问删除和 sweep 行为。
- 模拟 fetcher reject，所有等待者得到失败，in-flight 清空，下一次可重新加载。
- 在 Cloudflare 预览检查 `Cache-Control`、`Age`/缓存状态和跨请求命中。
- 长时间高基数压测观察堆内存是否趋于稳定。

## 验收标准

- 所有通用内存缓存都有可配置且实际生效的容量上限。
- 过期条目不会只能永久等待同 key 再访问；存在淘汰或低成本清扫机制。
- 同 key 并发冷请求只执行一次 fetcher。
- 失败、超时和取消结果不作为成功值写入缓存。
- 语义等价的列表参数生成相同带版本 key，语义不同参数不冲突。
- 有缓存 hit/miss/eviction/join 指标可用于调参。
- 平台缓存启用前完成公开性和 key 维度审计。

## 依赖 / 前置关系

- 与 `003-bangumi-timeout-and-cancellation.md` 需要联合定义共享 Promise 的取消语义。
- 支撑 `004-anime-real-ssr.md`，避免真实 SSR 的并发冷请求放大上游。
- 支撑 `001-card-viewport-prefetch.md`，但不能替代减少无效预取。
- 与 `002-detail-request-waterfall.md` 的面板拆分共享 per-resource cache 设计。

## 学习要点

- TTL 是新鲜度边界，不是内存容量边界。
- 惰性过期在高基数、低复访场景下不能保证回收。
- single-flight 合并的是同一时间窗口内的重复工作，与长期缓存互补。
- 规范 key 必须来自业务语义，而不是简单排序原始 query string。
- 内存缓存、浏览器缓存、CDN/Cache API 和 KV 位于不同层级，应按延迟、共享范围和一致性分工。
