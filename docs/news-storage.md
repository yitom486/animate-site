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

频道地址、名称和间隔集中在 `app/lib/news/config.ts`。动漫每 15 分钟、漫展每小时；两者不再叠加订阅 `all.xml`。网站请求只读 D1，避免访客请求等待 RSS。预览数据库以首次导入的数据验证，不运行生产定时任务。

## 数据与失败处理

- `news_articles` 保存 GUID、GUID 的 SHA-256 站内 ID、频道、标题、原文链接、净化后的 HTML、摘要及发布/首次导入/更新时间。GUID 唯一；原文 URL 相同的新 GUID 仍作为新文章。
- 优先 `content:encoded`，没有才使用 `description`，不重复拼接。保留来源、AI 说明和活动核实提示；过滤脚本、事件、内联样式、iframe 和危险协议。
- 发布日期决定 30 天展示窗口；首次导入和同步时间不延长保留期限。未来发布的文章先保存，发布时间到后才展示，避免 ETag 不变造成永久漏项。
- `news_feeds` 保存 ETag、Last-Modified、成功/检查时间、错误和下次检查时间。304 更新检查状态，保留文章；解析或写入失败不推进 ETag。
- 每个源独立处理；同步失败保留旧文章，5 分钟后允许重试，实际由下一次 15 分钟定时任务执行。120 秒租约避免同源同时写入。
- 每条写入 SQL 最多 100 个参数，十篇合写；文章和成功状态在同一个 D1 batch 事务提交。失败可整体回滚。
- 清理仅按发布时间超过 30 天执行，不因源内条目消失删除文章。超过保留期限的详情返回 404，并说明这不代表活动取消。
- RSS 请求有 15 秒超时、2 MiB 大小上限和 XML/字段校验。DTD/实体声明被拒绝。

## 页面与缓存

- `/news`：频道筛选与 URL 分页；`/news/:id`：站内阅读，原文作为“查看来源”入口。
- `/api/news?view=home`：每频道独立取 12 条，避免动漫高频更新挤掉漫展。首页每栏展示 6 条并提供完整列表入口。
- `/api/news?channel=anime&page=1&limit=20`：公开列表，浏览器缓存 60 秒、共享缓存 600 秒；保留 channel/page/limit/view 参数。
- 首页使用 TanStack Query，5 分钟新鲜期；站内列表和详情用服务端 loader。HTML 包含主题偏好，继续使用 private 策略。
- D1 是持久化数据源，Query、HTTP 缓存各自管理新鲜期；查询缓存不等同于持久化或 CDN HIT。

## 本地开发

```sh
bun run news:migrate:local
bun run news:sync:local
bun run dev
```

本地命令只写本地 D1。`bun run check:news` 使用临时、隔离的真实 D1 运行时与固定 RSS，不访问线上数据库或真实源。`bun run news:worker:build` 仅打包，不部署。

验证覆盖 GUID、完整内容优先级、HTML 过滤、304、两个刷新周期、分页、失败保留、并发租约、事务回滚、30 天清理、首页频道配额和未来发布时间。

## 发布与运维

1. 对目标环境应用 `migrations/0001_news.sql`；迁移跟踪表为 `d1_migrations`。本次远程初始化通过 Cloudflare MCP 执行并登记版本，后续可用 Wrangler migrations 管理。
2. 先导入两个源，核对 D1 中的文章与 `news_feeds` 成功状态，再发布 Pages。
3. Pages 生产与预览绑定由 `wrangler.toml` 定义，控制台也需与之对应。保留原有环境配置。
4. 使用 `workers/news-sync/wrangler.toml` 构建和发布定时 Worker；同步代码复用网站的解析与存储逻辑，无需更改 Pages 的路由架构。
5. 验证预览环境后再更新生产。核对 API、正文、来源、频道分页、404 与静态资源缓存头。
6. 查看 Worker 日志和 `news_feeds`：`success_at` 长期不更新或 `error` 非空时排查上游；不要删除旧文章来“修复”抓取失败。

MCP OAuth 授权与 Wrangler 登录是两套凭据。部署时可以通过 MCP 操作资源，并使用站点专用的短期上传凭证上传静态资源；凭据不写入仓库。

本次按用户要求仅执行代码、静态检查与 HTTP 检查；桌面/手机视觉、键盘操作和浏览器动效未验证。
