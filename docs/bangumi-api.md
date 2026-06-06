# Bangumi API 速查文档

> 本文档整理自 Bangumi 官方 OpenAPI 规范，核实于 2026-06-06。
> 接口可能更新，权威来源见文末链接。

## 0. 总览

Bangumi 有**两套** API：

| | Legacy（旧版） | v0 REST（新版，推荐）|
|---|---|---|
| Base URL | `https://api.bgm.tv` | `https://api.bgm.tv/v0` |
| 风格 | 老接口，字段较杂 | 规范的 RESTful，数据干净 |
| 用途 | 仍保留 `/calendar` 等 | 条目/角色/人物/收藏/搜索全覆盖 |

### 通用规则（务必遵守）

- **User-Agent 必填**：格式 `开发者/项目名 (主页URL)`，例如
  `yhang/anime-site (https://github.com/yhang)`。
  ❌ 不要用请求库默认 UA 或 `Bangumi/1.0`，**可能被封**。
- **鉴权**：公开数据（搜索、条目、每日放送）**无需 token**；
  涉及「当前用户」的收藏读写（`/v0/me`、`/v0/users/-/collections/*`）需要
  OAuth2 Access Token（请求头 `Authorization: Bearer <token>`）。
- **NSFW**：未鉴权时浏览/搜索结果会过滤掉 R18 条目。
- **缓存**：官方对部分接口已做缓存（如浏览第一页 cache 24h）。
  自己也应缓存结果，别每个请求都打它的服务器。

---

## 1. Legacy 接口（我们项目在用的）

### `GET /calendar`

每日番剧放送表。**无需参数、无需鉴权。** 我们的 `/anime` 页面用的就是它。

返回：长度为 7 的数组（周一→周日），每项：

```jsonc
{
  "weekday": { "en": "Mon", "cn": "星期一", "ja": "月耀日", "id": 1 },
  "items": [
    {
      "id": 123,
      "name": "原名",
      "name_cn": "中文名",
      "images": { "large": "...", "common": "...", "medium": "...", "grid": "..." },
      "rating": { "score": 7.8, "total": 1234 },
      "air_date": "2026-04-01",
      "air_weekday": 1
    }
  ]
}
```

> `weekday.id`：周一=1 … 周日=7（注意和 JS `Date.getDay()` 的 周日=0 不同）。

---

## 2. v0 接口清单

> 路径前缀统一为 `https://api.bgm.tv/v0`。下表「鉴权」列：
> 公开 = 无需 token；🔒 = 需要 Access Token。

### 2.1 条目（Subjects）

| 方法 | 路径 | 返回 / 用途 | 鉴权 |
|---|---|---|---|
| POST | `/search/subjects` | **条目搜索**（实验性），body 传筛选条件 | 公开 |
| GET | `/subjects` | **浏览条目**（按类型/分类/年月排序分页）| 公开 |
| GET | `/subjects/{subject_id}` | 单个条目详情（含简介、标签、评分、infobox）| 公开 |
| GET | `/subjects/{subject_id}/image` | 条目封面图（重定向到图片）| 公开 |
| GET | `/subjects/{subject_id}/persons` | 条目相关人物（声优、监督、制作等）| 公开 |
| GET | `/subjects/{subject_id}/characters` | 条目登场角色 | 公开 |
| GET | `/subjects/{subject_id}/subjects` | 关联条目（续作/系列等）| 公开 |

**`GET /subjects` 常用 query 参数**：
`type`（条目类型，见枚举）、`cat`（分类）、`series`（书籍是否系列）、
`platform`（游戏平台）、`sort`（`date` | `rank`）、`year`、`month`、
`limit`、`offset`（分页）。

**`POST /search/subjects` body** 支持过滤：
`keyword`、`sort`、`filter.type`（数组）、`filter.tag`、`filter.air_date`、
`filter.rating`、`filter.rank`、`filter.nsfw`。

### 2.2 章节（Episodes）

| 方法 | 路径 | 返回 / 用途 | 鉴权 |
|---|---|---|---|
| GET | `/episodes` | 某条目的章节列表，query: `subject_id`（必填）、`type`、`limit`、`offset` | 公开 |
| GET | `/episodes/{episode_id}` | 单集详情（标题、放送日期、简介）| 公开 |

### 2.3 角色（Characters）

| 方法 | 路径 | 返回 / 用途 | 鉴权 |
|---|---|---|---|
| GET | `/characters/{character_id}` | 角色详情 | 公开 |
| GET | `/characters/{character_id}/image` | 角色图片 | 公开 |
| GET | `/characters/{character_id}/subjects` | 角色出演的条目 | 公开 |
| GET | `/characters/{character_id}/persons` | 角色的声优 | 公开 |
| POST | `/characters/{character_id}/collect` | 收藏该角色 | 🔒 |
| DELETE | `/characters/{character_id}/collect` | 取消收藏 | 🔒 |

### 2.4 人物（Persons，声优/制作者）

| 方法 | 路径 | 返回 / 用途 | 鉴权 |
|---|---|---|---|
| GET | `/persons/{person_id}` | 人物详情 | 公开 |
| GET | `/persons/{person_id}/image` | 人物图片 | 公开 |
| GET | `/persons/{person_id}/subjects` | 参与的条目 | 公开 |
| GET | `/persons/{person_id}/characters` | 配过的角色 | 公开 |
| POST/DELETE | `/persons/{person_id}/collect` | 收藏 / 取消收藏 | 🔒 |

