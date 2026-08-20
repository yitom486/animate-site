# 013 移动端 hydration 后布局切换

## 元信息

| 字段       | 值                                                                     |
| ---------- | ---------------------------------------------------------------------- |
| 状态       | 待实施                                                                 |
| 优先级     | P2                                                                     |
| 类别       | SSR / Hydration / 响应式布局                                           |
| 证据置信度 | 高（代码路径已静态确认）；实际视觉抖动、持续时间与设备覆盖需浏览器验证 |

## 问题摘要

动画列表与详情的网格列宽依赖 `useIsMobile()`。服务端渲染以及客户端首次渲染时，`isMobile` 固定为 `false`；组件挂载后才通过 `matchMedia` 更新真实值。因此移动端可能先得到桌面列宽，再在 hydration 完成后切换为移动端列宽，并触发 500ms 网格动画。

这里应区分两个概念：当前写法通过让服务端与客户端首屏都使用 `false`，通常可以避免 React 的 hydration 标记不一致；风险更准确地说是“hydration 后布局切换/视觉位移”，而不是已经确认会出现 hydration mismatch 警告。

## 当前证据

### 已静态确认

- `start/app/routes/anime/layout.tsx:58-68`：`useIsMobile()` 以 `useState(false)` 初始化，只在 `useEffect` 中读取 `window.matchMedia("(max-width: 1023px)")` 并订阅变化。
- `start/app/routes/anime/layout.tsx:98-101`：页面根据路由参数计算 `hasDetail`，同时调用 `useIsMobile()` 获得布局条件。
- `start/app/routes/anime/layout.tsx:113-122`：`cols` 在移动端与桌面端采用不同网格列宽；移动端为 `0fr 1fr` 或 `1fr 0fr`，桌面端还包含 `1.6fr 1fr`。
- `start/app/routes/anime/layout.tsx:129-132`：列宽通过内联 `gridTemplateColumns` 应用，并配置 `duration-500` 的列宽过渡。
- `start/app/routes/anime/layout.tsx:71-77`：`HydrateFallback` 使用 `grid-cols-[1fr_0fr]`，也没有根据真实客户端视口选择移动端详情状态。

### 需要运行时验证

- 在真实移动设备或浏览器移动端模拟器中，首屏是否能看到从桌面布局到移动布局的切换。
- 深链直接打开详情页与从列表进入详情页是否表现不同。
- 是否产生 CLS、横向闪动、短暂显示错误面板，或仅发生不可感知的内部重排。
- React 控制台是否确实没有 hydration mismatch；不能仅凭静态分析作绝对保证。

## 工作原理 / 原因

SSR 阶段没有可靠的浏览器视口宽度。`useEffect` 不在服务端执行，也会晚于客户端首次提交，因此首次 HTML 和首次 React 渲染都按 `isMobile=false` 计算。挂载后 `update()` 读取媒体查询，把移动设备上的状态改为 `true`，重新计算 `cols`。由于网格容器对 `grid-template-columns` 设置了 500ms transition，这个纠正过程会被可视化。

CSS 媒体查询由浏览器在首次样式计算时直接按视口匹配，不需要等待 React effect，因此纯布局分支通常更适合交给 CSS。`useSyncExternalStore` 能规范化媒体查询订阅并提供服务端快照，但如果服务端快照仍是 `false`，它只能改善状态订阅一致性，不能天然消除 hydration 后的视口纠正。

## 影响

- 移动端详情深链可能短暂使用桌面并排布局，再切为全屏详情。
- 500ms 动画可能放大首屏视觉位移，影响感知稳定性和可访问性。
- 布局逻辑同时存在于 React 状态、内联样式与 Tailwind class 中，后续断点调整容易失去同步。
- 是否对 Web Vitals 或交互造成显著影响尚未测量，不能将其描述为已确认的性能回归。

## 优化目标

1. 首次样式计算即得到符合当前断点的网格布局。
2. 保留桌面端“列表/详情并排与展开”的现有交互。
3. 保留移动端“详情全屏覆盖列表”的语义。
4. 视口跨越 1024px 时行为稳定，不重复注册监听器。
5. 对用户主动导航可以保留适当动画，但避免首屏纠正被动画放大。

## 非目标

- 不重新设计动画列表与详情页的视觉样式。
- 不改变 `lg` 断点数值，除非后续产品验证提出要求。
- 不在本计划中引入 UA sniffing 或按设备类型分流 SSR HTML。
- 不顺带改造其他页面的响应式逻辑。

## 方案比较

### 方案 A：使用 CSS 媒体查询决定列宽

将 `hasDetail`、`expanded` 表达为稳定的语义 class 或 data attribute，由 CSS 在 `<1024px` 与 `>=1024px` 下分别计算 `grid-template-columns`。React 只管理业务状态，不读取视口。

