import { Form, Link, useLocation } from "react-router";
import { Home, Leaf, Search } from "lucide-react";
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

  return (
    <header className="sticky top-0 z-30 border-b border-white/70 bg-white/60 backdrop-blur-xl">
      <div className="relative flex h-16 w-full items-center gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
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
        </div>

        <nav className="absolute top-1/2 left-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center justify-center gap-1 lg:flex">
          <NavigationMenu align="center">
            <NavigationMenuList className="gap-1">
              {BGM_MENUS.map((m) => (
                <NavigationMenuItem key={m.type}>
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
                            render={<Link to={to} prefetch="intent" />}
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
    </header>
  );
}