### 2.5 用户（Users）

| 方法 | 路径 | 返回 / 用途 | 鉴权 |
|---|---|---|---|
| GET | `/users/{username}` | 用户公开资料 | 公开 |
| GET | `/users/{username}/avatar` | 用户头像 | 公开 |
| GET | `/me` | 当前登录用户信息 | 🔒 |

### 2.6 收藏（Collections）

| 方法 | 路径 | 返回 / 用途 | 鉴权 |
|---|---|---|---|
| GET | `/users/{username}/collections` | 用户的条目收藏列表 | 公开* |
| GET | `/users/{username}/collections/{subject_id}` | 单个条目收藏 | 公开* |
| POST | `/users/-/collections/{subject_id}` | 新增/修改自己的条目收藏 | 🔒 |
| PATCH | `/users/-/collections/{subject_id}` | 修改自己的收藏 | 🔒 |
| GET/PATCH | `/users/-/collections/{subject_id}/episodes` | 章节收藏（看到第几集）| 🔒 |
| GET/PUT | `/users/-/collections/-/episodes/{episode_id}` | 单集收藏状态 | 🔒 |
| GET | `/users/{username}/collections/-/characters` | 角色收藏列表 | 公开* |
| GET | `/users/{username}/collections/-/persons` | 人物收藏列表 | 公开* |

> *私密收藏需要本人 token 才能看到。

### 2.7 编辑历史（Revisions）

| 方法 | 路径 | 用途 |
|---|---|---|
| GET | `/revisions/subjects`、`/revisions/subjects/{revision_id}` | 条目编辑历史 |
| GET | `/revisions/characters`、`/revisions/characters/{revision_id}` | 角色编辑历史 |
| GET | `/revisions/persons`、`/revisions/persons/{revision_id}` | 人物编辑历史 |
| GET | `/revisions/episodes`、`/revisions/episodes/{revision_id}` | 章节编辑历史 |

### 2.8 目录（Indices，用户自建条目清单）

| 方法 | 路径 | 用途 | 鉴权 |
|---|---|---|---|
| POST | `/indices` | 新建目录 | 🔒 |
| GET | `/indices/{index_id}` | 目录详情 | 公开 |
| PUT | `/indices/{index_id}` | 编辑目录 | 🔒 |
| GET | `/indices/{index_id}/subjects` | 目录内条目 | 公开 |
| POST | `/indices/{index_id}/subjects` | 往目录加条目 | 🔒 |
| PUT/DELETE | `/indices/{index_id}/subjects/{subject_id}` | 编辑/移除目录内条目 | 🔒 |
| POST/DELETE | `/indices/{index_id}/collect` | 收藏/取消收藏目录 | 🔒 |

### 2.9 搜索（其它）

| 方法 | 路径 | 用途 |
|---|---|---|
| POST | `/search/characters` | 角色搜索（实验性）|
| POST | `/search/persons` | 人物搜索（实验性）|

---

## 3. 枚举值

### SubjectType（条目类型）
| 值 | 含义 |
|---|---|
| 1 | 书籍 Book |
| 2 | 动画 Anime |
| 3 | 音乐 Music |
| 4 | 游戏 Game |
| 6 | 三次元 Real（影视剧等）|

> 注意没有 5。番剧用 `2`。

### EpType（章节类型）
| 值 | 含义 |
|---|---|
| 0 | 本篇（正片）|
| 1 | SP 特别篇 |
| 2 | OP 片头 |
| 3 | ED 片尾 |
| 4 | 预告/宣传/广告 |
| 5 | MAD |
| 6 | 其他 |

### CollectionType（收藏类型）
| 值 | 含义 |
|---|---|
| 1 | 想看 |
| 2 | 看过 |
| 3 | 在看 |
| 4 | 搁置 |
| 5 | 抛弃 |

---

## 4. 对本项目（番剧站）的建议用法

| 想做的功能 | 用哪个接口 |
|---|---|
| 首页「每日放送」| `GET /calendar`（已实现）|
| 搜索番剧 | `POST /v0/search/subjects`，`filter.type=[2]` |
| 番剧详情页 | `GET /v0/subjects/{id}` |
| 详情页的角色/声优 | `GET /v0/subjects/{id}/characters`、`/persons` |
| 详情页的分集列表 | `GET /v0/episodes?subject_id={id}` |
| 按季度浏览新番 | `GET /v0/subjects?type=2&year=2026&month=4&sort=rank` |

**图片字段**：条目的 `images` 有 `large/common/medium/small/grid` 多种尺寸，
列表用 `common` 或 `grid`，详情页用 `large`。
`<img>` 上加 `referrerPolicy="no-referrer"` 避免防盗链问题。

---

## 来源

- v0 OpenAPI 规范：https://github.com/bangumi/server/blob/master/openapi/v0.yaml
- Legacy API 规范：https://github.com/bangumi/api
- 在线 API 浏览器：https://bangumi.github.io/api/
- User-Agent 规则：https://github.com/bangumi/api/blob/master/docs-raw/user%20agent.md
- 鉴权说明：https://github.com/bangumi/api/blob/master/docs-raw/How-to-Auth.md