**优点：** 首次样式计算即可命中断点；无需 effect；最适合纯视觉布局；视口变化由 CSS 原生处理。  
**缺点：** 需要整理当前内联列宽与 Tailwind class；桌面 `expanded`、路由详情状态和移动端规则的选择器需要保持清晰。

### 方案 B：用 `useSyncExternalStore` 封装 `matchMedia`

以 `matchMedia` 的 change 事件作为外部 store，分别提供客户端快照和服务端快照。

**优点：** React 订阅模型更规范；适合当 JS 行为本身确实依赖断点时；便于复用和单元测试。  
**缺点：** 服务端仍不知道真实视口；若服务端快照固定为桌面，移动端仍可能在 hydration 后切换。若要完全消除切换，还需 Client Hints、cookie 或延迟渲染，复杂度明显增加。

### 方案 C：服务端使用 UA / Client Hints 推断视口

服务端按请求头生成不同首屏布局。

**优点：** 理论上可让 SSR HTML 更接近设备。  
**缺点：** 推断不可靠，影响缓存键和 CDN 命中；桌面缩窗无法准确表达；需要额外基础设施，不适合当前问题规模。

## 推荐方案

优先采用方案 A，把“网格列宽”完全交给 CSS 媒体查询。仅当后续确认组件中还有非样式行为必须依赖断点时，再为那部分单独采用方案 B。不要为了该布局引入 UA 检测。

同时建议首屏默认关闭列宽 transition，或只在用户导航/点击展开后增加“允许动画”的状态，以免浏览器初次布局和恢复状态时出现不必要动画。是否需要该附加处理应以浏览器录屏为依据。

## 分步骤实施计划（当前不实施代码）

1. 建立测试矩阵：移动/桌面、列表/详情深链、从列表进入详情、展开/收起、跨断点缩放。
2. 用 Performance 面板、录屏和 Layout Shift 标记记录当前基线，确认问题是否可见。
3. 将当前四类语义拆开：`hasDetail`、`expanded`、断点、是否允许过渡；避免用单个字符串同时承载所有含义。
4. 在网格容器上输出稳定的语义 class 或 `data-has-detail`、`data-expanded` 属性。
5. 在 CSS 中以 1024px 为边界定义移动端与桌面端列宽；移除布局对 `useIsMobile()` 的依赖。
6. 评估 transition：保留桌面用户操作动画，但避免首屏和断点初始化动画；必要时结合 `prefers-reduced-motion`。
7. 若仍有 JS 行为需要断点，新增集中式 `useMediaQuery`/`useSyncExternalStore`，但不再用它控制首屏网格 CSS。
8. 执行类型检查、生产构建和浏览器回归，不在本任务中顺带重构其他布局。

## 风险与取舍

- CSS 选择器若过度依赖 DOM 层级，会降低可维护性；应使用明确的 class/data attribute。
- 完全移除 JS 断点后，要确认没有代码依赖 `isMobile` 决定可访问性或焦点行为。
- 禁用首屏 transition 可能让某些现有导航动画变弱，需要在稳定性与动效之间取舍。
- `0fr` 子项若存在最小内容宽度，仍可能溢出；需验证现有 `min-w-0` 是否覆盖所有子项。

## 验证方法

- 在 375×667、390×844、768×1024、1023px、1024px、1440px 等视口测试。
- 分别直接访问列表 URL、详情 URL，并从列表点击进入/退出详情。
- 开启 CPU 降速和网络限速录屏，观察 hydration 前后网格是否切换。
- 在 DevTools Performance 中查看 Layout Shift、样式重算和 500ms transition。
- 检查控制台 hydration 警告，并用禁用 JavaScript的 SSR 截图辅助理解首屏 HTML，但不将其等同于最终交互。
- 运行 `npm run typecheck` 与 `npm run build`。

## 验收标准

- 移动端首屏不再先呈现桌面并排列宽后再切换。
- 详情深链在移动端首次可见时即为详情全屏语义。
- 桌面端列表、详情并排、展开和收起行为与当前一致。
- 1023px/1024px 边界没有内容丢失、横向溢出或反复抖动。
- 无新增 hydration 警告；减少布局切换的结论有录屏或性能记录支持。
- `typecheck` 和生产构建通过。

## 依赖 / 前置关系

- 无硬性代码依赖。
- 建议与 `016-blur-animation-motion.md` 的 reduced-motion 策略对齐，但两者可独立实施。
- 需要可运行的浏览器环境；仅静态检查不足以完成验收。

## 学习要点

- SSR 无法直接知道浏览器视口，布局优先使用 CSS 响应式能力。
- “没有 hydration mismatch”不等于“没有 hydration 后视觉变化”。
- `useSyncExternalStore` 解决的是外部状态订阅一致性，不会自动提供准确的服务端视口。
- 对布局属性添加 transition 会把短暂的状态纠正放大成用户可见动画。
