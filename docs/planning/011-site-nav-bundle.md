# 011：SiteNav 导航依赖与首屏 Bundle 优化

## 元信息

| 字段       | 值                                                                 |
| ---------- | ------------------------------------------------------------------ |
| 状态       | 暂缓（分析后收益门槛未过）                                         |
| 优先级     | P2                                                                 |
| 类别       | JavaScript Bundle / 导航组件 / 依赖治理                            |
| 证据置信度 | 高：2026-08-20 已用客户端 chunk 模块 dump 复核；见下方「分析记录」 |

## 分析记录（2026-08-20）

复现构建（Bun + `react-router build`）后：

| 指标            | 值                                                                                                   |
| --------------- | ---------------------------------------------------------------------------------------------------- |
| `site-nav-*.js` | **约 168 KiB raw / 56 KiB gzip**（高于旧基线 113/38，依赖版本已变）                                  |
| 分析方法        | 临时 `vite.analyze.config.ts` 的 `generateBundle` 模块表（`renderedLength` 按比例折算到 chunk gzip） |

**组成要点（不是“整块都能删”）：**

1. `SiteNav` 同时挂了桌面 `NavigationMenu` 和 `SearchForm` 里的 **Select**（同属 `@base-ui/react` + Floating UI）。
2. 按特征目录粗分该 chunk 的 gzip 份额（估算）：`floating-ui-react` ~18 KiB、`select` ~8 KiB、`@floating-ui` ~6.5 KiB、`navigation-menu` 本体仅 ~6.4 KiB。
3. **只换掉 NavigationMenu、保留顶栏 Select** 时，Floating UI 大半仍会留下；可控节省多半明显低于整 chunk 的 56 KiB，也很难稳定越过文档里约 10 KiB gzip 的重写门槛。
4. shadcn 包装层本身只有数 KiB；体积在 Base UI 原语与定位/焦点运行时，不是业务菜单数据“冗余”。

**决策：** 暂不实施方案 B。若以后要动，应把「顶栏 Select 是否一并轻量化」算进同一方案，否则单独抠菜单收益有限。复现：`cp vite.analyze.config.ts vite.config.ts && bun run build`（分析完恢复原配置）。

## 问题摘要

一次现有构建观测中，名为 `site-nav` 的 chunk 为 112,730 bytes raw、37,682 bytes gzip。`SiteNav` 静态导入项目的 `NavigationMenu` 包装层，包装层又静态导入 `@base-ui/react/navigation-menu`。首页、动画布局和动画日志页面都使用 `SiteNav`，因此这条依赖很可能进入多个主要页面的初始客户端依赖图。

但 chunk 文件大小不能直接等同于“全部都能删除”或“全部来自 NavigationMenu”。打包器可能把共享依赖、图标、业务菜单数据或运行时代码放在同一 chunk，也可能因代码分割策略而命名为入口组件。必须先用 bundle analyzer/模块图确认组成和各路由实际初始下载，再决定替换原生菜单还是动态拆分。

## 当前证据

### 已静态确认

1. `start/app/components/site-nav.tsx:7-14` 静态导入 `~/components/ui/navigation-menu` 的六个组件。
2. `start/app/components/ui/navigation-menu.tsx:1-5` 静态导入 `@base-ui/react/navigation-menu`、`class-variance-authority` 和图标。
3. `start/app/components/site-nav.tsx:92-148` 在桌面导航中立即渲染 `NavigationMenu`、trigger、content 和 link；它不是只在用户点击后才引用的代码路径。
4. `start/app/components/site-nav.tsx:178-220` 的移动端抽屉是独立的自定义实现，不依赖桌面 `NavigationMenu` 交互原语。
5. `start/app/routes/home.tsx:14-16`、`start/app/routes/home.tsx:87-89` 在首页静态导入并渲染 `SiteNav`。
6. `start/app/routes/anime/layout.tsx:5-10`、`start/app/routes/anime/layout.tsx:125-128` 在主要动画布局静态导入并渲染 `SiteNav`。
7. `start/app/routes/anime/blog.tsx:1-5` 与 `start/app/routes/anime/blog-detail.tsx:1-5` 也静态导入 `SiteNav`；对应页面均直接渲染它。
8. `start/package.json:5-10` 只有 build/dev/start/typecheck 脚本；`start/package.json:30-40` 未列出专用 bundle analyzer 依赖。

