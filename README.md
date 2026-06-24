# 亚域空间 · Celadon Portal

一个基于 [Bangumi](https://bgm.tv) 数据的番剧资料站：每日放送日历、排行榜 / 分类 / 季度浏览、条目详情、动画日志（站内博客）与多源资讯聚合。

技术栈：**React Router v7（Framework Mode / SSR）· React 19 · TypeScript · Tailwind CSS v4**，UI 基于 [Base UI](https://base-ui.com) + shadcn 风格组件，部署在 **Cloudflare Pages**。

> ⚠️ **本项目使用 [Bun](https://bun.sh) 作为唯一包管理器与运行时**（本地开发与 Cloudflare 构建都用 bun）。
> **请勿使用 `npm` / `pnpm` / `yarn`** —— 否则会生成 `package-lock.json` 之类的多余锁文件、与 `bun.lock` 冲突。仓库已在 `.gitignore` 中忽略 `package-lock.json`。

## 快速开始

```bash
# 安装依赖
bun install

# 启动开发服务器（HMR）
bun run dev
```

开发服务器默认在 `http://localhost:5173`（端口被占用会自动顺延）。

## 常用命令

| 命令 | 说明 |
| --- | --- |
| `bun install` | 安装 / 同步依赖（写入 `bun.lock`） |
| `bun run dev` | 本地开发，带热更新 |
| `bun run typecheck` | 生成路由类型 + `tsc` 全量类型检查 |
| `bun run build` | 生产构建，产物在 `build/`（`client/` 静态资源，`server/` 服务端代码） |
| `bun run start` | 用 `wrangler pages dev` 在本地预览构建产物（贴近线上 Cloudflare 环境） |

## 部署（Cloudflare Pages）

- 构建输出目录由 [`wrangler.toml`](wrangler.toml) 指定：`pages_build_output_dir = "./build/client"`。
- Cloudflare Pages 会根据仓库里的锁文件**自动检测包管理器**；因为只保留 `bun.lock`，安装步骤会使用 `bun install`。
- 控制台里的 **Build command** 设为 `bun run build` 即可。

## 目录结构

```
app/
├── routes/                 # 路由（React Router 文件式 + routes.ts 显式注册）
│   ├── home.tsx            # 首页
│   ├── anime/             # /anime 三栏布局：列表 + 详情 Outlet、动画日志页
│   └── api/               # 同源资源路由（聚合上游接口、带内存缓存）
├── components/             # 业务组件
│   └── ui/                # Base UI 封装的 shadcn 风格基础组件
└── lib/
    ├── bangumi/           # Bangumi 数据层（calendar / 列表 / 详情 / 搜索 / 卡片增强）
    ├── news/              # 资讯聚合（RSS 解析、繁→简等）
    ├── bilibili/          # B 站数据源（脚手架）
    └── comicat/           # 漫猫数据源（脚手架）
```

## 数据来源

- **Bangumi API**：旧版 `https://api.bgm.tv/calendar`（每日放送）+ v0 `https://api.bgm.tv/v0/subjects/{id}`（条目详情、人员、章节）。
- 同源 `app/routes/api/*` 作为 BFF：聚合上游、裁剪字段、加内存缓存（上线可换 Cloudflare KV）。
- 动画日志正文经 `sanitize-html` 消毒；资讯文本用 `opencc-js` 做繁体→简体转换。

---

更详细的工程约定见 [AGENTS.md](AGENTS.md)。
