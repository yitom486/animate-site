# 亚域空间 — 需求与架构文档

> 番剧聚合站。技术栈：React Router v7（框架模式）+ Vite + Tailwind 4 + shadcn/ui，
> 目标部署 Cloudflare。最后更新：2026-06-06。

## 1. 项目概述

一个聚合番剧信息的网站，数据主要来自 Bangumi，下载/字幕/在线观看以**跳转链接**形式
导向第三方站点。首页为核心页面，三栏布局。

## 2. 数据源

| 来源                                   | 用途                             | 获取方式                                                              | 好爬度                                               |
| -------------------------------------- | -------------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------- |
| **Bangumi API** (`api.bgm.tv` / `/v0`) | 番剧基本信息、评分、详情、放送表 | 官方 JSON API（带 User-Agent）                                        | 🟢 详见 [bangumi-api.md](./bangumi-api.md)           |
| **漫猫 comicat.org**                   | 下载资源                         | 全站最新用 `/rss.xml`；按番剧搜索用**跳转链接** `search.php?keyword=` | 🟢 RSS / 🔴 HTML(JS渲染)                             |
| **acgrip bbs.acgrip.com**              | 字幕                             | **跳转链接**                                                          | 🟢                                                   |
| **B站 bilibili.com**                   | 在线观看                         | **仅跳转链接** `search.bilibili.com/...?keyword=`                     | 🟢                                                   |
| **资讯源（待定）**                     | 今日亚文化资讯                   | 用某个 RSS（不限 B站）                                                | 🟡 待选                                              |
| **AniList / MAL(Jikan) / Kitsu**       | 多源评分                         | 免费免鉴权 JSON API                                                   | 🟢 详见 [external-ratings.md](./external-ratings.md) |

> ⚠️ 决策：B站**不爬内容，只做跳转链接**；资讯改用 RSS，避开 B站反爬。
> ⚠️ 决策（已定）：本站是**纯只读信息站**，无收藏/登录/增删改。
> → **完全不使用任何需要鉴权(🔒)的接口**：无 OAuth、无 token、无 session、无用户系统。
> → 只用公开 GET：`/calendar`、`/v0/subjects[/{id}][/persons]`、`/v0/episodes`、`/v0/search/subjects`。
> → loader 里裸 `fetch` + User-Agent 即可，Cloudflare 部署无需密钥。

## 3. 首页布局（三栏）

> 设计已迭代为 **顶栏 + 主从(master-detail) 三段式布局**（替代早期三栏 + comicat 表格方案）。

### 顶栏

- 站名「亚域空间」（渐变文字，点击回 `/anime`）
- **分类导航**：用 shadcn **Navigation Menu** 组件，按**类型轴**：**动画(type=2，默认) / 游戏(type=4)**
  - 切换分类 = `/anime?type=N`；只有 type 变化时才重拉列表（`shouldRevalidate`）
- 「Ctrl+D 收藏本站」纯文字提示

### 主体：三段式 master-detail（用 `grid-template-columns` 的 `fr` 过渡做挤压动画）

1. **仅网格**（`/anime`）：封面卡片网格铺满，每张含封面 + 评分徽章 + 标题（来自 `/v0/subjects?type=N&sort=rank`，列表项已自带 images/rating）
2. **网格 + 详情**（`/anime/:id`）：点卡片 → 详情面板从右滑出，挤压网格（`1.6fr 1fr`）
3. **详情全屏**（展开态）：点"展开详情"/封面 → 详情占满全屏（`0fr 1fr`），显示简介 + 章节列表
   - 展开态用**局部 state**经 `<Outlet context>` 下发；切换番剧自动收起

### 详情面板内容

- 评分（★ + 数字 + 排名/人数，来自 `rating`）
- 封面 / 中文名 / 原名 / 话数 / 放送开始 / 原作 / 制作 / 监督 / 标签 ×6
- **跳转链接**（拼 URL，不爬）：在线=B站搜索、下载=漫猫搜索、字幕=acgrip 搜索
- 全屏态额外：简介 `summary` + 章节列表（`/v0/episodes`，取 type=0 本篇）
- 局部 `ErrorBoundary`：坏 id 只在右栏报错

## 4. 功能难度评估

| 功能                       | 难度 | 数据/做法                                                       |
| -------------------------- | ---- | --------------------------------------------------------------- |
| 三栏布局 / 导航 / 季度选择 | 🟢   | 前端 + shadcn                                                   |
| 详情面板（评分/封面/简介） | 🟢   | `/v0/subjects/{id}`                                             |
| 原作/制作/监督             | 🟡   | `/v0/subjects/{id}/persons`（按 relation 过滤）                 |
| 6 个标签                   | 🟢   | `subject.tags` 取前 6                                           |
| 按星期/季度的番剧表        | 🟡   | `/calendar` + `/v0/subjects?type=2&year=&month=`                |
| `集数/总集数 状态` 推导    | 🟠   | `/v0/episodes` 数已放送集数；**「停更」无信号，暂不做或人工标** |
| 下载/字幕/在线 跳转链接    | 🟢   | 拼 URL，不爬                                                    |
| 今日资讯                   | 🟡   | 选一个 RSS 源解析                                               |

> 经简化后已无 🔴 项。唯一偏难是「集数/状态推导」。

## 5. 架构

```
用户请求 → RR v7 loader (Cloudflare Worker)
              ├─ KV 缓存命中 → 返回
              └─ 未命中 → fetch Bangumi/RSS → 存 KV → 返回
```

- **Bangumi**：loader 实时取 + KV 短缓存（几小时）
- **资讯 RSS / 漫猫 RSS**：可 loader 取或 Cron 定时刷入 KV
- **跳转链接**：纯前端拼接，无后端开销
- **缓存**：Cloudflare KV（上线后加；本地阶段先不加）

## 6. 路线图

| 阶段   | 内容                                                 | 状态      |
| ------ | ---------------------------------------------------- | --------- |
| P0     | 脚手架 + shadcn + `/calendar` demo                   | ✅        |
| P1     | 顶栏(NavigationMenu) + master-detail 三段式布局      | ✅        |
| P2     | 列表接 Bangumi（类型/排序/每日放送/搜索/分页）       | ✅        |
| P3     | 详情面板（评分/封面/制作/标签 + 全屏视图 + 章节）    | ✅        |
| P4     | API 路由 + `lib/bangumi` + 缓存 + 骨架屏             | ✅        |
| **P5** | **多源评分**（AniList / MAL / Kitsu）→ `lib/ratings` | ⏭️ 下一步 |
| P6     | `集数/总集数 状态` 推导                              |           |
| P7     | 跳转链接完善 + 资讯 RSS                              |           |
| P8     | 部署 Cloudflare + KV 缓存                            |           |

## 7. 待定决策

- [ ] 资讯具体用哪个 RSS 源
- [ ] 「停更」状态是否要做（Bangumi 无此信号）
- [ ] 季度番剧用 `/calendar`（仅当季在播）还是 `/v0/subjects` 按年月筛（可查历史季度）
- [ ] 详情面板的选中态：URL 路由（`/anime/:id`）还是前端状态
