# B 站番剧嵌入

本站使用 B 站官方 iframe，视频由访客浏览器直接请求 B 站，不经过本站 Worker 转发。

## 标识与取数

- `bangumi-data` 的 B 站标识是 `mediaId`，例如 `md1565`。它与 `seasonId` 不是通用的一一相等关系，不能直接替换使用。
- 播放面板已有 `mediaId` 时，请求同源 `/api/anime/bilibili/:id?mediaId=...`。后端先通过公开媒体资料接口解析 `seasonId`，再获取分集的 `episodeId`，不再按标题搜索另一部番剧。
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
4. 若 Cloudflare 出口持续无法读取资料，后续可将公开播放元数据改为受控定时同步并在站内保存；缓存只能复用已成功取得的数据，不能修复冷启动时被拦截的上游请求。

静态回归检查：`bun run check:bilibili`。实际播放、登录状态和各地区可用性需要浏览器单独验证。
