# 亚域空间 · Celadon Portal

基于 [Bangumi](https://bgm.tv) 公开数据的条目门户：多类型浏览（动画 / 书籍 / 音乐 / 游戏 / 三次元）、列表·详情分栏、**各板块社区日志**、每日放送日历与多源资讯聚合。

技术栈：**React Router v7（Framework Mode / SSR）· React 19 · TypeScript · Tailwind CSS v4**，UI 基于 [Base UI](https://base-ui.com) + shadcn 风格组件，部署在 **Cloudflare Pages**。

> ⚠️ **本项目使用 [Bun](https://bun.sh) 作为唯一包管理器**（本地开发与 Cloudflare 构建都用 bun）。  
> **请勿使用 `npm` / `pnpm` / `yarn`** —— 会与 `bun.lock` 冲突。仓库已忽略 `package-lock.json`。

## 功能概览

| 能力           | 说明                                                                 |
| -------------- | -------------------------------------------------------------------- |
| 条目列表       | 排行 / 注目 / 最新 / 搜索；分类、平台、系列等 browse（标签云暂缓）   |
| 详情分栏       | 桌面列表+详情并排，可展开全屏；**手机端全屏且一步展示完整信息**      |
| 多类型适配     | 非动画隐藏 B 站/下载等动画插件；职员字段、关联条目按类型展示         |
| 板块日志       | `/anime/blog`、`/book/blog`… 列表 + 站内消毒正文                     |
| 日历与卡片增强 | 每日放送；批量补简介 / staff，避免日历 N+1                           |
| 首页           | Hero 搜索、资讯面板                                                  |

## 快速开始

```bash
bun install
bun run dev
```

开发服务器默认 `http://localhost:5173`（端口占用会顺延）。

## 常用命令

| 命令                | 说明                                                                  |
| ------------------- | --------------------------------------------------------------------- |
| `bun install`       | 安装 / 同步依赖（写入 `bun.lock`）                                    |
| `bun run dev`       | 本地开发，热更新                                                      |
| `bun run typecheck` | 生成路由类型 + `tsc`                                                  |
| `bun run fmt`       | Oxfmt 格式化                                                          |
| `bun run lint`      | Oxlint 检查                                                           |
| `bun run build`     | 生产构建 → `build/client` + `build/server`                            |
| `bun run start`     | `wrangler pages dev` 预览构建产物（贴近线上）                         |

## 部署（Cloudflare Pages）

- 构建输出：[`wrangler.toml`](wrangler.toml) 中 `pages_build_output_dir = "./build/client"`
- 因仓库只有 `bun.lock`，Pages 安装步骤会用 `bun install`
- **Build command**：`bun run build`
- 保留 `functions/[[path]].ts`，由 React Router 服务端产物处理请求

## 目录结构

```
app/
├── routes.ts               # 显式路由表
├── routes/
│   ├── home.tsx            # 首页
│   ├── anime/              # /anime 列表壳 + 详情 Outlet
│   ├── blog/               # /:section/blog 多类型日志
│   └── api/                # 同源 BFF（缓存、裁剪、超时）
├── components/             # 业务组件 + ui/
└── lib/
    ├── bangumi/            # 类型、菜单、参数；抓取在 server/
    ├── cache/              # LRU + single-flight
    ├── downloads/ · news/ · bilibili/
    └── upstream.ts
docs/
├── architecture.md         # 当前架构（推荐先读）
├── planning/               # 性能与工程优化规划
└── …
```

## 数据来源与说明

- **Bangumi**：旧版 `/calendar` + v0 `/subjects`、搜索、人员、章节、关联；吐槽走 next.bgm.tv 公开接口；板块日志为官网 HTML / RSS 抓取。
- 同源 `app/routes/api/*` 作 BFF：聚合上游、裁剪字段、进程内缓存（设计上可换 Cloudflare KV，尚未接）。
- 日志正文经 `sanitize-html` 消毒，并用 `.blog-prose` 约束手机端溢出；资讯用 `opencc-js` 繁→简。
- 本站不存储或分发影视、字幕、下载文件；观看/下载/字幕仅为第三方公开检索跳转或展示。
- Bangumi、Bilibili、漫猫、动漫花园、acgrip 等名称及其内容归各自权利人所有。

## 相关文档

| 文档                                                         | 说明                         |
| ------------------------------------------------------------ | ---------------------------- |
| [架构说明](./docs/architecture.md)                           | **当前**路由、数据流与目录职责 |
| [Agent / 工程约定](./AGENTS.md)                              | 包管理、路由、取数等硬规则   |
| [性能与工程优化规划](./docs/planning/README.md)              | 分项优化索引（含 020 多类型） |
| [Bangumi API 调研](./docs/bangumi-api.md)                    | 上游接口笔记                 |
| [外部评分数据源调研](./docs/external-ratings.md)             | AniList / MAL 等             |
| [需求文档（历史）](./docs/requirements.md)                   | 早期设想，部分已过时         |

## 许可证

暂未指定许可证。若计划公开复用或接受外部贡献，建议补充许可证文件。
