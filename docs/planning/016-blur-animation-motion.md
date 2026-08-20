# 016 模糊、无限动画与动效降级

## 元信息

| 字段       | 值                                                                    |
| ---------- | --------------------------------------------------------------------- |
| 状态       | 待实施                                                                |
| 优先级     | P2（可访问性优先于性能猜测）                                          |
| 类别       | 可访问性 / 动效 / 渲染性能                                            |
| 证据置信度 | 高（模糊与无限动画代码已静态确认）；GPU、电量和掉帧影响需设备 profile |

## 问题摘要

全局玻璃样式使用 16–18px `backdrop-filter: blur(...)`，页面装饰包含永久运行的 float/spin 动画；全屏 HamsterLoader 内还有多个 320ms–3.4s 循环动画。当前这些实现片段没有 `prefers-reduced-motion` 降级。

应先补齐“减少动态效果”可访问性路径，再根据移动端 profile 决定模糊强度和动画数量是否需要降级。同时应评估全屏 loader 是否过度覆盖页面，能否改为触发区域的局部 pending。静态代码可以确认渲染特性存在，但不能仅据此断言 GPU 瓶颈或耗电严重。

## 当前证据

### 已静态确认

- `start/app/app.css:160-173`：`.celadon-glass` 和 `.celadon-glass-strong` 分别使用 18px、16px 的 `backdrop-filter`，并包含 WebKit 前缀。
- `start/app/app.css:190-213`：定义 `float-slow`、`spin-very-slow`，对应 utility 使用 7s 和 36s 的 `infinite` 动画。
- `start/app/components/hamster-loader.tsx:5-11`：loader 显示时渲染固定定位、覆盖整个视口的遮罩，遮罩和卡片均带 backdrop blur。
- `start/app/components/hamster-loader.tsx:23-57`：组件内定义转轮、身体、阴影、腿、手臂、耳朵、眼睛和鼻子等多组关键帧。
- `start/app/components/hamster-loader.tsx:59-68`：多个动画永久循环，其中身体、阴影、腿和手臂以 320ms 高频运行，转轮为 0.9s。
- 上述 `start/app/app.css:190-213` 与 `start/app/components/hamster-loader.tsx:23-68` 片段中均未定义 `prefers-reduced-motion` 分支。

### 需要运行时验证

- 低端 Android、iOS Safari、桌面集显上的合成层数量、GPU 时间、主线程帧和电量影响。
- `backdrop-filter` 覆盖面积、层叠数量以及滚动时是否反复重绘。
- loader 的平均显示时长与出现频率；短请求是否产生闪烁。
- reduced-motion 用户在当前浏览器/系统组合下的实际体验。
- 将全屏 pending 改为局部 pending 是否会导致用户误操作或状态不清楚。

## 工作原理 / 原因

`backdrop-filter` 对元素背后的像素做过滤。浏览器通常会使用合成层加速，但大面积、叠层、动态背景或滚动可能增加离屏缓冲与合成成本，具体代价高度依赖浏览器和 GPU。

CSS `animation: ... infinite` 会在元素存在期间持续推进。只动画 transform/opacity 通常比布局属性便宜，但多个高频动画仍可能占用合成资源。系统的 `prefers-reduced-motion: reduce` 表达用户希望减少非必要运动；应用应停用或显著简化装饰动画，而不是仅把速度稍微调慢。

全屏 pending 会让所有视觉动效和 blur 集中出现，并阻塞整个页面的感知交互。若请求只影响局部区域，局部 pending 更能表达影响范围；但涉及路由整体切换或必须防止重复操作时，全屏反馈仍可能合理。

## 影响

- 对运动敏感用户，持续旋转、弹跳与漂浮可能造成不适或干扰。
- 在部分移动设备上，大面积模糊和多层动画可能降低帧率、增加功耗；严重程度尚未测量。
- 全屏 loader 可能遮挡仍可使用的内容，并让短暂请求显得更重。
- 过度削减动效也可能损失品牌感和明确的加载反馈，需要分层降级。

## 优化目标

1. 尊重 `prefers-reduced-motion: reduce`，非必要循环动画可停止或替换为静态状态。
2. 在低能力/窄屏设备上提供可控的 blur 降级，不牺牲文本可读性。
3. 按请求影响范围选择局部或全局 pending。
4. 保留默认模式下的设计语言，同时控制动画数量与持续成本。
5. 所有 GPU/帧率结论以 profile 为依据。

## 非目标

- 不删除全部动画或玻璃视觉。
- 不以 UA 名单硬编码“低端设备”。
- 不把所有 loading 状态强制改成同一种组件。
- 不在未测量前宣称某个 blur 值必然导致性能问题。

## 方案比较

### 方案 A：纯 CSS 媒体查询分级降级

在 `prefers-reduced-motion: reduce` 下禁用装饰与 HamsterLoader 循环动画、缩短或取消过渡；在窄屏/特定能力查询下减小或移除 backdrop blur，以更不透明背景补偿对比度。

