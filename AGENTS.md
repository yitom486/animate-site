# 亚域空间 — Agent 指南

面向在本仓库工作的人与 AI。改代码前先读这一份。

## 运行时与包管理

- **包管理器是 Bun，不是 npm / pnpm / yarn。** 本地开发和 Cloudflare Pages 构建都用 bun。
- 安装：`bun install`
- 开发：`bun run dev`
- 类型检查：`bun run typecheck`
- 格式化：`bun run fmt`
- Lint：`bun run lint`
- 主题颜色规范检查：`bun run check:theme`
- 缓存回归检查：`bun run check:cache`
- 客户端查询回归检查：`bun run check:queries`
- RSS / D1 回归检查：`bun run check:news`
- Worker 实际运行时检查：`bun run check:news-runtime`（Bun 构建，Node 启动隔离 workerd 与模拟 HTTPS 源）
- 添加 shadcn 组件：`bunx shadcn@latest add <component>`
- **不要**运行 `npm install` / `pnpm install` / `yarn`。它们会生成 `package-lock.json` 等多余锁文件，与 `bun.lock` 冲突，并可能让 Cloudflare 用错包管理器。
- 唯一受追踪的锁文件是 **`bun.lock`**；`package-lock.json` 已在 `.gitignore` 中忽略。加依赖后确认只改了 `package.json` + `bun.lock`。

应用运行时仍是 React Router v7 + Vite，生产部署在 Cloudflare Pages Functions（Worker），和「用 Bun 管依赖」是两件事。

## 缩进与 OXC

源码约定 **2 空格缩进**，不用 Tab。

回车后变成 4 空格，是因为编辑器默认 `tabSize = 4`，仓库原先没有 `.editorconfig`。已通过这些文件对齐：

| 文件                    | 作用                                      |
| ----------------------- | ----------------------------------------- |
| `.editorconfig`         | 编辑器按 2 空格缩进（含回车后的新行）     |
| `.oxfmtrc.json`         | Oxfmt（OXC 格式化）`tabWidth: 2`          |
| `.oxlintrc.json`        | Oxlint                                    |
| `.vscode/settings.json` | Cursor / VS Code 使用 2 空格 + Oxc 格式化 |

改完 TypeScript / TSX 后用 `bun run fmt` 格式化，不要把缩进改回 4 空格。

Zed 用户配置（Windows）在 `%APPDATA%/Zed/settings.json` 的 `languages` 里按语言设 `tab_size`。本仓库还有 `.zed/settings.json` 和 `.editorconfig`，三者都应是 2 空格。Zed 打开本仓库时会读 `.editorconfig`，它的优先级高于编辑器默认值。

## React Router v7

- 框架模式，路由写在 `app/routes.ts`。
- 页面用 `loader` / `clientLoader` 取数，不要在组件里 `useEffect` 打 Bangumi。
- 评论分页、详情侧栏和首页详情抽屉使用 TanStack Query 请求同源 API，查询定义集中在 `app/lib/subject-queries.ts`；详情预览共用 query key，复用 `app/lib/query-client.ts`，传递取消信号，不再叠加组件级 Map。页面主数据仍由路由 loader 管理，不在服务端全局共享 QueryClient。浏览器查询缓存与 Cloudflare CDN、Worker L1/L2 分开配置和观察。
- 站内跳转用 `<Link>` / `<Form>`，不要用整页刷新的 `<a>` 做内部导航。
- 列表筛选、搜索条件一律放进 URL query，用 `buildListHref` / `buildListUrl` 生成，**不要在 JSX 里手写** `` `/anime?type=${x}` ``。

## UI 组件与亮暗主题

- **客户要求：品牌围绕淡粉色。** 亮色采用淡粉背景与表面、足够对比度的深粉强调色；暗色采用带轻微粉调的深灰与柔粉强调，不改成绿色品牌。减少模板感应通过信息层级、布局和装饰取舍实现，不能擅自换掉客户指定品牌色。
- 前端任务先读取全局共享规则 `/home/tomy/.agent/frontend.md`；界面设计与交互规范遵循本地技能 [`.agents/skills/modern-acgn-ui/SKILL.md`](./.agents/skills/modern-acgn-ui/SKILL.md)（现代二次元与番组媒体设计，注重海报视觉第一动线、精致微动效与粉色品牌融合，坚决摒弃老旧日本网站的拥挤表格排版与 B2B/SaaS 呆板风格）。项目现有基础体系为 **shadcn/ui + Base UI（base-nova）**，不要静默切到 Radix。
- 优先复用 `app/components/ui/`；新增组件通过 MCP 按 **beUI → Magic UI → shadcn/ui** 查询。聊天与 Agent 界面优先 assistant-ui。
- 第三方组件必须通过 `bunx --bun shadcn@latest add <已确认的组件或 registry URL>` 真实安装，不手工复制或手写近似实现冒充安装结果。弹层、选择器、焦点管理等通用交互优先由已有组件承担；业务布局可以用 HTML + Tailwind CSS。
- **颜色统一使用 CSS 变量 + Tailwind 语义类**：颜色值只在 `app/app.css` 的主题变量中定义，经 `@theme inline` 映射后使用 `bg-background`、`bg-card`、`text-foreground`、`text-muted-foreground`、`border-border`、`bg-primary` 等。
- **业务 TS/TSX、内联样式和业务 CSS 不得硬编码颜色**：禁止 `bg-white`、`text-slate-500`、`border-rose-100` 等原始色板，以及十六进制、RGB/HSL/OKLCH 颜色字面量；透明度可以使用语义类修饰符，如 `bg-primary/10`。`transparent`、`currentColor` 可用于继承与透明效果。
- 新语义颜色必须同时在 `:root` 和 `.dark` 中定义，包含成功、警告、评分、播放器和遮罩；禁止用滤镜反转页面或给每个组件临时补一套 `dark:` 色板。
- CLI 安装的 vendor 组件保持原件，差异通过主题 token、调用方或薄适配层处理。第三方固定图像/品牌资产的原始颜色不作为主题颜色改写。
- 主题支持亮色、暗色与跟随系统；显式选择应持久化，并在首屏绘制前生效。没有实际执行的视觉、键盘或主题验证必须标注“未验证”。
- **硬性规定：所有运行时主题与全局配色切换必须使用 View Transitions API**（`document.startViewTransition`），包括手动亮暗切换和跟随系统变化。统一使用 `app/lib/theme-transition.ts`；主题 DOM 与 React 状态在更新回调中同步提交，不得用 CSS `transition-colors` 或其他动画冒充。支持 API 时不得绕过；减少动态效果时使用 `skipTransition()` 跳过动画。仅 API 不可用或启动失败时可直接提交最终主题；首屏初始化仍须在绘制前同步完成。普通 hover、focus、禁用等局部交互状态不属于全局主题切换。
- 设计优先搜索、放送与作品信息，避免无产品理由的光晕、渐变、玻璃叠层、密集徽章和无信息价值的英文装饰标题；动效遵循 `prefers-reduced-motion`。

