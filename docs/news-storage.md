# 资讯 RSS 与 D1

资讯仅接入自有 `anime.xml` 与 `events.xml`，不再调用 Google News、RSSHub、AniNews 或巴哈姆特。Bangumi 社区日志仍为独立功能。

## 资源与职责

| 资源        | 配置                                                            |
| ----------- | --------------------------------------------------------------- |
| Pages       | `animate-site`，生产分支 `master`，域名 `lowbculture.com`       |
| 生产 D1     | `celadon-news` / `a818c551-019f-4d33-8080-3ba0160d9072`         |
| 预览 D1     | `celadon-news-preview` / `a8b2903a-fbc3-4bc8-981c-7dc2666cff0f` |
| 绑定名      | 两个环境均为 `NEWS_DB`，对应独立数据库                          |
| 同步 Worker | `celadon-news-sync`，只绑定生产库，无公开写入接口               |
| 定时器      | `*/15 * * * *`；根据每个源的 `next_check_at` 决定是否拉取       |

频道名称和间隔集中在 `app/lib/news/config.ts`。真实订阅地址仅保存在同步 Worker 的 Cloudflare Secrets。每个频道可组合：

- `NEWS_ANIME_RSS_URL` / `NEWS_EVENTS_RSS_URL`（主源）
- `NEWS_ANIME_RSS_URL_SECONDARY` / `NEWS_EVENTS_RSS_URL_SECONDARY`（第二源）
- `NEWS_ANIME_RSS_URLS` / `NEWS_EVENTS_RSS_URLS`（逗号或换行分隔的 HTTPS 列表）

同步时去重 URL，按源独立保存 ETag（`news_feeds.id` 为 `anime`/`events`，或多源时为 `anime:<hash>` / `events:<hash>`）。文章按规范化 `source_url` 跨源合并，保留封面与更长正文。共享配置、Git 和浏览器产物不包含真实值。动漫每 15 分钟、漫展每小时。网站请求只读 D1，不需要这些 Secrets。预览数据库以首次导入的数据验证，不运行生产定时任务。

推荐双订示例（旧聚合地址勿写入仓库，仅放 Secrets）：

```text
NEWS_ANIME_RSS_URLS=https://yitom486.github.io/celadon-news-feed/anime.xml,<OLD_ANIME_HTTPS>
NEWS_EVENTS_RSS_URLS=https://yitom486.github.io/celadon-news-feed/events.xml,<OLD_EVENTS_HTTPS>
```

## 数据与失败处理

- `news_articles` 保存 GUID、GUID 的 SHA-256 站内 ID、频道、标题、原文链接、净化后的 HTML、摘要、可选 `image_url` 封面及发布/首次导入/更新时间。GUID 唯一；同频道规范化 `source_url` 相同的多 GUID 在同步结束时合并为更丰富的一条。`0002_news_image_url.sql` 为可空封面列；`0003_news_multi_feed.sql` 放宽 `news_feeds` id 并索引 `source_url`。
- 优先 `content:encoded`，没有才使用 `description`，不重复拼接。正文若更像 Markdown 则先用 `marked` 渲染再消毒。封面优先取 enclosure / `media:content` / 正文首张 https 图。允许安全 `img`/`figure`/`table`/`video`（仅 https）；YouTube/Bilibili 外链加样式标记，不嵌入 iframe。过滤脚本、事件、内联样式、iframe 和危险协议。
- 发布日期决定 30 天展示窗口；首次导入和同步时间不延长保留期限。未来发布的文章先保存，发布时间到后才展示，避免 ETag 不变造成永久漏项。
- `news_feeds` 保存 ETag、Last-Modified、成功/检查时间、错误和下次检查时间。304 更新检查状态，保留文章；解析或写入失败不推进 ETag。
- 每个源独立处理；同步失败保留旧文章，5 分钟后允许重试，实际由下一次 15 分钟定时任务执行。120 秒租约避免同源同时写入。
- 每条写入 SQL 最多 100 个参数，十篇合写；文章和成功状态在同一个 D1 batch 事务提交。失败可整体回滚。
- 清理仅按发布时间超过 30 天执行，不因源内条目消失删除文章。超过保留期限的详情返回 404，并说明这不代表活动取消。
- RSS 请求有 15 秒超时、2 MiB 大小上限和 XML/字段校验。DTD/实体声明被拒绝。

