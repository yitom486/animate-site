import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { flushSync } from "react-dom";
import { createThemeTransitionController } from "~/lib/theme-transition";

export type ThemePreference = "light" | "dark" | "system";
export const THEME_COOKIE = "celadon-theme";

export function parseThemePreference(value?: string | null): ThemePreference {
  return value === "light" || value === "dark" ? value : "system";
}

export function themeFromCookie(cookie: string | null): ThemePreference {
  const value = cookie?.split(";").find((part) => part.trim().startsWith(`${THEME_COOKIE}=`));
  return parseThemePreference(value?.trim().slice(THEME_COOKIE.length + 1));
}

const ThemeContext = createContext<{
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
} | null>(null);

export function ThemeProvider({
  initialTheme,
  children,
}: {
  initialTheme: ThemePreference;
  children: ReactNode;
}) {
  const [theme, setThemeState] = useState(initialTheme);
  const preference = useRef(initialTheme);
  const transitions = useRef<ReturnType<typeof createThemeTransitionController> | null>(null);
  const commitTheme = useCallback((next: ThemePreference) => {
    document.documentElement.classList.toggle(
      "dark",
      next === "dark" ||
        (next === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches),
    );
    document.documentElement.dataset.theme = next;
    // 确保主题与 React 控件状态在新快照前一起提交。
    flushSync(() => setThemeState(next));
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const controller = transitions.current ?? createThemeTransitionController(document);
    transitions.current = controller;
    const onSystemThemeChange = () => {
      if (preference.current !== "system") return;
      controller.run(
        () => commitTheme("system"),
        window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      );
    };
    // 首屏由 themeInitScript 同步设置；这里只监听运行中的系统主题变化。
    media.addEventListener("change", onSystemThemeChange);
    return () => {
      media.removeEventListener("change", onSystemThemeChange);
      controller.cancel();
      transitions.current = null;
    };
  }, [commitTheme]);

  const setTheme = (next: ThemePreference) => {
    if (next === preference.current) return;
    preference.current = next;
    document.cookie = `${THEME_COOKIE}=${next}; Path=/; Max-Age=31536000; SameSite=Lax${window.location.protocol === "https:" ? "; Secure" : ""}`;
    const controller = transitions.current ?? createThemeTransitionController(document);
    transitions.current = controller;
    controller.run(
      () => commitTheme(next),
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
  };

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme requires ThemeProvider");
  return context;
}

/** 仅插入经过枚举校验的值；在 React 水合前应用系统主题，避免亮色首屏闪烁。 */
export function themeInitScript(theme: ThemePreference): string {
  return `(()=>{const t=${JSON.stringify(parseThemePreference(theme))};document.documentElement.classList.toggle("dark",t==="dark"||(t==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches));document.documentElement.dataset.theme=t;})();`;
}
