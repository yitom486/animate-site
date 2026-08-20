# 018 测试与 Lint 基础设施

## 元信息

| 字段       | 值                                                                   |
| ---------- | -------------------------------------------------------------------- |
| 状态       | 待实施                                                               |
| 优先级     | P1                                                                   |
| 类别       | 工程质量 / 自动化测试 / CI                                           |
| 证据置信度 | 高（脚本缺口与可测试逻辑已静态确认）；工具收益和规则噪声需试运行评估 |

## 问题摘要

项目当前只有开发、构建、预览和 TypeScript 类型检查脚本，没有自动化 `test` 或 `lint` 入口。代码中存在 RSS/XML 与 HTML 解析、缓存过期、缓存键/页码构造、日期与查询参数规范化等高价值纯逻辑，适合用快速单元测试保护；路由 loader 和外部抓取则适合少量 mock 集成测试。

不建议一次性引入完整测试、浏览器 E2E、严格 lint、格式化和大规模代码修正。应采用分阶段测试金字塔：先覆盖易错纯逻辑和本规划中的回归缺陷，再引入低噪声 lint 与 CI 门禁，最后按关键用户路径增加少量 E2E。

## 当前证据

### 已静态确认

- `start/package.json:5-10`：scripts 仅有 `build`、`dev`、`start`、`typecheck`，没有 `test`、`lint` 或 CI 专用脚本。
- `start/package.json:30-40`：devDependencies 包含 React Router、Tailwind、TypeScript、Vite 和 Wrangler，尚无测试运行器、DOM 测试库或 lint 工具。
- `start/app/lib/rss.ts:8-35`：项目自行解析 RSS item、CDATA、必填 title/link，并过滤无效条目。
- `start/app/lib/rss.ts:37-64`：包含实体解码、HTML 清理、摘要截断和 RSS 日期规范化，边界条件较多。
- `start/app/lib/cache.ts:16-45`：内存缓存实现 TTL 过期与 `withCache` 命中/回填逻辑。
- `start/app/lib/bangumi/server/blog/list.server.ts:49-95`：Bangumi HTML 通过字符串与正则解析成结构化条目，容易受样本变化影响。
- `start/app/lib/bangumi/server/blog/list.server.ts:97-115`：页码被规范化并用于缓存键、上游 URL 和 `hasMore` 判断。
- `start/app/components/anime-schedule.tsx:30-49`：日期参数解析包含格式和真实日历日期校验。
- `start/app/routes/anime/blog.tsx:54-72` 与 `start/app/routes/anime/blog.tsx:137-143`：存在适合回归测试的失败后重试状态路径。

### 需要运行时验证

- 选择的测试运行器在 React Router v7、Vite 8、React 19 和 Windows/CI 环境中的兼容性。
- 当前代码在初始 lint 规则下的告警数量与误报情况。
- 哪些 HTML/RSS 样本最能代表真实上游变化；不能用网络实时响应作为稳定 CI 断言。
- 构建和测试在 CI 中的总耗时、缓存收益与 flaky 风险。
- E2E 是否需要 Cloudflare/Wrangler 环境，而不是普通 Vite preview。

## 工作原理 / 原因

测试金字塔把大多数覆盖放在快速、确定性的单元测试，少量覆盖放在模块集成，最少量覆盖放在真实浏览器。解析器和规范化函数输入输出明确，最适合单元测试；loader 可 mock `fetch` 验证错误和状态；只有 hydration、滚动、IntersectionObserver、CSS 媒体查询等浏览器行为需要组件或 E2E。

TypeScript 检查类型关系，但不能证明 RSS 实体解码、缓存过期时机、重试请求或页码边界正确。Lint 则用于发现未使用值、危险 promise、React hooks 依赖等静态模式，也不能替代行为测试。

CI 门禁应从稳定、低噪声的命令开始。一次打开大量风格规则容易制造无关改动，并让团队通过禁用规则绕过真正问题。

## 影响

