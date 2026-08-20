# CLAUDE.md

本文件给 Claude Code 看。完整工程约定见 [AGENTS.md](AGENTS.md)，此处只强调最关键的几条。

## 🚨 只用 Bun —— 禁止 npm / pnpm / yarn

本项目用 **Bun** 作为唯一包管理器与运行时，**本地和 Cloudflare Pages 构建都用 bun**。

- ✅ `bun install`、`bun add <pkg>`、`bun run <script>`
- ❌ **绝不要**跑 `npm install` / `pnpm` / `yarn` —— 会生成多余锁文件、与 `bun.lock` 冲突、并可能让 Cloudflare 用错包管理器。
- 唯一锁文件是 **`bun.lock`**；`package-lock.json` 已被 `.gitignore` 忽略。加完依赖确认只动了 `package.json` + `bun.lock`。

## 必跑检查

改完代码后运行：

```bash
bun run typecheck   # react-router typegen && tsc
```

必要时再 `bun run build` 确认构建通过。

## 技术栈速记

React Router v7（SSR/framework mode）· React 19 · TypeScript · Tailwind v4 · Base UI(`@base-ui/react`)+ shadcn 风格组件 · 部署 Cloudflare Pages(wrangler)。

数据层在 `app/lib/<source>/`，同源 BFF 接口在 `app/routes/api/*`（带内存缓存）。其余约定见 [AGENTS.md](AGENTS.md)。