## 页面与缓存

- `/news`：频道筛选与 URL 分页；`/news/:id`：站内阅读，原文作为“查看来源”入口。
- `/api/news?view=home`：每频道独立取 12 条（优先带封面），避免动漫高频更新挤掉漫展。首页每栏展示最多 6 条（同样优先封面）；列表卡仅在有封面时显示右侧小缩略图，无封面不留占位。
- `/api/news?channel=anime&page=1&limit=20`：公开列表，浏览器缓存 60 秒、共享缓存 600 秒；保留 channel/page/limit/view 参数。
- 首页使用 TanStack Query，5 分钟新鲜期；站内列表和详情用服务端 loader。HTML 包含主题偏好，继续使用 private 策略。
- D1 是持久化数据源，Query、HTTP 缓存各自管理新鲜期；查询缓存不等同于持久化或 CDN HIT。

## 本地开发

先复制 `workers/news-sync/.dev.vars.example` 为同目录 `.dev.vars`，在本地填写两个 HTTPS 地址。真实文件已被 Git 忽略；不要使用 `VITE_` 环境变量或写入 Wrangler 的公开 `vars`。本地同步脚本从该私有配置读取，站点只需 D1 绑定。若 RSS 服务端已启用 Bearer 鉴权，再配置可选 `NEWS_RSS_BEARER_TOKEN`。

```sh
bun run news:migrate:local
bun run news:sync:local
bun run dev
```

本地命令只写本地 D1。`bun run check:news` 使用临时、隔离的真实 D1 运行时与固定 RSS，不访问线上数据库或真实源。`bun run news:worker:build` 仅打包，不部署。

验证覆盖 GUID、封面/enclosure、图片白名单、Markdown 渲染、完整内容优先级、HTML 过滤、304、两个刷新周期、分页、失败保留、并发租约、事务回滚、30 天清理、首页频道配额和未来发布时间。

额外验证缺失/无效 Secrets、可选鉴权请求头、拒绝重定向，以及网络错误不泄露私有地址或令牌。

`bun run check:news-runtime` 对打包后的 Worker 执行真实 workerd scheduled 事件，模拟两个 HTTPS 源并使用隔离 D1。Bun 管理依赖和构建，Node 提供测试所需的完整 Undici MockAgent。该检查覆盖 Worker 中的请求构造、XML/HTML 处理、Secrets 和 SQL 写入；Workers 不支持 `redirect: "error"`，必须用 `manual` 接收后拒绝 3xx。

## 订阅地址隐私

- 真实地址只由同步 Worker 的运行时 Secrets 提供。部署 Worker 必须保留已有 `secret_text` 绑定；不得把值编译进模块或加入部署日志。
- RSS 请求不跟随重定向；网络和存储异常对外仅提供概括消息，避免 URL 或令牌从 D1 状态、日志及公开 API 泄露。
- 隐藏地址减少发现机会，不构成访问控制。公开 RSS 仍可被已知地址访问；需要限制抓取时，应在 RSS 服务端启用鉴权、缓存或限流。
- 移除当前源码不会自动删除 Git 历史、旧部署和已缓存的脚本。本地旧提交含曾使用的地址，发布 GitHub 前需处理；不在未获明确指令时强推或改写共享历史。旧地址如已公开，应更换入口或在上游增加鉴权。

## 发布与运维

1. 对目标环境应用 `migrations/0001_news.sql`；迁移跟踪表为 `d1_migrations`。本次远程初始化通过 Cloudflare MCP 执行并登记版本，后续可用 Wrangler migrations 管理。
2. 先导入两个源，核对 D1 中的文章与 `news_feeds` 成功状态，再发布 Pages。
3. Pages 生产与预览绑定由 `wrangler.toml` 定义，控制台也需与之对应。保留原有环境配置。
4. 使用 `workers/news-sync/wrangler.toml` 构建和发布定时 Worker；同步代码复用网站的解析与存储逻辑，无需更改 Pages 的路由架构。
5. 验证预览环境后再更新生产。核对 API、正文、来源、频道分页、404 与静态资源缓存头。
6. 查看 Worker 日志和 `news_feeds`：`success_at` 长期不更新或 `error` 非空时排查上游；不要删除旧文章来“修复”抓取失败。

