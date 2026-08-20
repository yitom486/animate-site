# 017 Cloudflare 环境变量读取

## 元信息

| 字段       | 值                                                                                   |
| ---------- | ------------------------------------------------------------------------------------ |
| 状态       | 待实施                                                                               |
| 优先级     | P1                                                                                   |
| 类别       | Cloudflare 部署 / 配置注入 / 可测试性                                                |
| 证据置信度 | 中高（当前读取方式与入口已静态确认）；生产兼容性风险需实际部署验证，不能断言必然失效 |

## 问题摘要

`RSSHUB_BASE` 在模块加载时通过 `process.env` 读取。项目启用了 Cloudflare 的 `nodejs_compat`，这可能让部分 Node API 可用，但 Cloudflare Pages/Workers 的正式绑定通常通过请求上下文中的 `env` 提供。模块级常量还会把配置固定在模块初始化时，使按请求注入、测试隔离和多环境验证更困难。

应优先把 Cloudflare `context.env` 通过 React Router `loadContext` 传入 loader，再以参数方式传到资讯抓取函数，并保留本地开发的明确回退。当前代码不等于“生产必然失效”；实际 Pages 环境中 `process.env.RSSHUB_BASE` 的行为必须部署验证。

## 当前证据

### 已静态确认

- `start/app/lib/news/constants.ts:7-13`：`RSSHUB_BASE` 是模块级导出，优先读取 `process.env?.RSSHUB_BASE`，否则回退到公共 `https://rsshub.app`。
- `start/app/lib/news/fetch-rsshub.ts:1-1`：抓取模块直接导入该模块级 `RSSHUB_BASE`。
- `start/app/lib/news/fetch-rsshub.ts:20-30`：请求 URL 由模块常量和 feed path 拼接，函数没有接收环境配置参数。
- `start/wrangler.toml:1-5`：项目配置了 `compatibility_date = "2025-01-01"`、`compatibility_flags = ["nodejs_compat"]`，输出目录为 `build/client`。
- `start/functions/[[path]].ts:1-6`：Pages Function 仅以 `{ build }` 创建 handler，没有显式 `getLoadContext` 把 Cloudflare 上下文传给应用。
- `start/app/entry.server.tsx:1-12`：服务端入口签名接收 `AppLoadContext`，但参数命名为 `_loadContext`，当前片段未使用它。

### 需要运行时验证

- 当前 Wrangler 本地预览、Preview 部署和 Production 部署中 `process.env.RSSHUB_BASE` 是否存在、值从何处注入。
- `@react-router/cloudflare@7.17.0` 下 `createPagesFunctionHandler` 的准确 `getLoadContext` 类型与推荐结构。
- Cloudflare Dashboard 中现有变量/secret 的名称、环境范围和绑定方式。
- 资讯 loader 的调用链是否只在服务端运行，客户端导航时是否仍由服务端 loader 获取。
- 缺少绑定时应允许公共回退、禁用源，还是在非生产环境报错。

## 工作原理 / 原因

Cloudflare Pages Functions 为每次请求提供 execution context，其中包含 `env` bindings。React Router 的 Cloudflare adapter 可以在创建 handler 时通过 load context 将这些请求级对象传入 route loader。loader 再把所需配置显式传给数据层，数据层不需要知道 Cloudflare 类型。

模块级 `process.env` 在模块求值时执行一次。在长生命周期 isolate、测试复用模块或不同环境配置下，这种隐藏依赖不容易替换。即使 `nodejs_compat` 提供 `process`，它也不应自动被视为所有 Pages binding 的唯一、稳定访问入口。

依赖注入的核心不是把 Cloudflare 类型传遍全项目，而是在平台边界读取 `env`，转换为应用自己的 `AppConfig`，再传递普通字符串配置。

## 影响

- 生产环境可能未读取到预期自建 RSSHub 地址而静默回退公共实例；这是风险，尚非已证实故障。
- 单元测试若要改变 `RSSHUB_BASE`，必须操纵全局 `process.env` 并处理模块缓存，测试隔离较差。
- 配置来源不透明，Preview、Production 与本地行为可能难以对照。
- 若直接把完整 `env` 暴露到客户端 loader 数据，可能泄露 secret；设计必须只在服务端读取并下传必要的非敏感值或请求结果。

## 优化目标

1. 以 Cloudflare 请求上下文 binding 作为部署环境配置的首选来源。
2. 数据抓取函数通过显式参数接收 RSSHub base，易于测试。
3. 为本地开发、测试、Preview、Production 定义清晰回退和校验策略。
4. 不把完整 `env` 或 secrets 序列化到客户端。
5. 保留 `nodejs_compat` 仅用于确有需要的 Node 兼容能力，而不是把它当作环境注入设计。

## 非目标

- 不在本计划中迁移 KV、D1 或其他绑定。
- 不删除 `nodejs_compat`，除非单独审计确认无其他依赖。
- 不断言当前生产已经故障。
- 不把 RSSHub secret 或内部 URL硬编码进仓库。

## 方案比较

### 方案 A：通过 `getLoadContext` 注入 Cloudflare env（推荐）

Pages Function 把请求上下文放入 React Router `AppLoadContext`；route loader 从类型化 context 中取得 `RSSHUB_BASE`，转换为应用配置并传给 `fetchNewsFeed`/`fetchRssHubJson`。