### 构建观测与边界

- 已提供的基线观测：`site-nav` chunk 为 **112,730 bytes raw / 37,682 bytes gzip**。
- 当前仓库未保留可供逐模块追溯的 `build`/`dist` 产物，因此该数字应作为待复现基线，而不是源码行级事实。
- gzip 大小不等于浏览器解析/执行成本；raw 大小也不等于全部由导航菜单库贡献。

### 需要运行时或构建分析验证

- chunk 的完整模块组成、各模块 raw/gzip/brotli 占比和 tree-shaking 结果。
- 首页与各主要路由是否在初始导航时下载该 chunk，预取策略是否提前下载。
- NavigationMenu 代码的解析、编译、执行和 hydration 成本。
- 替换后实际首屏 JS 减少量；chunk 可能重组，不能只比较同名文件。
- 当前桌面菜单的键盘、焦点、ARIA 和触屏行为基线。

## 工作原理 / 为什么会慢

ESM 静态导入会把依赖加入当前模块图。打包器可以拆 chunk，但只要首屏组件立即需要导入模块，浏览器通常仍需在渲染/水合前后获取相关代码。`SiteNav` 位于所有主要页面顶部，因此依赖的覆盖面比只用于深层交互的组件更大。

组件库的导航原语提供焦点管理、键盘导航、定位、打开/关闭状态和 ARIA 等行为。这些能力不是“无用代码”；用原生实现替换可以减小 JS，但开发团队必须自己承担无障碍和跨输入设备正确性。

简单把桌面菜单 `lazy()` 拆成动态 chunk也未必改善体验。如果组件首屏立即渲染，动态 chunk仍会立刻请求，只是多了一次请求和 Suspense 边界；若延迟到交互再加载，则首次点击可能等待代码并造成导航暂不可用。分析应关注“路由初始总 JS”和用户交互延迟，而不是追求更多 chunk。

## 影响

- **覆盖范围**：导航出现在首页、列表、日志和详情等主要入口，任何 eager 依赖都可能广泛影响初始 JS。
- **CPU**：更多 JS 需要下载、解析、编译和 hydration；真实耗时依设备而异。
- **交互**：菜单是关键导航，错误的延迟加载会直接影响可用性。
- **可访问性**：替换成熟原语可能造成键盘、焦点和屏幕阅读器回归。
- **维护**：自研菜单代码更小，但测试和长期维护责任更高。

## 优化目标

1. 用可复现 analyzer 报告确定 `site-nav` chunk 的真实组成和每条路由初始成本。
2. 若 NavigationMenu 原语是主要可控成本，减少或移除其在首屏依赖图中的占比。
3. 保持桌面和移动导航在无鼠标、触屏和屏幕阅读器下可用。
4. 不引入导航布局闪烁、首次交互等待或 hydration mismatch。
5. 以路由初始总 JS、执行时间和交互指标验证，而不是只看 chunk 名称。

## 非目标

- 不删除站点导航功能、菜单项或搜索表单。
- 不在本计划阶段替换组件或安装 analyzer。
- 不把 37,682 bytes gzip 全部宣称为可节省空间。
- 不为了 bundle 数字牺牲键盘导航、焦点恢复、Escape 关闭和触屏行为。
- 不顺带重构所有 shadcn/base-ui 组件。

## 方案比较

