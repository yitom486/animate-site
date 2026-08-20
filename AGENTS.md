# 亚域空间 — Agent 指南

面向在本仓库工作的人与 AI。改代码前先读这一份。

## 运行时与包管理

- **包管理器是 Bun，不是 npm / pnpm / yarn。** 本地开发和 Cloudflare Pages 构建都用 bun。
- 安装：`bun install`
- 开发：`bun run dev`
- 类型检查：`bun run typecheck`
- 格式化：`bun run fmt`
- Lint：`bun run lint`
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
- 站内跳转用 `<Link>` / `<Form>`，不要用整页刷新的 `<a>` 做内部导航。
- 列表筛选、搜索条件一律放进 URL query，用 `buildListHref` / `buildListUrl` 生成，**不要在 JSX 里手写** `` `/anime?type=${x}` ``。

## 搜索

- 首页 Hero 和顶栏共用 `app/components/search-form.tsx`。
- 提交是 HTML GET：`/anime?view=search&type=...&q=...`。`type=all` 表示全类型。
- 全类型搜索会按动画 / 书籍 / 音乐 / 游戏 / 三次元分块展示；单类型走原来的扁平列表 + 分页。
- Bangumi `POST /v0/search/subjects` 的 `filter.type` 是数字数组；全类型会对每个类型并发请求，单个类型失败不应让整页崩溃。

## 数据与 Cloudflare

- 只读公开 API，不要引入需要登录的 Bangumi 接口。
- Bangumi 抓取放在 `app/lib/bangumi/server/*.server.ts`，不要从客户端组件直接 import。
- 下载资源在 `app/lib/downloads/`（漫猫 + 动漫花园）；资讯在 `app/lib/news/`。
- 缓存目前是进程内 `Map`，接口按 KV 可替换来写，但还没接 Cloudflare KV。
- Worker 里不要用 Node `fs` / jsdom；外网 `fetch` 必须带超时。
