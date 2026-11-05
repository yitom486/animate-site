# 亚域空间 · Celadon Portal

基于 [Bangumi](https://bgm.tv) 公开数据的条目门户：多类型浏览（动画 / 书籍 / 音乐 / 游戏 / 三次元）、列表·详情分栏、**各板块社区日志**、每日放送日历与自有 RSS 资讯。

技术栈：**React Router v7（Framework Mode / SSR）· React 19 · TypeScript · Tailwind CSS v4**，UI 基于 [Base UI](https://base-ui.com) + shadcn 风格组件，部署在 **Cloudflare Pages**。

界面保留客户指定的淡粉色品牌，支持亮色、暗色和跟随系统。颜色由 `app/app.css` 的 CSS 变量统一定义，业务组件使用 Tailwind 语义类。播放平台与下载来源使用 beUI Tabs，日期选择使用 shadcn Calendar；新增组件均通过 shadcn CLI 安装，保留已有 Base UI 体系。

> ⚠️ **本项目使用 [Bun](https://bun.sh) 作为唯一包管理器**（本地开发与 Cloudflare 构建都用 bun）。  
> **请勿使用 `npm` / `pnpm` / `yarn`** —— 会与 `bun.lock` 冲突。仓库已忽略 `package-lock.json`。

## 功能概览

| 能力           | 说明                                                                    |
| -------------- | ----------------------------------------------------------------------- |
| 条目列表       | 排行 / 关注 / 最新 / 搜索；分类、平台、系列等 browse（标签云暂缓）      |
| 详情分栏       | 桌面列表+详情并排，可展开全屏；**手机端全屏且一步展示完整信息**         |
| 多类型适配     | 非动画隐藏 B 站/下载等动画插件；职员字段、关联条目按类型展示            |
| 流媒体与下载源 | **三级漏斗降级**：bangumi-data 静态正版直达 → 动态选集探测 → 搜索页保底 |
| 板块日志       | `/anime/blog`、`/book/blog`… 列表 + 站内消毒正文                        |
| 日历与卡片增强 | 每日放送；批量补简介 / staff，避免日历 N+1                              |
| 首页           | Hero 搜索、资讯面板                                                     |

## 快速开始

```bash
bun install
bun run dev
```

开发服务器默认 `http://localhost:5173`（端口占用会顺延）。

## 常用命令

| 命令                    | 说明                                          |
| ----------------------- | --------------------------------------------- |
| `bun install`           | 安装 / 同步依赖（写入 `bun.lock`）            |
| `bun run dev`           | 本地开发，热更新                              |
| `bun run typecheck`     | 生成路由类型 + `tsc`                          |
| `bun run fmt`           | Oxfmt 格式化                                  |
| `bun run lint`          | Oxlint 检查                                   |
| `bun run check:theme`   | 检查业务颜色硬编码及亮暗主题变量完整性        |
| `bun run check:queries` | 检查客户端请求去重、取消、重试与分页缓存      |
| `bun run build`         | 生产构建 → `build/client` + `build/server`    |
| `bun run start`         | `wrangler pages dev` 预览构建产物（贴近线上） |

## 部署（Cloudflare Pages）

资讯接入自有“日本动漫资讯 / 国内漫展资讯”RSS，使用 D1 保存最近 30 天内容并提供站内详情。独立 Worker 定时同步，生产与预览数据库分离。开发、迁移、同步和运维说明见 [资讯 RSS 与 D1](./docs/news-storage.md)。本地先运行 `bun run news:migrate:local`、`bun run news:sync:local`；回归检查为 `bun run check:news`。

真实 RSS 地址只配置在同步 Worker 的 Cloudflare Secrets 中，不写入仓库或前端构建。本地开发先按 `workers/news-sync/.dev.vars.example` 创建被忽略的私有配置。

缓存分层、线上诊断和部署后的验收方法见 [缓存诊断与优化](./docs/cache-diagnosis.md)。`public/_routes.json` 让静态资源绕过 Functions，`public/_headers` 分别控制哈希资源与可更新 JSON 的缓存时间；应用数据缓存与 CDN 整站命中率分别观察。缓存逻辑可运行 `bun run check:cache` 验证。

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
- **bangumi-data**：开源番剧平台数据集，作为流媒体正版播放（B站/巴哈姆特動畫瘋/Netflix等）与蜜柑计划（Mikan）条目的静态一级索引，彻底规避云端动态爬取时的风控拦截（规划见 [021](./docs/planning/021-bangumi-data-fallback-and-streaming.md)）。
- 同源 `app/routes/api/*` 作 BFF：聚合上游、裁剪字段、进程内缓存（设计上可换 Cloudflare KV，尚未接）。
- 日志与资讯正文经 `sanitize-html` 消毒，并用 `.blog-prose` 约束手机端溢出；资讯由自有中文 RSS 定时导入 D1，不再依赖繁简转换或旧聚合源。
- 本站不存储或分发影视、字幕、下载文件；观看/下载/字幕仅为第三方公开检索跳转或展示。
- Bangumi、Bilibili、巴哈姆特動畫瘋、蜜柑计划、漫猫、动漫花园、acgrip 等名称及其内容归各自权利人所有。

## 相关文档

| 文档                                             | 说明                                            |
| ------------------------------------------------ | ----------------------------------------------- |
| [架构说明](./docs/architecture.md)               | **当前**路由、数据流与目录职责（含 Mermaid 图） |
| [Agent / 工程约定](./AGENTS.md)                  | 包管理、路由、取数等硬规则                      |
| [性能与工程优化规划](./docs/planning/README.md)  | 分项优化索引（含 020 多类型、021 流媒体降级）   |
| [Bangumi API 调研](./docs/bangumi-api.md)        | 上游接口笔记                                    |
| [外部评分数据源调研](./docs/external-ratings.md) | AniList / MAL 等                                |
| [需求文档（历史）](./docs/requirements.md)       | 早期设想，部分已过时                            |

## 许可证

暂未指定许可证。若计划公开复用或接受外部贡献，建议补充许可证文件。
