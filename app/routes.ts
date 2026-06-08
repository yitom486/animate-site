import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("api/anime/list", "routes/api/anime.list.ts"),
  route("api/anime/detail/:id", "routes/api/anime.detail.$id.ts"),
  // /anime 是带子路由的布局：三栏外壳里放 <Outlet/>
  route("anime", "routes/anime/layout.tsx", [
    index("routes/anime/index.tsx"), // /anime          → 右栏占位
    route(":id", "routes/anime/detail.tsx"), // /anime/:id → 右栏详情
  ]),
] satisfies RouteConfig;
