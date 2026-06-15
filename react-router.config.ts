import type { Config } from "@react-router/dev/config";

export default {
  // Config options...
  // Server-side render by default, to enable SPA mode set this to `false`
  ssr: true,
  future: {
    // v8_middleware 需要 RouterContextProvider 形式的 load context，
    // 而 Cloudflare Pages 的 createPagesFunctionHandler 传的是普通对象，
    // 开启会导致每个请求 500「Invalid context value」。项目未用 middleware，关闭即可。
    v8_passThroughRequests: true,
    v8_splitRouteModules: true,
    v8_trailingSlashAwareDataRequests: true,
    v8_viteEnvironmentApi: true,
  },
} satisfies Config;
