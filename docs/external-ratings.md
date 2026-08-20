# 外部评分源（多源评分）

> 在 Bangumi 之外，额外接入几个**免费、免鉴权、JSON** 的国外番剧评分源，
> 做「多源评分」展示。核实于 2026-06-06（均用 Naruto 实测通过）。

## 1. 选用的三个源（都好爬 🟢）

| 源              | Base URL                     | 协议           | 鉴权 | 评分制    | 实测            |
| --------------- | ---------------------------- | -------------- | ---- | --------- | --------------- |
| **AniList**     | `https://graphql.anilist.co` | GraphQL (POST) | 否   | **0–100** | avg 80          |
| **MAL (Jikan)** | `https://api.jikan.moe/v4`   | REST           | 否   | **0–10**  | score 8.02      |
| **Kitsu**       | `https://kitsu.io/api/edge`  | JSON:API       | 否   | **0–100** | avgRating 84.06 |

> 未选用：TMDB(要 key)、AniDB(注册+限流严)、Anime-Planet/豆瓣/IMDb(无 API/反爬)。

### 各源关键请求

**AniList**（一次查询拿多字段，最省事）

```graphql
query ($q: String) {
  Media(search: $q, type: ANIME) {
    id
    title {
      romaji
      native
    }
    averageScore
    popularity
    siteUrl
  }
}
```

POST JSON 到 `https://graphql.anilist.co`，body `{ query, variables: { q } }`。

**Jikan (MAL)**

```
GET https://api.jikan.moe/v4/anime?q={关键词}&limit=1
→ data[0].score (0–10), .scored_by, .url, .mal_id
```

⚠️ 限流：约 3 req/s、60 req/min，**务必缓存**。

**Kitsu**

```
GET https://kitsu.io/api/edge/anime?filter[text]={关键词}&page[limit]=1
→ data[0].attributes.averageRating (0–100), .slug
```

## 2. 两个坑

### 2.1 评分制归一化

- 0–10 制：Bangumi / MAL(Jikan)
- 0–100 制：AniList / Kitsu → **展示前 ÷10**
- 统一在 UI 层换算成 10 分制显示（保留一位小数）。

### 2.2 跨站 ID 匹配（最大难点 🔴）

各站 ID 不互通（Bangumi id ≠ MAL id ≠ AniList id）。策略，**从准到糙**：

1. **anime-offline-database**（manami-project，GitHub 大 JSON）已把
   MAL/AniList/Kitsu/AniDB/Anime-Planet 的 ID 互相映射好——但**不含 Bangumi**。
2. Bangumi → 国外：先尝试 Bangumi 条目 infobox 里的外部链接（部分条目有 MAL/AniList 链接）。
3. 兜底：按**标题（原名/罗马音）+ 放送年份**模糊匹配。

> 匹配不保证 100% 命中，匹配失败的源就显示"暂无"。

## 3. 模块设计（沿用 `lib/bangumi/` 的风格）

```
app/lib/ratings/
  constants.ts     # base URL、UA、限流配置
  client.ts        # anilistQuery() / jikanGet() / kitsuGet()
  fetch-ratings.ts # fetchExternalRatings(title, year) → 并行三源 + 归一化
  normalize.ts     # 各源分数 → 统一 0–10
  match.ts         # 标题/年份匹配 + offline-database 映射(可选)
  types.ts
  index.ts
```

API 路由层（沿用现有 `routes/api/`）：

- `routes/api/ratings.$id.ts`：传入 Bangumi subject id → 取标题 → 并行查三源 → 返回归一化结果。
- 详情面板用一个轻量请求拉这个，**不阻塞主详情渲染**（可后置/懒加载）。

## 4. 缓存（重要）

- 外部源（尤其 Jikan 有限流）**必须缓存**：本地用内存 cache（参照 `lib/cache.ts`），
  上线用 Cloudflare KV，TTL 建议 ≥ 24h（评分变化慢）。
- 匹配结果（Bangumi id → 各站 id）也缓存，避免重复模糊匹配。

## 来源

- AniList: https://docs.anilist.co/
- Jikan (MAL): https://docs.api.jikan.moe/
- Kitsu: https://kitsu.docs.apiary.io/
- ID 映射: https://github.com/manami-project/anime-offline-database