**优点：** 符合请求级 binding 模型；类型明确；测试可直接传配置；支持不同部署环境。  
**缺点：** 需要补充 `AppLoadContext` 类型和调整抓取调用链；必须避免把 env 放入 loader 返回值。

### 方案 B：继续使用 `process.env`，增加启动校验

保留模块常量，只对缺失变量记录或抛错。

**优点：** 改动最小；本地 Node 工具熟悉。  
**缺点：** 仍依赖兼容层与模块初始化；测试需要全局状态；不能解决 Cloudflare binding 来源不清的问题。

### 方案 C：使用 `import.meta.env` 构建时注入

将 RSSHub base 作为 Vite 构建变量。

**优点：** 构建时替换简单，适合公开且固定的客户端配置。  
**缺点：** 配置被固化进构建产物；不适合请求级绑定或 secret；可能意外暴露到客户端；每次环境变化需要重建。

## 推荐方案

采用方案 A，并把平台类型限制在入口/loader 边界：

- Pages Function 的 `getLoadContext` 提供 Cloudflare context。
- 应用定义最小 `AppConfig`，例如只包含经校验的 `rsshubBase`。
- loader 调用资讯服务时显式传入该配置。
- 抓取层提供一个明确默认值，但生产是否允许默认回退需由运维策略决定。

在实施前先用当前版本类型和官方文档确认 API；不要复制其他版本模板后强行 `@ts-ignore`。

## 分步骤实施计划（当前不实施代码）

1. 在本地 Wrangler、Preview 和 Production 各记录当前变量读取结果；日志只记录来源/是否配置，不输出 secret。
2. 查阅并验证 `@react-router/cloudflare@7.17.0` 的 `createPagesFunctionHandler` 与 `getLoadContext` 类型。
3. 定义 Cloudflare binding 类型和最小应用配置类型，明确 `RSSHUB_BASE` 是否可选。
4. 在 `functions/[[path]].ts` 的平台边界注入请求 context，不修改构建产物导入方式。
5. 在资讯 route loader 中读取配置；不要将完整 context/env 包含在返回 JSON 中。
6. 调整 `fetchNewsFeed` 到 `fetchRssHubJson` 的调用链，使 base URL 成为显式参数；将 URL 尾斜杠规范化集中在一个函数。
7. 定义回退策略：本地/测试可默认公共实例；生产可选择告警、禁用 RSSHub 源或明确允许回退。
8. 添加测试：自定义 base、尾斜杠、缺失 binding、不同请求配置互不污染。
9. 更新部署文档，说明 Dashboard/Wrangler 中变量名和环境范围，但不提交 secret 值。
10. 用 Wrangler 与实际 Preview 部署验证，再执行类型检查和构建。

## 风险与取舍

- 将 Cloudflare context 类型扩散到数据层会降低可移植性；应在 loader 边界转换为普通配置。
- 生产缺失配置若直接抛错，可能让整个资讯页不可用；若静默回退，又可能触发公共实例限流。需要明确运营策略。
- Loader context 的类型声明若与 adapter 实际结构不一致，会造成只在部署时暴露的问题。
- 环境变量可能是公开 URL，也仍应避免把完整 `env` 对象发送到客户端。
- 更改模块常量导出可能影响其他导入者，实施前需搜索所有引用。

## 验证方法

- 单元测试向抓取函数传入 fake base，断言请求 URL，不依赖真实网络。
- 同一测试进程用两个不同配置调用，确认没有模块级值串扰。
- `wrangler pages dev` 中设置测试变量，确认 loader 使用绑定值。
- 部署 Preview，使用可识别的测试 RSSHub 地址或受控 mock，确认请求目标正确。
- Production 验证仅记录“来源和生效状态”，不记录敏感内容。
- 检查生成的客户端资源和 loader JSON，确保没有完整 env 或 secrets。
- 运行 `npm run typecheck` 与 `npm run build`。

## 验收标准

- Cloudflare 部署中的 RSSHub 配置可从请求 context binding 明确读取。
- 抓取函数不再依赖模块初始化时的 `process.env` 隐式读取。
- 本地、测试、Preview、Production 的缺失值策略有文档且行为可重复。
- 两个不同注入配置的测试不会互相污染。
- 客户端产物和响应不泄露 env 对象或 secret。
- 不把“旧实现一定无法生产运行”作为结论；迁移理由和验证结果分别记录。

## 依赖 / 前置关系

- 需要确认 Cloudflare Dashboard 当前 binding 配置，仓库无法静态得知。
- 需要查验锁定版本 `@react-router/cloudflare@7.17.0` 的 API。
- 测试可依赖 `018-testing-and-lint.md` 的基础设施。
- 包管理器选择见 `019-package-manager-lockfile.md`，但不阻塞设计。

## 学习要点

- `nodejs_compat` 提供兼容能力，不等于应用应绕过平台原生 binding 模型。
- 请求级依赖通过 load context 注入，比模块级全局读取更容易测试和多环境部署。
- 平台对象应停留在边界，业务层接收最小、普通的配置对象。
- 对云平台兼容性要区分静态风险与实际部署证据，避免把“可能”写成“必然”。