MCP OAuth 授权与 Wrangler 登录是两套凭据。部署时可以通过 MCP 操作资源，并使用站点专用的短期上传凭证上传静态资源；凭据不写入仓库。

本次按用户要求仅执行代码、静态检查与 HTTP 检查；桌面/手机视觉、键盘操作和浏览器动效未验证。

## 发布记录：2026-11-06（北京时间）

- 实现提交：`1aefa1b`，仅包含资讯相关文件；工作区同期布局和图片改动未混入本次发布产物。
- 首次导入：生产和预览各 32 条，动漫 / 漫展各 16 条；同步状态和 ETag 已持久化。
- 线上 HTTP 验收通过：API、频道列表、正文详情、AI/漫展核实提示、亮暗 SSR 和 404。API 为公开缓存，主题 HTML 为 private。
- 生产 CSS 抽样返回一年 immutable；重复 GET 观察到 `MISS → HIT`、`Age: 2`，不据此推算整站命中率。
- Worker 绑定、兼容标志、日志及每 15 分钟触发器已读取核对；公开 workers.dev / 预览入口均关闭。后续实际调度验收见地址隐私修复记录。
- 本次采用已验证产物直接发布；代码提交尚未推送。后续 Git 自动构建需要将实现同步到生产分支 `master`，避免旧分支构建覆盖新功能。

## 地址隐私修复记录

- 真实 RSS 地址已移入同步 Worker 的 Cloudflare Secrets；前端和站点服务端均不需要这些值。
- 原版本的部署地址和回退信息保存在被忽略的 `.wrangler/private-news-release-history.md`，不再通过公开文档提供旧脚本的发现入口。
- 当前源码与新构建不含真实地址；旧浏览器缓存、旧部署和原工作分支的本地历史仍可能保留原内容。隐藏当前地址不等于使公开 RSS 获得访问控制。
- 发布 GitHub 时使用不包含旧敏感提交历史的发布分支；不要推送全部本地分支，也不要把含旧地址的工作分支历史再合并回发布分支。
- 已验证的隐私修复预览：`https://098acdc8.animate-site.pages.dev`；生产版本：`6660e0e1-f915-4f53-8339-f0cf71024a70`。
- 预览线上扫描 51 个 JS 文件、列表/详情 HTML 与资讯 API，均未发现私有域名；生产 HTML、API 和详情复核通过，当前域名上的旧配置脚本已返回 404。
- 修正 Workers 不支持的 `redirect: "error"` 后，真实本地 workerd scheduled 对实际源成功导入动漫 25 条、漫展 16 条，状态均无错误。
- 2026-11-06 01:30:01（北京时间）生产定时任务实际执行成功：公开 API 的两个来源均为 `ok: true`，`lastSuccessAt` 均更新为 `2026-11-05T17:30:01.775Z`，原错误已清除，生产资讯总数为 41。Cloudflare 管理 API 当次查询超时，执行结果由站点直接读取 D1 的资讯 API 交叉确认。
- 为 GitHub 准备本地分支 `publish/private-rss`：从已存在的远程安全基线创建单个发布提交，保留当前源码树，不包含原工作分支中曾写入真实地址的提交；原工作分支不改写。发布时仅推送该分支，再合入 `master`。

## 发布记录：资讯卡片与封面（待 Pages 构建）

- 迁移：`migrations/0002_news_image_url.sql`（`ALTER TABLE news_articles ADD COLUMN image_url TEXT`），生产/预览需各自 apply。
- 列表与详情展示封面；详情正文支持图片与直链 video；Markdown 源在服务端经 marked → sanitize。
- Secrets 切换到 Bot feed 由运维侧处理，本提交不改 Cloudflare Secrets。

## 发布记录：双源合并与卡片缩略图（2026-11-06，北京时间）

- 列表/首页资讯卡：有封面 → 右侧约 96–112px 缩略图；无封面 → 不渲染封面区域（去掉 ImageOff 大占位）。
- 详情页：仅在有 `image` 时保留中等宽度头图。
- 同步 Worker：支持每频道多 RSS；同步后按 `source_url` 合并重复；打包产物见 `.wrangler/news-worker/`。
- 旧私有 RSS 明文地址未从本地/API 恢复；需运维在 Secrets 中自行填入 `NEWS_*_RSS_URLS` 与 Bot feed 双订。