| 方案                                   | 做法                                                                     | 预期收益                                    | 优点                                             | 缺点 / 风险                                                    |
| -------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------- | ------------------------------------------------ | -------------------------------------------------------------- |
| A. 保留 Base UI，分析后做导入/用法瘦身 | 删除未使用包装导出，确认直接子路径导入和 tree-shaking，简化动画/定位能力 | 低到中，取决于 analyzer                     | 行为风险最小，继续依赖成熟无障碍原语             | 可能几乎不减包；当前已是子路径导入，空间有限                   |
| B. 用轻量原生/React 桌面菜单替换       | 使用 button、列表、受控状态、CSS 定位，自行实现 ARIA/键盘/焦点           | 中到高，若 analyzer 证明 Base UI 占主要部分 | 可完全移除该原语依赖；移动端已有自定义模式可参考 | 无障碍和边界交互复杂，测试成本高                               |
| C. 动态拆分桌面 NavigationMenu         | 大屏且接近交互时加载菜单 chunk，提供稳定占位/预加载                      | 低到中；只改变初始下载时机                  | 保留 Base UI 行为                                | 首次交互延迟；首屏立即 mount 时几乎无收益；SSR/Suspense 更复杂 |

## 推荐方案

先做 analyzer，满足收益门槛后优先 **方案 B**；否则保持现状或只做方案 A。

理由：桌面菜单使用场景相对集中，移动抽屉已经是自定义实现。如果 analyzer 证明 `@base-ui/react/navigation-menu` 是初始包的主要可控部分，用专门针对当前交互的轻量实现比“首屏立即 lazy 加载”更可能产生真实收益。不过替换必须按 WAI-ARIA disclosure/navigation 模式设计，而不是简单用 hover 隐藏/显示。

方案 C 只作为谨慎的备选：如果菜单能够在服务端输出可用的基础链接，并在大屏交互前预取增强逻辑，才可能兼顾无 JS 导航与初始包。若 lazy 组件一加载页面就请求，则应放弃这种仅改变 chunk 形状的优化。

建议设立停止条件：若 analyzer 显示可移除的导航原语对主要路由初始 gzip 贡献很小（例如不足约 10 KiB，具体门槛由团队决定），不要承担完整重写风险。

## 分步骤实施计划（当前不要实施代码）

1. **复现基线构建**
   - 固定 Node、包管理器、依赖锁文件和构建模式。
   - 重跑 `react-router build`，记录所有主要路由的初始 chunk、raw/gzip/brotli 大小。
   - 确认 112,730 raw / 37,682 gzip 是否可重复，以及文件哈希/命名变化。
2. **接入临时或脚本化 analyzer**
   - 选择兼容 Vite 8/Rollup 的可视化工具或生成 manifest/metafile。
   - 输出模块树、共享依赖和每个入口引用关系；不要只保留 treemap 截图，还要保存数值表。
   - 分离 `@base-ui/react/navigation-menu`、包装组件、菜单业务数据、图标和 React 运行时占比。
3. **建立行为基线**
   - 记录桌面鼠标、键盘、触屏、焦点、Escape、路由变化自动关闭和窗口缩放行为。
   - 使用 Accessibility Tree/axe 记录角色、名称、展开状态和焦点顺序。
4. **做最小概念验证**
   - 若 Base UI 占比显著，单独实现一个菜单组的轻量版本，不立即替换全部。
   - 服务端始终输出可访问链接；JS 只增强展开/关闭。
   - 实现按钮 `aria-expanded`/`aria-controls`、Escape、外部点击、焦点返回和合理键盘顺序。
5. **比较方案 A/B/C**
   - 对每个 PoC 重建并比较“所有初始 JS 总和”，防止代码只是移动到另一个 chunk。
   - 在中低端移动设备 CPU 模拟下测 JS 执行和 INP/首次菜单交互。
   - 动态方案记录首次打开等待时间和是否出现占位闪烁。
6. **决定是否实施**
   - 只有收益超过团队门槛且无障碍测试通过时才替换。
   - 若收益不足，保留 Base UI 并记录“不实施”的数据依据。
