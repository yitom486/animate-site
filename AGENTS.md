# AGENTS.md

面向 AI 编码助手 / 协作者的工程约定。开始动手前请通读。

## 🚨 第一铁律：只用 Bun，禁止 npm/pnpm/yarn

本项目用 **Bun** 作为唯一的包管理器和运行时，**本地开发和 Cloudflare Pages 构建都用 bun**。

- ✅ `bun install` / `bun add <pkg>` / `bun run <script>`
- ❌ **绝不要**运行 `npm install`、`pnpm install`、`yarn` —— 它们会生成 `package-lock.json` / `pnpm-lock.yaml`，与 `bun.lock` 并存、互相打架，并可能让 Cloudflare 误用错误的包管理器。
- 唯一受追踪的锁文件是 **`bun.lock`**；`package-lock.json` 已在 `.gitignore` 中忽略。
- 加依赖后务必确认改动落在 `package.json` + `bun.lock`，**不应**出现任何其它锁文件。

> 历史教训：曾有人用 `npm install` 加依赖，只更新了 `package-lock.json` 而没更新 `bun.lock`，导致 `bun.lock` 与 `package.json` 失同步、CI 装不全包。

## 技术栈

- **React Router v7**（Framework Mode，SSR + `clientLoader`）· **React 19** · **TypeScript（strict）**
- **Tailwind CSS v4**（`@tailwindcss/vite`）；`cn()` 来自 `~/lib/utils`
- UI：**Base UI**（`@base-ui/react`）+ shadcn 风格封装，组件在 `app/components/ui/`，图标用 `lucide-react`
- 部署：**Cloudflare Pages**（`wrangler`），适配器 `@react-router/cloudflare`

## 常用命令

```bash
bun install          # 安装/同步依赖
bun run dev          # 本地开发（HMR），默认 5173
bun run typecheck    # react-router typegen && tsc —— 改完代码必跑
bun run build        # 生产构建 → build/{client,server}
bun run start        # wrangler pages dev：本地预览构建产物
```

提交前至少跑 `bun run typecheck`（必要时 `bun run build`）确认通过。

## 架构与约定

- **路由**：在 [`app/routes.ts`](app/routes.ts) 显式注册。`/anime` 是三栏布局壳（`layout.tsx`），列表常驻、`/anime/:id` 详情走右栏 `<Outlet/>`；`/anime/blog` 是独立全屏页。
- **数据层**：上游 Bangumi 等接口统一封装在 `app/lib/<source>/`（`bangumi` / `news` / `bilibili` / `comicat`），对外从各自的 `index.ts` 导出。
- **BFF 资源路由**：`app/routes/api/*` 作为同源接口，聚合上游、裁剪字段、加内存缓存（`createCache`，上线可换 Cloudflare KV）。客户端用 `clientLoader` + 浏览器内存缓存实现 0ms 切页。
- **图片**：Bangumi 图片需 `toHttps()` 升级协议避免 307；列表封面优先级见 `lib/anime-meta.ts` 的 `getCoverUrl`。
- **响应式**：桌面是并排三栏（内联 `gridTemplateColumns` 动画）；移动端（`< lg`）详情全屏覆盖、导航走汉堡抽屉（手风琴折叠）。改布局时注意 `useIsMobile()` 分支。
- **文案**：UI 与注释以中文为主，保持与现有风格一致。

## 风格

- 跟随周围代码的命名、缩进、注释密度，不引入新风格。
- 复用 `app/components/ui/` 与 `app/lib/*` 既有工具，避免重复造轮子。
- 改 `app/lib/bangumi/types*.ts` 等类型时，记得同步用到它的取数与渲染处。