## 搜索

- 首页 Hero 和顶栏共用 `app/components/search-form.tsx`。
- 提交是 HTML GET：`/anime?view=search&type=...&q=...`。`type=all` 表示全类型。
- 全类型搜索会按动画 / 书籍 / 音乐 / 游戏 / 三次元分块展示；单类型走原来的扁平列表 + 分页。
- Bangumi `POST /v0/search/subjects` 的 `filter.type` 是数字数组；全类型会对每个类型并发请求，单个类型失败不应让整页崩溃。

## 数据与 Cloudflare

- 只读公开 API，不要引入需要登录的 Bangumi 接口。
- Bangumi 抓取放在 `app/lib/bangumi/server/*.server.ts`，不要从客户端组件直接 import。
- 下载资源在 `app/lib/downloads/`（漫猫 + 动漫花园）；资讯在 `app/lib/news/`。
- 资讯只订阅两个自有频道（动漫 / 漫展）。名称和周期在 `app/lib/news/config.ts`；每个频道可配置多个 HTTPS RSS（`NEWS_*_RSS_URL`、`NEWS_*_RSS_URL_SECONDARY`、`NEWS_*_RSS_URLS`），由同步 Worker Secrets 提供，不得写进 Git、共享配置、前端产物、API 或日志。本地真实值仅放在被忽略的 `workers/news-sync/.dev.vars`。正文优先 content:encoded，经 HTML 过滤后入库；同频道按规范化 `source_url` 合并去重（保留封面与更长正文），GUID 仍唯一。保留来源/漫展核实提示。
- GitHub 发布还须检查历史：仅删除当前源码中的 RSS 地址不足以隐藏旧提交。当前原工作分支历史曾包含地址，不得直接推送或合并其历史；本地 `publish/private-rss` 已准备为无敏感历史的发布分支。后续更新应在该安全历史上提交或迁移净化后的变更，不强推或擅自改写共享历史。
- 资讯存储为 D1，绑定名 `NEWS_DB`，生产和预览库分离；站点只读，`workers/news-sync/` 定时拉取并保存 ETag。失败保留旧数据；仅按发布时间清理超过 30 天的文章，不按 RSS 中是否消失删除。迁移在 `migrations/`，详情见 `docs/news-storage.md`。
- 缓存目前为进程内 LRU（L1）+ Cloudflare Cache API（L2），尚未接 KV；缓存写入必须 `await` 或交给请求上下文的 `waitUntil`，不得使用悬空 Promise。
- 静态资源由 `public/_routes.json` 排除 Functions，缓存头在 `public/_headers` 配置。内容哈希资源可用 `immutable`，按年份原地更新的 JSON 不可长期 immutable。
- 公开 API 按端点设置缓存策略，保留搜索词、页码、类型、条目 ID 等业务参数；不得全站忽略 query，也不得因 `/api/` 前缀一律绕过缓存。
- HTML 和 root loader 含主题 Cookie，使用 private 缓存策略。Cloudflare CDN 命中率与应用 L1/L2 命中率分开观察；部分公开 API 的 `X-App-Cache` 提供 `L1_HIT` / `L2_HIT` / `MISS` / `COALESCED` 诊断，不能据此宣称 CDN 已命中。
- Worker 里不要用 Node `fs` / jsdom；外网 `fetch` 必须带超时。

- 成品推送入口：同步 Worker 的 `POST /feeds/push`，Bearer `NEWS_PUSH_TOKEN`；与 RSS 共用消毒和 GUID upsert，保留原 cron。协议见 docs/news-storage.md，密钥不得入 Git/聊天。
- 成品正文直接按 GFM/HTML 二选一展示，不调用模型再加工、不追加重复配图。仅放行 `https://www.youtube-nocookie.com/embed/<视频ID>` 与 `https://player.bilibili.com/player.html?...` 的合规 iframe，严格解析实际协议/主机/路径/标识，保留原平台链接；详见 `docs/news-markdown.md`。RSS `news:version`（`urn:anime-rss:news:1`）与推送共用版本保护；不得让同发布时间无版本的旧 RSS、低版本或按来源合并的旧长正文覆盖新成品。