7. **渐进迁移与清理**
   - 保持 `SiteNav` 公共 API 不变，先替换桌面内部实现。
   - 确认无其他组件使用 navigation-menu 后，才移除包装文件/依赖引用；不要误删共享 `@base-ui/react` 其他用途。
8. **回归与观测**
   - 测试所有主要路由、直接访问、客户端跳转、移动/桌面切换和无 JS 基础链接。
   - 上线后观察 JS 错误、菜单点击和导航完成率。

## 风险与取舍

- 自研菜单最主要风险不是视觉，而是焦点和辅助技术行为。
- 原生 `<details>` 很轻，但多个菜单互斥、外部点击、焦点和样式控制需要额外逻辑；不能假设零 JS 即自动满足全部需求。
- 动态 import 可能增加请求瀑布和首次交互延迟。
- chunk 重组会让单文件比较失真，必须比较路由初始总资源。
- analyzer 本身可能与 Vite 8 版本不兼容，应以临时开发依赖或独立分析方式接入，不污染生产运行时。
- 移除一个子模块不一定能移除整个 `@base-ui/react` 包，因为其他组件可能继续引用它。

## 验证方法

- Bundle analyzer/manifest 比较模块级 raw、gzip、brotli 和入口引用。
- DevTools Coverage 检查首屏导航相关 JS 的使用比例，但 Coverage 只做辅助证据。
- Lighthouse/WebPageTest 比较主要路由初始 JS、主线程执行、TBT/INP；至少多次运行。
- Playwright 覆盖鼠标、Tab/Shift+Tab、Enter/Space、Escape、外部点击和路由切换。
- axe 与屏幕阅读器手工检查菜单名称、展开状态、链接顺序和焦点恢复。
- 禁用 JavaScript，确认核心导航链接仍可访问（若采用渐进增强方案）。
- 在 1024px 断点附近测试移动/桌面切换，避免两个菜单同时可交互。

## 验收标准

- 有可复现的 analyzer 报告解释 112,730 raw / 37,682 gzip chunk 的模块组成，且明确哪些字节可控。
- 若实施替换，主要路由初始总 gzip JS 达到预先约定的有意义降幅；不能只展示同名 chunk 变小。
- `@base-ui/react/navigation-menu` 不再位于主要路由 eager 图中，或保留它的理由有数据支持。
- 首页、动画布局、日志列表和日志详情的导航功能无回归。
- 键盘、触屏、Escape、焦点返回、ARIA 与路由变化关闭行为通过自动和手工测试。
- 没有首屏导航占位闪烁、hydration mismatch 或首次点击不可用。
- 若分析显示收益不足，记录停止决策也视为完成该规划的分析阶段，不强行重写。

## 依赖 / 前置关系

- 需要兼容当前 Vite 8 / React Router 7.17 的 bundle 分析方法。
- 需要固定并可重复的生产构建环境。
- 需要无障碍测试工具和至少一次屏幕阅读器手工验证。
- 与 `012-calendar-code-splitting.md` 共用 analyzer 基线；建议一次建立分析工具，分别评估导航和日历。
- 如果其他 Base UI 组件仍被使用，依赖包不能整体移除，只能评估子路径/tree-shaking收益。

## 学习要点

- chunk 名称是打包结果标签，不是“可删除代码清单”。
- 静态导入决定模块图，但是否形成独立请求、何时下载由 bundler 和路由加载策略共同决定。
- 动态 import 只有在真正延后需求时才减少初始工作；首屏立即 lazy mount 往往只是移动代码。
- UI 原语的 bundle 成本换来了无障碍和交互正确性，替换时必须把这些能力计入工程成本。
- 比较 bundle 应看每条路由初始总 JS 和运行时 CPU，而不是单个文件大小。
- 好的性能计划应包含停止条件：收益不足时不实施也是正确决策。
