import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router";
import { ChevronDown, Leaf, Menu } from "lucide-react";
import { SearchForm } from "~/components/search-form";
import { ThemeSelect } from "~/components/theme-select";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "~/components/ui/collapsible";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "~/components/ui/navigation-menu";
import { cn } from "~/lib/utils";
import { BGM_MENUS } from "~/lib/bangumi/menus";
import { SUBJECT_TYPE_ALL } from "~/lib/bangumi/types";

type SiteNavProps = { activeType?: string; searchType?: string };

export function SiteNav({ activeType, searchType = SUBJECT_TYPE_ALL }: SiteNavProps) {
  const location = useLocation();
  const [menuValue, setMenuValue] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMenuValue(null);
    setMobileOpen(false);
  }, [location.pathname, location.search]);

  return (
    <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
      <header className="fixed inset-x-0 top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-2 px-3 sm:gap-4 sm:px-6">
          <DialogTrigger
            render={
              <Button
                variant="ghost"
                size="icon-lg"
                className="xl:hidden"
                aria-label="打开导航菜单"
              />
            }
          >
            <Menu className="size-5" />
          </DialogTrigger>
          <Link
            to="/"
            prefetch="intent"
            aria-label="亚域空间首页"
            className="flex shrink-0 items-center gap-2.5"
          >
            <Leaf className="size-6 text-primary" aria-hidden />
            <span className="hidden font-serif text-lg font-semibold tracking-wide sm:block">
              亚域空间
            </span>
          </Link>
          <div className="hidden items-center gap-1 md:flex">
            {[
              { to: "/", label: "首页", active: location.pathname === "/" },
              {
                to: "/anime/blog",
                label: "社区日志",
                active: /^\/(anime|book|music|game|real)\/blog/.test(location.pathname),
              },
            ].map(({ to, label, active }) => (
              <Button
                key={to}
                variant="ghost"
                render={<Link to={to} prefetch="intent" />}
                nativeButton={false}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "text-muted-foreground transition-colors hover:text-foreground",
                  active &&
                    "border border-primary/25 bg-primary/15 font-bold text-primary shadow-2xs",
                )}
              >
                {label}
              </Button>
            ))}
          </div>
          <nav aria-label="作品分类" className="hidden flex-1 justify-center xl:flex">
            <NavigationMenu align="center" value={menuValue} onValueChange={setMenuValue}>
              <NavigationMenuList className="gap-1">
                {BGM_MENUS.map((menu) => (
                  <NavigationMenuItem key={menu.type} value={menu.type}>
                    <NavigationMenuTrigger
                      className={cn(
                        "h-9 text-muted-foreground transition-colors hover:text-foreground",
                        activeType === menu.type &&
                          "border border-primary/25 bg-primary/15 font-bold text-primary shadow-2xs",
                      )}
                    >
                      {menu.label}
                    </NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <ul className="grid max-h-[min(70vh,480px)] w-72 gap-1 overflow-y-auto p-2">
                        {menu.links.map(({ to, title, desc, icon: Icon }) => (
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
                                <Icon className="size-4 text-primary" />
                                {title}
                              </span>
                              {desc ? (
                                <span className="pl-6 text-xs text-muted-foreground">{desc}</span>
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
          <SearchForm variant="nav" defaultType={searchType} className="ml-auto max-w-sm flex-1" />
          <ThemeSelect />
        </div>
      </header>
      <div className="h-16 shrink-0" aria-hidden="true" />
      <DialogContent className="inset-y-0 left-0 top-0 flex h-dvh w-[min(90vw,24rem)] max-w-sm translate-x-0 translate-y-0 flex-col gap-0 rounded-none p-0">
        <DialogHeader className="border-b border-border px-5 py-5 pr-12">
          <DialogTitle className="flex items-center gap-2 font-serif text-lg">
            <Leaf className="size-5 text-primary" />
            亚域空间
          </DialogTitle>
          <DialogDescription>浏览作品分类与社区日志</DialogDescription>
        </DialogHeader>
        <nav aria-label="移动导航" className="min-h-0 flex-1 space-y-1 overflow-y-auto p-3">
          <Button
            variant="ghost"
            className="h-10 w-full justify-start"
            render={<Link to="/" onClick={() => setMobileOpen(false)} />}
            nativeButton={false}
          >
            首页
          </Button>
          <Button
            variant="ghost"
            className="h-10 w-full justify-start"
            render={<Link to="/anime/blog" onClick={() => setMobileOpen(false)} />}
            nativeButton={false}
          >
            社区日志
          </Button>
          {BGM_MENUS.map((menu) => (
            <Collapsible key={menu.type} defaultOpen={activeType === menu.type}>
              <CollapsibleTrigger
                render={<Button variant="ghost" className="group h-11 w-full justify-between" />}
              >
                {menu.label}
                <ChevronDown className="size-4 transition-transform group-aria-expanded:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <ul className="ml-3 space-y-1 border-l border-border py-1 pl-3">
                  {menu.links.map(({ to, title, desc }) => (
                    <li key={to}>
                      <Link
                        to={to}
                        prefetch="intent"
                        onClick={() => setMobileOpen(false)}
                        className="block rounded-md px-3 py-2 hover:bg-muted"
                      >
                        <span className="block text-sm">{title}</span>
                        {desc ? (
                          <span className="mt-0.5 block text-xs text-muted-foreground">{desc}</span>
                        ) : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </nav>
      </DialogContent>
    </Dialog>
  );
}
