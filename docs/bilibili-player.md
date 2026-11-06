# B 站番剧嵌入

本站使用 B 站官方 iframe，视频由访客浏览器直接请求 B 站，不经过本站 Worker 转发。

## 标识与取数

- `bangumi-data` 的 B 站标识是 `mediaId`，例如 `md1565`。它与 `seasonId` 不是通用的一一相等关系，不能直接替换使用。
- 播放面板已有 `mediaId` 时，请求同源 `/api/anime/bilibili/:id?mediaId=...`。后端优先读取随站发布的 `catalog.json`；已收录的作品不再请求 B 站资料接口。未收录时才实时解析 `seasonId` 和分集 `episodeId`，不再按标题搜索另一部番剧。
- 没有媒体映射时才使用标题搜索。忽略标点、空格与大小写后标题必须相同，不直接播放首个模糊搜索结果。
- 精确查询的成功结果缓存一小时，使用现有内存、single-flight 与 Cloudflare Cache API；风控、网络错误和缺少分集的结果不进入成功缓存。客户端也不长期缓存风控/网络失败。
- 所有上游请求带超时。媒体和分集资料接口属于独立上游依赖，官方 iframe 文档不保证这些接口在数据中心出口可用。

## 官方参数

参考 [B 站站外播放器文档](https://player.bilibili.com/)：番剧等 OGV 使用 camelCase 的 `episodeId`，可同时提供 `seasonId`。`aid`、`bvid` 和 `cid` 属于普通投稿视频的参数。`mediaId`、`season_id` 不能替代 `episodeId`。

播放器关闭自动播放与弹幕，保留全屏、encrypted-media 权限和默认跨站来源策略。示例：

```text
https://player.bilibili.com/player.html?episodeId=68540&seasonId=1565&autoplay=0&danmaku=0
```

## 排查顺序

1. 同源 API 返回 `blocked` 时，还没有加载 iframe；优先检查服务器到 B 站资料接口的访问。调整本站 CDN 缓存规则不能解除 B 站的接口风控。
2. API 成功后检查 iframe 的 `episodeId`、`seasonId`，不要混用媒体、季度与分集标识。
3. iframe 已显示但视频失败时，再检查播放器内的地区、账号、会员或站外播放提示，并与 B 站官方页面对照。不能以返回 HTML 或取得分集资料证明视频已经可播放。
4. Cloudflare 出口可能持续无法读取资料，不能靠实时重试保证成功。在可访问 B 站资料的环境运行 `bun run data:bilibili 1565`（可传多个 mediaId），将生成的公开元数据提交部署；失败保留上次成功快照。不要在 Cloudflare 构建时强制刷新该目录，以免把相同的出口限制带进构建。目录只保存作品、分集标识和标题，不保存视频文件、用户 Cookie 或临时播放地址。

快照不是全站已覆盖的承诺：只有 `catalog.json` 中的作品走独立于上游 API 的路径。已完结作品可长期复用，连载作品需要按更新频率在外部环境重新同步。官方 iframe 的地区、账号和站外播放限制仍由 B 站决定。

静态回归检查：`bun run check:bilibili`。实际播放、登录状态和各地区可用性需要浏览器单独验证。
