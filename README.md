# 亚域空间

一个聚合番剧信息、放送日历、动漫资讯与相关资源入口的网站。项目以 Bangumi 等公开数据源为主，提供番剧浏览、搜索、详情与资讯阅读功能；第三方观看、下载和字幕资源仅以跳转链接形式提供。

## 功能

- 按动画、游戏等分类浏览条目，支持搜索、分页与排行筛选。
- 查看番剧详情、评分、标签、制作信息、章节与放送信息。
- 按星期和季度查看动画放送日历。
- 聚合动漫资讯与 Bangumi 博客内容。
- 提供 Bilibili、漫猫、acgrip 等第三方站点的搜索或资源跳转入口。
- 使用服务端渲染，并通过 Cloudflare Pages Functions 处理应用请求。

## 技术栈

- [React Router v7](https://reactrouter.com/)（框架模式）
- React 19、TypeScript、Vite
- Tailwind CSS 4 与 shadcn/ui
- Cloudflare Pages Functions 与 Wrangler
- Bangumi API、RSS 及其他公开数据源

## 本地开发

### 前置条件

- Node.js 20 或更高版本
- npm

### 安装依赖

```bash
npm ci
```

### 启动开发服务器

```bash
npm run dev
```

应用默认运行在 `http://localhost:5173`。

### 类型检查

```bash
npm run typecheck
```

### 生产构建

```bash
npm run build
```

构建完成后，客户端静态文件位于 `build/client/`，服务端构建产物位于 `build/server/`。

### 本地预览 Cloudflare Pages 构建

先完成生产构建，再运行：

```bash
npm run start
```

该命令使用 Wrangler 在本地预览 `build/client/`，并加载 `functions/[[path]].ts` 中定义的 Pages Function。

## 部署到 Cloudflare Pages

推荐在 Cloudflare Dashboard 中创建 Pages 项目并连接此 Git 仓库。构建设置如下：

| 配置项       | 值              |
| ------------ | --------------- |
| 构建命令     | `npm run build` |
| 构建输出目录 | `build/client`  |
| Node.js 版本 | 20 或更高版本   |

仓库中的 `functions/[[path]].ts` 会将请求交给 React Router 的服务端构建产物处理，因此部署时请保留 `functions/` 目录。Cloudflare Pages 与 Git 仓库连接后，可在推送指定分支时自动构建并部署。

## 数据来源与说明

本项目使用公开接口、RSS 或公开页面数据展示番剧与资讯信息。Bangumi、Bilibili、漫猫、acgrip 等名称及其内容分别归其权利人所有。

- 本站不存储、分发或提供影视、字幕及下载文件。
- 相关观看、下载与字幕功能仅跳转至第三方页面。
- 外部数据源的可用性、内容准确性与访问规则可能随其服务变更而变化。

详细的数据源与架构说明见 [docs/requirements.md](./docs/requirements.md)。

## 相关文档

- [性能与工程优化规划](./docs/planning/README.md)
- [Bangumi API 调研](./docs/bangumi-api.md)
- [外部评分数据源调研](./docs/external-ratings.md)
- [需求与架构文档](./docs/requirements.md)

## 许可证

暂未指定许可证。若计划公开复用或接受外部贡献，建议补充许可证文件。
