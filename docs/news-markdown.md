# 资讯成品渲染契约

本站只负责安全接收、存储和渲染上游成品，不调用模型改写正文，也不把图片重复追加到文章末尾。

## 推送格式

沿用 `POST /feeds/push` 的 `items[].contentMarkdown` 或 `items[].contentHtml`，同一篇选择一种即可。兼容同时发送时非空 HTML 优先，其次 Markdown，最后 excerpt，不重复展示。完整鉴权、GUID 与批次协议见 [资讯存储](./news-storage.md#finished-news-push-receiver)。

```json
{
  "items": [
    {
      "channel": "anime",
      "guid": "stable-news-id",
      "title": "作品公开新预告",
      "sourceUrl": "https://example.com/news/1",
      "publishedAt": "2026-11-07T00:00:00Z",
      "version": 3,
      "contentMarkdown": "> 已由上游整理的摘要。\n\n## 资讯正文\n\n正文 **重点**。\n\n<iframe src=\"https://www.youtube-nocookie.com/embed/M7lc1UVf-VE\" title=\"官方预告\" loading=\"lazy\" allow=\"encrypted-media; picture-in-picture; fullscreen\" allowfullscreen referrerpolicy=\"strict-origin-when-cross-origin\"></iframe>\n\n[到原平台观看](https://www.youtube.com/watch?v=M7lc1UVf-VE)"
    }
  ]
}
```

正常 JSON 序列化即可，`\n` 解码后是真实换行；不要把整篇成品再包成代码块或转义成显示文本。

## GFM 与图文

- 使用既有 Marked 实例开启 GFM，支持段落、引用、有序/无序列表、强调、删除线、行内代码、代码块、图片、链接与表格。
- 开头摘要引用块采用导读样式；其余正文保留原顺序与结构。正文一级标题映射为二级，避免与页面主标题重复。普通单换行不强制变成 `<br>`，用空行分段。
- 图片仅接受 HTTPS，等比缩放；保留 `figure`、`figcaption`、图注和版权文字。表格在内容区内横向滚动，不撑宽整页。
- Markdown 与 HTML 使用同一安全清洗规则，重复读取不会丢失合规播放器、图文结构与来源链接。

## 官方 iframe 白名单

仅接受下列 HTTPS 实际主机和路径，不使用“包含域名”匹配，不接受协议相对地址、账号密码、非标准端口、`srcdoc`、脚本、事件属性或任意样式：

| 来源    | 有效地址                                                                           |
| ------- | ---------------------------------------------------------------------------------- |
| YouTube | `https://www.youtube-nocookie.com/embed/<11位视频ID>`                              |
| B 站    | `https://player.bilibili.com/player.html`，含有效 `bvid`、`aid` 或番剧 `episodeId` |

保留或规范化 `src`、`title`、`loading`、`allow`、`allowfullscreen`、`referrerpolicy`。来源策略统一为 `strict-origin-when-cross-origin`；权限仅接受播放器常用功能，不开放摄像头、麦克风或定位。播放器使用宽度 100%、16:9 比例，继承亮暗主题 surface。

上游应在播放器旁提供“到原平台观看”链接，本站保留该链接。普通链接保持链接，不自动改成另一个播放器，也不再生成或整理正文。平台网络、嵌入许可、账号、地区或年龄限制可能影响播放，不保证平台实际播放成功。

仓库当前没有设置 CSP，因此不新增整站策略。如果部署层已有 CSP，需在原 `frame-src` 中合并 `https://www.youtube-nocookie.com` 和 `https://player.bilibili.com`，保留其他策略。

## RSS 与推送版本保护

RSS 示例（命名空间也可声明在 item、channel 或 rss 上）：

```xml
<news:version xmlns:news="urn:anime-rss:news:1">3</news:version>
```

两条链路均将非负安全整数版本写入现有 `push_version`，不需要新增迁移：

- 发布时间更旧或成品版本更低：拒绝更新。
- 已有版本且发布时间相同，但来稿缺少版本：拒绝更新。
- 合规的有版本新稿：完整替换正文，不按图片数或篇幅保留旧稿。
- 最终 SQL 原子执行上述规则，预检之后到达的新版本也不会被并发旧写覆盖。
- 同频道按来源合并旧记录时优先版本化成品，保留版本号，不能重新挑选旧长正文。
- 按稳定 GUID 更新，重复同步不新增文章。缺版本的来源仍可首次导入。

此前已被旧清洗规则删除的 iframe 不能从数据库中恢复；部署站点和同步 Worker 后，需上游以新的成品版本重新推送或通过 RSS 更新。

## 验证

`bun run check:news-content` 检查正文、白名单与 XML 版本解析；`bun run check:news` 检查实际本地 D1 上的推送/RSS 防回滚、并发与去重；`bun run check:news-runtime` 检查真实 workerd 中的图文、双平台 iframe 和版本入库。浏览器需另行检查桌面/手机、亮暗主题与平台实际播放。

官方参考：[B 站播放器](https://player.bilibili.com/)、[YouTube 参数](https://developers.google.com/youtube/player_parameters)、[YouTube 来源要求](https://developers.google.com/youtube/terms/required-minimum-functionality)。
