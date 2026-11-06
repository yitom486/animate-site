import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router";
import {
  BookOpen,
  CalendarDays,
  ChevronDown,
  Clapperboard,
  Gamepad2,
  Leaf,
  Menu,
  MessageSquareText,
  Music,
  Newspaper,
  Search,
  Tv,
} from "lucide-react";
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
import { BGM_MENUS, type MenuGroup } from "~/lib/bangumi/menus";
import { SUBJECT_TYPE_ALL } from "~/lib/bangumi/types";

const NEWS_MENU: MenuGroup = {
  type: "news",
  label: "资讯",
  links: [
    {
      to: "/news",
      title: "全部资讯",
      desc: "30天即时情报速报",
      icon: Newspaper,
    },
    {
      to: "/news?channel=anime",
      title: "日本动漫资讯",
      desc: "新番制作与播出动态",
      icon: Tv,
    },
    {
      to: "/news?channel=events",
      title: "国内漫展资讯",
      desc: "全国展会与同人日历",
      icon: CalendarDays,
    },
  ],
};

const BLOG_MENU: MenuGroup = {
  type: "blog",
  label: "社区日志",
  links: [
    {
      to: "/anime/blog",
      title: "动画日志",
      desc: "番剧长文与漫评解析",
      icon: MessageSquareText,
    },
    {
      to: "/book/blog",
      title: "书籍日志",
      desc: "轻小说与漫画书评",
      icon: BookOpen,
    },
    {
      to: "/music/blog",
      title: "音乐日志",
      desc: "原声带与同人乐评",
      icon: Music,
    },
    {
      to: "/game/blog",
      title: "游戏日志",
      desc: "Galgame 与主机日志",
      icon: Gamepad2,
    },
    {
      to: "/real/blog",
      title: "三次元日志",
      desc: "特摄与影视漫改探讨",
      icon: Clapperboard,
    },
  ],
};

const ALL_NAV_MENUS: MenuGroup[] = [...BGM_MENUS, NEWS_MENU, BLOG_MENU];

type SiteNavProps = { activeType?: string; searchType?: string };

export function SiteNav({ activeType, searchType = SUBJECT_TYPE_ALL }: SiteNavProps) {
  const location = useLocation();
  const [menuValue, setMenuValue] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMenuValue(null);
    setMobileOpen(false);
  }, [location.pathname, location.search]);

  // 根据当前路由确定高亮选中的导航分组
  const currentActive = location.pathname.startsWith("/news")
    ? "news"
    : /^\/(anime|book|music|game|real)\/blog/.test(location.pathname)
      ? "blog"
      : activeType;

  return (
    <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
      <header className="fixed inset-x-0 top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur-md transform-gpu">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-2 px-4 sm:gap-4 sm:px-6">
          {/* 移动端汉堡菜单 */}
          <DialogTrigger
            render={
              <Button
                variant="ghost"
                size="icon-lg"
                className="lg:hidden"
                aria-label="打开导航菜单"
              />
            }
          >
            <Menu className="size-5" />
          </DialogTrigger>

          {/* 品牌 Logo（点击直达首页，免去多余的首页文字按钮） */}
          <Link
            to="/"
            prefetch="intent"
            aria-label="亚域空间首页"
            className="flex shrink-0 items-center gap-2 transition-transform hover:scale-[1.02]"
          >
            <Leaf className="size-6 text-primary shrink-0" aria-hidden />
            <span className="font-serif text-base font-semibold tracking-wide sm:text-lg">
              亚域空间
            </span>
          </Link>

          {/* 统一的一级主导航栏（动画 / 书籍 / 音乐 / 游戏 / 三次元 / 资讯 / 社区日志） */}
          <nav aria-label="全站导航" className="hidden flex-1 justify-center lg:flex">
            <NavigationMenu align="center" value={menuValue} onValueChange={setMenuValue}>
              <NavigationMenuList className="gap-0.5">
                {ALL_NAV_MENUS.map((menu) => {
                  const isActive = currentActive === menu.type;
                  return (
                    <NavigationMenuItem key={menu.type} value={menu.type}>
                      <NavigationMenuTrigger
                        className={cn(
                          "h-9 px-3 text-muted-foreground transition-colors hover:text-foreground",
                          isActive &&
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
                  );
                })}
              </NavigationMenuList>
            </NavigationMenu>
          </nav>

          {/* 桌面端常驻搜索框（移动端隐藏，转移至移动端侧边抽屉栏） */}
          <SearchForm
            variant="nav"
            defaultType={searchType}
            className="ml-auto hidden max-w-sm flex-1 lg:flex"
          />

          {/* 移动端右侧快捷操作：搜索图标 + 主题切换 */}
          <div className="ml-auto flex items-center gap-1 lg:hidden">
            <Button
              variant="ghost"
              size="icon-lg"
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="打开侧边栏搜索"
              className="text-muted-foreground hover:text-primary"
            >
              <Search className="size-5" />
            </Button>
          </div>

          <ThemeSelect />
        </div>
      </header>

      <div className="h-16 shrink-0" aria-hidden="true" />

      {/* 移动端侧边抽屉导航 */}
      <DialogContent className="inset-y-0 left-0 top-0 flex h-dvh w-[min(90vw,24rem)] max-w-sm translate-x-0 translate-y-0 flex-col gap-0 rounded-none p-0">
        <DialogHeader className="border-b border-border px-5 py-4 pr-12">
          <DialogTitle className="flex items-center gap-2 font-serif text-lg">
            <Leaf className="size-5 text-primary" />
            亚域空间
          </DialogTitle>
          <DialogDescription>作品分类、情报资讯与社区日志</DialogDescription>
        </DialogHeader>

        {/* 侧边栏专属全功能搜索框 */}
        <div className="border-b border-border/70 bg-muted/20 p-4">
          <SearchForm
            variant="drawer"
            defaultType={searchType}
            onSearchSubmit={() => setMobileOpen(false)}
          />
        </div>

        <nav aria-label="移动导航" className="min-h-0 flex-1 space-y-1 overflow-y-auto p-3">
          {ALL_NAV_MENUS.map((menu) => (
            <Collapsible key={menu.type} defaultOpen={currentActive === menu.type}>
              <CollapsibleTrigger
                render={<Button variant="ghost" className="group h-11 w-full justify-between" />}
              >
                <span className={cn(currentActive === menu.type && "font-bold text-primary")}>
                  {menu.label}
                </span>
                <ChevronDown className="size-4 transition-transform group-aria-expanded:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <ul className="ml-3 space-y-1 border-l border-border py-1 pl-3">
                  {menu.links.map(({ to, title, desc, icon: Icon }) => (
                    <li key={to}>
                      <Link
                        to={to}
                        prefetch="intent"
                        onClick={() => setMobileOpen(false)}
                        className="flex flex-col rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted"
                      >
                        <span className="flex items-center gap-2 font-medium text-foreground">
                          <Icon className="size-4 text-primary" />
                          {title}
                        </span>
                        {desc ? (
                          <span className="pl-6 text-xs text-muted-foreground">{desc}</span>
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
