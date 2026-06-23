import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Form, Link, useLocation } from "react-router";
import { ChevronDown, Home, Leaf, Menu, MessageSquareText, Search, X } from "lucide-react";
import { cn } from "~/lib/utils";
import { BGM_MENUS, SUBJECT_TYPE } from "~/lib/bangumi";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "~/components/ui/navigation-menu";

type SiteNavProps = {
  activeType?: string;
  searchType?: string;
};

export function SiteNav({ activeType, searchType = SUBJECT_TYPE.anime }: SiteNavProps) {
  const location = useLocation();
  // 受控菜单值：路由变化后自动收起下拉（base-ui 在 SPA 跳转后不会自动关闭）
  const [menuValue, setMenuValue] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMenuValue(null);
    setMobileOpen(false);
  }, [location.pathname, location.search]);

  return (
    <header className="sticky top-0 z-30 border-b border-white/70 bg-white/60 backdrop-blur-xl">
      <div className="relative flex h-16 w-full items-center gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="打开导航菜单"
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-rose-100 bg-white/70 text-rose-700 shadow-sm transition-colors hover:bg-white lg:hidden"
          >
            <Menu className="size-5" />
          </button>

          <Link
            to="/"
            prefetch="intent"
            className="flex shrink-0 items-center gap-3"
          >
            <span className="flex size-10 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-700 shadow-inner">
              <Leaf className="size-5" />
            </span>
            <span className="hidden sm:block">
              <span className="block bg-gradient-to-r from-rose-800 to-sky-600 bg-clip-text font-serif text-lg font-black tracking-wider text-transparent">
                亚域空间
              </span>
              <span className="-mt-1 block font-mono text-[10px] font-semibold uppercase tracking-widest text-rose-600">
                Celadon Portal
              </span>
            </span>
          </Link>

          <Link
            to="/"
            prefetch="intent"
            className={cn(
              "hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-bold transition-colors sm:inline-flex",
              location.pathname === "/"
                ? "bg-white/80 text-rose-800 shadow-sm"
                : "text-slate-600 hover:bg-white/70 hover:text-rose-700",
            )}
          >
            <Home className="size-4" />
            主页
          </Link>

          <Link
            to="/anime/blog"
            prefetch="intent"
            className={cn(
              "hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-bold transition-colors sm:inline-flex",
              location.pathname === "/anime/blog"
                ? "bg-white/80 text-rose-800 shadow-sm"
                : "text-slate-600 hover:bg-white/70 hover:text-rose-700",
            )}
          >
            <MessageSquareText className="size-4" />
            动画日志
          </Link>
        </div>

        <nav className="absolute top-1/2 left-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center justify-center gap-1 lg:flex">
          <NavigationMenu
            align="center"
            value={menuValue}
            onValueChange={setMenuValue}
          >
            <NavigationMenuList className="gap-1">
              {BGM_MENUS.map((m) => (
                <NavigationMenuItem key={m.type} value={m.type}>
                  <NavigationMenuTrigger
                    className={cn(
                      "h-10 rounded-lg px-3 font-serif text-sm text-slate-600 hover:bg-white/70 hover:text-rose-700 data-open:bg-white/70",
                      activeType === m.type && "bg-white/85 text-rose-800 shadow-sm",
                    )}
                  >
                    {m.label}
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul
                      className={cn(
                        "grid max-h-[min(70vh,480px)] gap-1 overflow-y-auto p-2",
                        m.type === SUBJECT_TYPE.anime
                          ? "w-[320px]"
                          : "w-[220px]",
                      )}
                    >
                      {m.links.map(({ to, title, desc, icon: Icon }) => (
                        <li key={to}>
                          <NavigationMenuLink
                            render={
                              <Link
                                to={to}
                                prefetch="intent"
                                onClick={() => setMenuValue(null)}
                              />
                            }
                            className="flex-col items-start gap-0.5"
                          >
                            <span className="flex items-center gap-2 text-sm font-medium">
                              <Icon className="size-4 shrink-0 text-rose-600" />
                              {title}
                            </span>
                            {desc ? (
                              <span className="pl-6 text-xs text-muted-foreground">
                                {desc}
                              </span>
                            ) : null}
                          </NavigationMenuLink>
                        </li>
                      ))}
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              ))}
            </NavigationMenuList>
          </NavigationMenu>
        </nav>

        <Form
          method="get"
          action="/anime"
          className="ml-auto flex min-w-0 max-w-sm flex-1 items-center gap-1.5"
        >
          <input type="hidden" name="type" value={searchType} />
          <input type="hidden" name="view" value="search" />
          <div className="relative w-full">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-rose-600" />
            <input
              name="q"
              type="search"
              placeholder="搜索…"
              className="h-10 w-full rounded-lg border border-rose-100 bg-white/70 py-1 pr-3 pl-9 text-sm text-slate-800 outline-none transition focus-visible:border-rose-300 focus-visible:ring-2 focus-visible:ring-rose-500/20"
            />
          </div>
        </Form>
      </div>

      <MobileNav
        open={mobileOpen}
        activeType={activeType}
        onClose={() => setMobileOpen(false)}
      />
    </header>
  );
}