- 当前解析规则或缓存行为回归只能靠手工发现。
- 013–017 中的修复缺少统一自动化落点，后续容易重复出现。
- 没有 lint 入口会让 hooks、未处理 promise 和死代码等问题依赖人工审查。
- 工具一次引入过多会增加依赖、配置和维护成本，并可能产生大量与业务无关的格式 diff。

## 优化目标

1. 提供稳定的 `test` 与 `lint` 命令，并能在 CI 非交互运行。
2. 优先覆盖解析、缓存、参数规范化和已确认回归缺陷。
3. 外部网络全部通过 fixture/mock 隔离，CI 不依赖 Bangumi、RSSHub 等可用性。
4. 建立渐进式门禁：安装、类型检查、单元测试、构建，lint 稳定后加入。
5. 控制依赖和规则数量，避免一次性重构全仓库。

## 非目标

- 不追求首期 100% 覆盖率。
- 不在首期为所有组件编写快照测试。
- 不让 CI 直接请求第三方生产服务。
- 不借 lint 引入大规模格式化或无关代码改写。
- 不在测试基础尚未稳定时立即建设庞大的 E2E 套件。

## 方案比较

### 方案 A：一次引入 Vitest、Testing Library、Playwright、ESLint 与格式化规则

**优点：** 能快速形成完整工具链；覆盖单元、组件和 E2E。  
**缺点：** 依赖和配置激增；初始告警/失败难以归因；CI 时间和维护成本高；容易造成大范围无关 diff。

### 方案 B：分阶段引入（推荐）

第一阶段用与 Vite 生态一致的测试运行器覆盖纯函数和关键回归，并以现有 `typecheck`、`build` 建立 CI；第二阶段加入最小 ESLint 规则；第三阶段仅为必要浏览器行为加入组件测试/E2E。

**优点：** 每步价值清晰、回归面小；容易控制噪声；可根据真实需求决定是否引入 DOM/E2E 工具。  
**缺点：** 完整覆盖形成较慢；阶段之间需要持续跟进，不能把后续永久搁置。

### 方案 C：仅使用 Node 内建测试与 `tsc`

**优点：** 新依赖最少。  
**缺点：** TypeScript 直接执行、Vite alias、React 组件和浏览器环境需要额外处理；最终自建配置可能比使用成熟 Vite 测试工具更复杂；仍没有 lint。

## 推荐方案

采用方案 B。首期优先 Vitest（实施时确认与 Vite 8/当前 Node 版本兼容）和纯 Node 环境测试，不立即安装 jsdom、Testing Library 或 Playwright。Lint 采用 ESLint 的最小 flat config，先关注 correctness：TypeScript 基础、React hooks、明显未使用代码；格式规则保持克制。

CI 初始门禁建议按 `npm ci` → `npm run typecheck` → `npm test -- --run`（最终命令以实际脚本为准）→ `npm run build`。Lint 在本地清理基线并证明低噪声后加入 required gate。包管理命令最终应与 `019-package-manager-lockfile.md` 的决策一致。

## 分步骤实施计划（当前不实施代码）

1. 决定并记录唯一包管理器，避免 CI 与本地解析不同锁文件。
2. 核对当前 Node 20+、Vite 8、React 19 下可兼容的 Vitest/ESLint 版本，不盲目使用 latest。
3. 增加最小测试配置，支持 `~` alias、TypeScript 和纯 Node environment。
4. 建立 fixture 目录，保存最小、匿名化的 RSS/XML 与 Bangumi HTML 样本，并注明来源日期/用途。
5. 第一批单元测试覆盖：`parseRss2`、实体解码/HTML 清理/日期；缓存命中与过期；页码和日期参数边界。
6. 对目前非导出的解析/规范化函数，优先测试公开行为；只有在确有复用价值时提取纯函数，避免为了覆盖率破坏封装。
7. 为 014 的“失败后重试”增加组件或状态层回归测试；若需 DOM，再单独引入 jsdom 与 Testing Library。
8. 增加 `test`、`test:watch`（仅本地）等脚本；CI 使用明确非 watch 模式。
9. 引入最小 ESLint flat config，先生成基线报告，分类真正缺陷、可接受模式和规则误报。
10. 小批修复 lint 问题；不要在同一提交全仓库格式化。稳定后增加 `lint` 脚本和 CI gate。
11. 创建 CI workflow，固定 Node 版本和包管理器，执行类型检查、测试、构建；缓存只作为优化，不影响正确性。
12. 最后评估 Playwright：仅覆盖移动端 hydration、无限滚动重试、核心详情导航等浏览器专属路径。

