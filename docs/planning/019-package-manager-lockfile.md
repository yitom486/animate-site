# 019 包管理器与锁文件统一

## 元信息

| 字段       | 值                                                                     |
| ---------- | ---------------------------------------------------------------------- |
| 状态       | 待实施                                                                 |
| 优先级     | P3                                                                     |
| 类别       | 依赖管理 / 开发流程 / 可复现构建                                       |
| 证据置信度 | 高（双锁文件和 npm 文档已静态确认）；是否已发生漂移需分别安装/比较验证 |

## 问题摘要

仓库同时提交了 npm 的 `package-lock.json` 与 Bun 的 `bun.lock`，而 README 明确要求 npm 并示例 `npm ci`。两个锁文件由不同解析器维护，团队若混用工具，可能只更新其中一个，造成依赖版本、完整性元数据或 CI/本地结果漂移。

这是可复现构建与协作规范风险，不是当前应用运行时性能问题。应由项目维护者明确选择 npm 或 Bun，再删除另一锁文件并统一文档、CI 和贡献约定；本规划阶段不删除任何锁文件。

## 当前证据

### 已静态确认

- `start/package-lock.json:1-8`：存在 npm lockfile，`lockfileVersion` 为 3，根包名为 `start`。
- `start/bun.lock:1-7`：同时存在 Bun lockfile，`lockfileVersion` 为 1，也描述根 workspace `start`。
- `start/README.md:22-33`：本地开发前置条件明确列出 Node.js 20+ 与 npm，安装命令为 `npm ci`。
- `start/README.md:35-53`：开发、类型检查和构建示例均使用 `npm run ...`。
- `start/README.md:67-75`：Cloudflare Pages 构建命令写为 `npm run build`，Node.js 版本要求为 20+。
- `start/package.json:1-10`：包名为 `start`，没有 `packageManager` 字段来声明唯一工具及版本。

### 需要运行时验证

- 团队与 Cloudflare 实际使用 npm 还是 Bun，仓库历史无法仅靠当前文件确定。
- 分别执行 frozen install 后解析出的完整依赖树是否一致。
- 两个锁文件是否都与当前 `package.json` 同步，是否已有未提交漂移。
- Cloudflare Pages 当前构建环境是否由设置自动选择包管理器，双锁文件的选择优先级是什么。
- 选择 Bun 时 React Router、Wrangler 和现有脚本在目标版本下是否全部通过。

## 工作原理 / 原因

锁文件把范围依赖解析为具体版本，并记录传递依赖与完整性信息。npm 和 Bun 使用各自格式、解析算法及更新时机；运行 `npm install` 通常只维护 `package-lock.json`，运行 `bun install` 则维护 `bun.lock`。两个文件并存并不会自动保持语义一致。

CI 的可复现性依赖三件事一致：包管理器、包管理器版本、锁文件。只声明 Node 版本而不声明包管理器版本，仍可能在升级 npm/Bun 后出现锁文件改写或解析差异。`packageManager` 字段与 Corepack/CI 固定版本可以让工具选择更明确，但具体启用方式要匹配部署平台。

## 影响

- 开发者可能使用不同工具安装出不同传递依赖。
- 修改依赖后可能只更新一个锁文件，代码评审难以判断哪个才是权威来源。
- CI 或 Cloudflare 自动探测可能与本地使用不同工具，增加“本地通过、部署失败”的概率。
- 双锁文件本身不会让浏览器 bundle 或服务端请求自动变慢；不要把它描述为运行时性能优化。

## 优化目标

1. 明确一个权威包管理器和一个权威锁文件。
2. 本地、CI、README 和 Cloudflare 构建使用同一工具链。
3. 使用 frozen/clean install，依赖漂移能在 CI 立即失败。
4. 记录包管理器版本与升级流程。
5. 删除非权威锁文件前取得用户/维护者决策。

## 非目标

- 不在本规划中删除 `package-lock.json` 或 `bun.lock`。
- 不借此升级所有依赖。
- 不比较 npm 与 Bun 的理论 benchmark 并据此宣称应用运行更快。
- 不同时切换包管理器、React Router 版本和 Cloudflare 部署模型。

## 方案比较

### 方案 A：统一 npm，保留 `package-lock.json`

继续使用 README 已记录的 Node.js 20+、`npm ci` 和 `npm run`；增加 `packageManager`/CI 版本约束，在批准后删除 `bun.lock`。

**优点：** 与当前文档和 Cloudflare 构建命令一致；迁移成本最低；`npm ci` 已适合 frozen install。  
**缺点：** 若团队实际主要使用 Bun，会放弃其安装速度和现有工作流；仍需决定 npm 的准确版本。

### 方案 B：统一 Bun，保留 `bun.lock`