/* ───────── 移动端导航抽屉 ───────── */
function MobileNav({
  open,
  activeType,
  onClose,
}: {
  open: boolean;
  activeType?: string;
  onClose: () => void;
}) {
  // 手风琴：默认仅展开当前所在分类，其余收起
  const [openGroups, setOpenGroups] = useState<Set<string>>(
    () => new Set(activeType ? [activeType] : []),
  );
  const toggleGroup = (type: string) =>
    setOpenGroups((prev) => {
      const next = new Set(prev);
      next.has(type) ? next.delete(type) : next.add(type);
      return next;
    });

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 lg:hidden">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="absolute inset-y-0 left-0 flex w-[82%] max-w-sm flex-col bg-white/95 shadow-2xl">
        <div className="flex items-center justify-between border-b border-rose-100 px-4 py-4">
          <span className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-700">
              <Leaf className="size-4" />
            </span>
            <span className="bg-gradient-to-r from-rose-800 to-sky-600 bg-clip-text font-serif text-base font-black tracking-wider text-transparent">
              亚域空间
            </span>
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            className="rounded-lg border border-rose-100 bg-white/70 p-1.5 text-slate-500 transition-colors hover:bg-white hover:text-rose-700"
          >
            <X className="size-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-3">
          <Link
            to="/"
            prefetch="intent"
            onClick={onClose}
            className="mb-2 flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-rose-50 hover:text-rose-700"
          >
            <Home className="size-4 text-rose-600" />
            主页
          </Link>

          {BGM_MENUS.map((m) => {
            const isOpen = openGroups.has(m.type);
            return (
              <div key={m.type} className="mb-0.5">
                <button
                  type="button"
                  onClick={() => toggleGroup(m.type)}
                  aria-expanded={isOpen}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-3 py-2.5 font-serif text-sm font-bold transition-colors hover:bg-rose-50",
                    activeType === m.type ? "text-rose-700" : "text-slate-600",
                  )}
                >
                  {m.label}
                  <ChevronDown
                    className={cn(
                      "size-4 text-slate-400 transition-transform duration-200",
                      isOpen && "rotate-180",
                    )}
                  />
                </button>
                {isOpen ? (
                  <ul className="mt-0.5 mb-1 border-l border-rose-100 pl-2">
                    {m.links.map(({ to, title, desc, icon: Icon }) => (
                      <li key={to}>
                        <Link
                          to={to}
                          prefetch="intent"
                          onClick={onClose}
                          className="flex items-start gap-2 rounded-lg px-3 py-2 transition-colors hover:bg-rose-50"
                        >
                          <Icon className="mt-0.5 size-4 shrink-0 text-rose-600" />
                          <span className="min-w-0">
                            <span className="block text-sm font-medium text-slate-700">
                              {title}
                            </span>
                            {desc ? (
                              <span className="block text-xs text-slate-400">
                                {desc}
                              </span>
                            ) : null}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            );
          })}
        </nav>
      </div>
    </div>,
    document.body,
  );
}
