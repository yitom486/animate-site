import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("api/anime/list", "routes/api/anime.list.ts"),
  route("api/anime/detail/:id", "routes/api/anime.detail.$id.ts"),
  route("api/anime/cards", "routes/api/anime.cards.ts"),
  route("api/anime/card/:id", "routes/api/anime.card.$id.ts"),
  route("api/anime/comments/:id", "routes/api/anime.comments.$id.ts"),
  route("api/anime/downloads/:id", "routes/api/anime.downloads.$id.ts"),
  route("api/anime/bilibili/:id", "routes/api/anime.bilibili.$id.ts"),
  route("api/news", "routes/api/news.ts"),
  route("api/bgm-blog", "routes/api/bgm-blog.ts"),
  // /anime/blog 是独立全屏页（动画日志，无限滚动），不进三栏壳；
  // 静态段优先于下方 anime/:id 动态段，不会冲突
  route("anime/blog", "routes/anime/blog.tsx"),
  // /anime/blog/:id 站内日志详情（爬 bgm 单篇 + 消毒渲染）
  route("anime/blog/:id", "routes/anime/blog-detail.tsx"),
  // /anime 是带子路由的布局：三栏外壳里放 <Outlet/>
  route("anime", "routes/anime/layout.tsx", [
    index("routes/anime/index.tsx"), // /anime          → 右栏占位
    route(":id", "routes/anime/detail.tsx"), // /anime/:id → 右栏详情
  ]),
] satisfies RouteConfig;
