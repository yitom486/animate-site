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
  // 板块日志：须在 anime 布局动态段之前；section ∈ anime|book|music|game|real
  route(":section/blog", "routes/blog/list.tsx"),
  route(":section/blog/:id", "routes/blog/detail.tsx"),
  // /anime 是带子路由的布局：三栏外壳里放 <outlet/>
  route("anime", "routes/anime/layout.tsx", [
    index("routes/anime/index.tsx"), // /anime          → 右栏占位
    route(":id", "routes/anime/detail.tsx"), // /anime/:id → 右栏详情
  ]),
] satisfies RouteConfig;