更新 README、CI、Cloudflare 命令和 `packageManager`，验证后删除 `package-lock.json`。

**优点：** 安装通常更快；工具可同时运行脚本；若团队已标准化 Bun，体验更一致。  
**缺点：** 与当前 README/部署文档不一致，迁移与验证范围更大；Cloudflare、Wrangler 和生态兼容性必须实测；贡献者需要 Bun。

### 方案 C：长期保留两种锁文件

要求每次依赖变化同时运行 npm 与 Bun 更新两个 lock。

**优点：** 两类用户都可使用偏好的工具。  
**缺点：** 双重维护且容易漂移；很难定义解析差异时的权威结果；CI 成本增加。除非项目明确承诺双工具支持，否则不推荐。

## 推荐方案

基于现有仓库证据，默认推荐方案 A：npm 已写入本地开发和 Cloudflare 部署文档，迁移成本最低。但最终选择必须由用户/维护者确认；在确认前保留两个锁文件，不做删除。

若团队明确以 Bun 为标准，应选择方案 B 并把它作为独立迁移，先证明 clean install、typecheck、test、build 和 Wrangler preview 全部通过，再切换文档与删除 npm lock。

## 分步骤实施计划（当前不实施代码）

1. 询问/记录维护者决策：权威工具是 npm 还是 Bun，目标版本是多少。
2. 在隔离目录或干净工作区分别执行 `npm ci` 与 Bun frozen install，记录是否成功；避免安装过程意外改写仓库锁文件。
3. 导出/比较关键直接依赖和存在兼容风险的传递依赖版本，确认是否已经漂移。
4. 用候选权威工具运行 `typecheck`、后续 test/lint、生产 build 和 Wrangler preview。
5. 在 `package.json` 增加准确的 `packageManager` 字段；是否使用 Corepack按目标工具与部署平台决定。
6. 更新 README 的安装、脚本和 Cloudflare 构建命令，使其只展示选定工具。
7. 更新 CI：固定运行时与包管理器版本，使用 frozen install，并只缓存权威锁文件对应的缓存。
8. 检查 Cloudflare Pages 的自动探测和构建设置，必要时显式指定安装/构建命令。
9. 由维护者确认迁移结果后，删除非权威锁文件；不要在其他功能提交中顺带删除。
10. 在贡献说明中规定依赖变更必须提交权威锁文件，并说明升级包管理器的流程。

## 风险与取舍

- `packageManager` 字段对不同 npm/Corepack 版本的行为可能不同，应在 Node 20 环境验证。
- 切到 Bun 可能生成不同依赖树，即便直接依赖版本范围相同；需要完整回归。
- 删除锁文件会影响尚未表达的开发者工作流，因此必须先决策和沟通。
- 比较安装结果时不能在同一 `node_modules` 上交替运行，否则结果会被前一次安装污染。
- Cloudflare 的自动探测规则可能随平台变化，需以实际构建日志为准。

## 验证方法

- 从无 `node_modules` 的干净环境执行权威工具的 frozen install，确认锁文件不发生变化。
- 连续执行两次安装，检查 Git 工作区仍干净。
- 运行 `typecheck`、测试、lint、`build` 和 `start`/Wrangler 的有限预览验证。
- 在 CI 和 Cloudflare 构建日志中确认实际包管理器与版本。
- 人为修改 `package.json` 而不更新锁文件，确认 frozen install 会失败；随后撤销该验证改动。
- 检查 README、CI、`packageManager` 和剩余锁文件没有互相矛盾。

## 验收标准

- 维护者明确批准 npm 或 Bun 之一作为唯一权威工具。
- 仓库最终只保留对应锁文件；删除动作不在本规划阶段执行。
- `package.json`、README、CI 和 Cloudflare 构建配置使用同一包管理器及明确版本策略。
- 干净 frozen install 不修改锁文件，且类型检查、测试、lint、构建通过。
- 文档明确依赖升级和锁文件提交规则。
- 变更说明把收益描述为一致性和可复现性，而非运行时性能提升。

## 依赖 / 前置关系

- 删除任一锁文件前必须获得用户/维护者决策。
- `018-testing-and-lint.md` 的 CI 命令应以本决策为基础；反过来，最终迁移验证应运行 018 建立的测试与 lint。
- 需要访问 Cloudflare Pages 项目设置或构建日志，才能验证平台实际选择。

## 学习要点

- 锁文件不是通用格式；它与生成它的包管理器及版本共同构成可复现安装契约。
- 双锁文件的主要风险是团队和 CI 漂移，不是应用运行时性能。
- 选择工具应综合现有文档、部署平台、团队习惯和兼容性，而非只看安装速度。
- 删除非权威锁文件属于团队决策，应在验证后明确执行，而不是顺手清理。
