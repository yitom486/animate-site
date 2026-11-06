import { useEffect, useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import {
  data,
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useNavigation,
  useRouteLoaderData,
  type ShouldRevalidateFunctionArgs,
} from "react-router";

import type { Route } from "./+types/root";
import { HamsterLoader } from "./components/hamster-loader";
import { ThemeProvider, themeFromCookie, themeInitScript } from "./lib/theme";
import { createQueryClient } from "./lib/query-client";
import "./app.css";

export const links: Route.LinksFunction = () => [];

export function loader({ request }: Route.LoaderArgs) {
  // root loader 包含请求者的主题偏好，不能与公开 API 共用 CDN 缓存策略。
  return data(
    { theme: themeFromCookie(request.headers.get("Cookie")) },
    {
      headers: { "Cache-Control": "private, no-cache" },
    },
  );
}

/** 主题由客户端 ThemeProvider 维护；普通 Link / 回退不必重跑 root loader。 */
export function shouldRevalidate({
  formMethod,
  defaultShouldRevalidate,
}: ShouldRevalidateFunctionArgs) {
  if (formMethod && formMethod.toUpperCase() !== "GET") {
    return defaultShouldRevalidate;
  }
  return false;
}

export function Layout({ children }: { children: React.ReactNode }) {
  const theme = useRouteLoaderData<typeof loader>("root")?.theme ?? "system";
  return (
    <html
      lang="zh-CN"
      className={theme === "dark" ? "dark" : undefined}
      data-theme={theme}
      suppressHydrationWarning
    >
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content="light dark" />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript(theme) }} />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

/** 缓存命中的回退通常 <150ms；延迟显示避免闪一下像整页重载。 */
const LOADER_DELAY_MS = 180;

export default function App({ loaderData }: Route.ComponentProps) {
  // 每棵应用树独立实例：SSR 请求间不共享用户数据，浏览器路由切换时保留缓存。
  const [queryClient] = useState(createQueryClient);
  const navigation = useNavigation();
  const [showLoader, setShowLoader] = useState(false);

  useEffect(() => {
    if (navigation.state === "idle") {
      setShowLoader(false);
      return;
    }
    const id = window.setTimeout(() => setShowLoader(true), LOADER_DELAY_MS);
    return () => window.clearTimeout(id);
  }, [navigation.state]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider initialTheme={loaderData.theme}>
        <Outlet />
        <HamsterLoader show={showLoader} />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404 ? "The requested page could not be found." : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