**优点：** 无 JS hydration 问题；直接响应系统设置；改动集中；浏览器可在样式层处理。  
**缺点：** CSS 只能粗粒度判断，无法知道设备真实 GPU 能力；组件内注入的 style 需要统一纳入策略。

### 方案 B：组件级动效模式与局部 pending

引入统一 motion policy/hook，组件按 `full | reduced | none` 渲染不同版本；路由或卡片使用局部 skeleton/spinner，仅全局导航使用覆盖层。

**优点：** 可按业务语义精细控制；可完全不渲染复杂 SVG 动画；便于测试不同状态。  
**缺点：** 状态和组件复杂度更高；若 JS 媒体查询处理不当，会重复 013 的 hydration 后切换问题。

### 方案 C：保持现状，仅降低动画速度或 blur 数值

**优点：** 最小视觉变化。  
**缺点：** 不能完整满足 reduced-motion；速度变慢不等于减少运动；没有解决全屏 pending 的范围问题。

## 推荐方案

以方案 A 作为基线：统一增加 `prefers-reduced-motion`，让装饰循环动画停止，加载器保留静态图形与文字/状态语义；移动端 blur 降级应先 profile，再用更不透明背景保证可读性。

随后按业务场景选择性实施方案 B：优先把只影响局部内容的请求改成局部 pending，全屏路由切换仍可保留轻量全局反馈。不要用纯 JS 断点控制视觉降级，避免新引入首屏切换。

## 分步骤实施计划（当前不实施代码）

1. 盘点 `.celadon-glass`、`.celadon-glass-strong`、两种全局动画 utility 和 `HamsterLoader` 的实际使用页面与覆盖面积。
2. 建立基线：典型桌面与移动设备录制滚动、loader 显示、路由切换的 Performance trace。
3. 定义动效等级：默认保留品牌动效；reduced 模式移除持续装饰动画和缩放/漂浮，只保留必要的即时状态变化。
4. 将 HamsterLoader 的关键帧样式纳入可覆盖的统一 CSS，或在注入样式中加入 reduced-motion 规则；保证静态版本仍有 `role=status` 和加载文字。
5. 为全局 utility 增加 reduced-motion 覆盖，并对 transition 一并审查，而非只处理 keyframes。
6. 在窄屏候选方案中比较 18/16px、较低 blur 和无 blur + 更高背景不透明度，检查对比度与视觉一致性。
7. 根据请求归属列出“局部 pending”候选，先迁移一个高频且边界清晰的场景验证模式。
8. 复测帧率、合成层、视觉对比和 reduced-motion；只采用有数据或明确可访问性价值的降级。
9. 运行类型检查、构建和跨浏览器回归。

## 风险与取舍

- 直接移除 blur 但不提高背景不透明度，可能降低文字对比度。
- `prefers-reduced-motion` 不应隐藏加载状态；只能简化运动，仍需可感知的文本或静态指示。
- 组件内 `<style>` 与全局 CSS 优先级可能导致覆盖失败，需要实测生成顺序。
- 局部 pending 若未禁用相关提交按钮，可能造成重复请求。
- Safari 对 backdrop filter、合成层和媒体查询的表现需单独验证。

## 验证方法

- 在操作系统和 DevTools 中分别启用/关闭 reduced-motion，检查所有列出的循环动画。
- reduced 模式下确认 SVG 可静态显示、状态文字可读、屏幕阅读器仍收到 polite 状态。
- 用 Chrome Performance/Rendering、Safari Web Inspector 或目标设备工具观察帧率、paint、composite layers。
- 在低端移动设备上重复滚动、显示 loader 和切换路由，记录而非主观猜测。
- 对 blur 降级版本做截图对比和文本对比度检查。
- 验证局部 pending 期间仅相关区域不可重复操作，其他区域行为符合预期。
- 运行 `npm run typecheck` 和 `npm run build`。

## 验收标准

- 系统选择 reduced-motion 时，非必要无限循环动画停止或变成静态表示。
- 加载状态在无动画时仍可理解、可被辅助技术感知。
- 移动端 blur 是否降级由 profile 决定；若降级，文本对比和品牌视觉可接受。
- 不新增 hydration 后的动效模式闪变。
- 局部 pending 仅在明确场景实施，且无重复提交或错误可交互状态。
- 性能结论附带设备、浏览器、场景与前后数据。

## 依赖 / 前置关系

- reduced-motion CSS 无硬性依赖，可独立实施。
- 若引入 JS motion hook，应与 `013-mobile-hydration-layout.md` 的 SSR 策略对齐。
- 局部 pending 依赖逐个确认请求边界与交互所有权。
- 需要真实移动设备或可靠的远程设备测试才能完成性能验收。

## 学习要点

- `transform` 动画通常较便宜，但“较便宜”不代表无限、多层动画没有成本。
- reduced-motion 是用户偏好和可访问性要求，不应等待性能问题出现才支持。
- backdrop blur 的成本与面积、叠层、背景变化和浏览器实现相关，必须 profile。
- 加载反馈应匹配操作影响范围：局部操作优先局部 pending，全局阻塞需有明确理由。