## 建议的首批测试金字塔

### 单元测试（数量最多）

- RSS：普通 item、CDATA、实体、缺 title/link、非法日期、纯链接摘要、200 字截断。
- HTML：完整条目、缺标题、相对头像、回复数、时间格式变化、恶意/异常片段。
- 缓存：miss、hit、TTL 边界、过期删除、fetcher 异常不写缓存；时间应使用 fake timer 或可控时钟。
- 参数：页码 `0`、负数、小数、`NaN`；日期闰年、越界月份/日期。
- URL/缓存键：相同规范化输入得到稳定键，不同页不会碰撞。

### 集成/组件测试（少量）

- loader mock `fetch`：成功、HTTP 错误、超时、空页。
- 博客无限列表：观察器触发、失败提示、点击重试、成功追加、无更多。
- 详情规范化：缓存对象不变、返回图片 HTTPS。

### E2E（最少）

- 移动端详情深链首屏布局。
- 无限列表失败后的可恢复性。
- reduced-motion 下加载器无持续动画。

## 风险与取舍

- HTML 解析 fixture 只能代表已知结构，不能证明上游永不变化；应选择多种样本并提供失败时可诊断信息。
- 测试私有实现会阻碍重构，应优先断言公共输入输出。
- fake timer 若与 promise/fetch 混用不当会产生脆弱测试。
- Lint 规则太严会造成噪声，太松则失去门禁价值；先 correctness 后 style。
- E2E 更接近真实行为但更慢、更易 flaky，不应替代单元测试。

## 验证方法

- 在干净安装环境执行选定包管理器的 frozen install。
- 连续多次运行 unit/integration tests，确认无网络访问和随机失败。
- 临时让关键断言失败，确认 CI 确实阻止合并；随后恢复测试。
- 运行 lint 基线并记录警告分类，确保 required gate 不依赖 `--fix`。
- 运行 `npm run typecheck`、测试、lint、`npm run build`；若最终选 Bun，相应替换命令并保持唯一来源。
- 检查测试失败输出是否能指出 fixture、输入与预期，而不是只给模糊快照差异。

## 验收标准

- `package.json` 有明确、非交互的 `test` 和 `lint` 脚本。
- CI 在干净环境执行类型检查、测试和构建；lint 在基线稳定后成为门禁。
- 首批测试覆盖 RSS/HTML 解析、缓存 TTL、参数规范化及至少一个已确认回归缺陷。
- 测试默认不访问外部网络。
- 没有为追求覆盖率而暴露大量私有实现或引入全仓库格式化 diff。
- 工具版本与 Node/Vite/React Router 兼容性经过实际运行确认。

## 依赖 / 前置关系

- `019-package-manager-lockfile.md` 的包管理器决策应先于 CI 固化；在决策前可按 README 当前 npm 路径做实验，但不要删除锁文件。
- 014、015、017 的实施可为首批回归测试提供真实用例。
- E2E 需要可启动的应用、稳定 mock 服务和浏览器运行环境。

## 学习要点

- 类型检查、lint、单元测试和 E2E 发现的是不同类别问题，不能互相替代。
- 测试金字塔通过大量快速测试和少量真实浏览器测试平衡信心与成本。
- 外部解析器最需要固定 fixture，而不是依赖实时网络。
- CI 门禁应渐进建立：先稳定、低噪声，再扩大规则与覆盖。
