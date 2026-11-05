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
} from "react-router";

import type { Route } from "./+types/root";
import { HamsterLoader } from "./components/hamster-loader";
import { ThemeProvider, themeFromCookie, themeInitScript } from "./lib/theme";
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

export default function App({ loaderData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const isLoading = navigation.state !== "idle";

  return (
    <ThemeProvider initialTheme={loaderData.theme}>
      <Outlet />
      <HamsterLoader show={isLoading} />
    </ThemeProvider>
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
