import { useEffect, useState } from "react";
import { Form, useLocation } from "react-router";
import { ArrowRight, Search } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { cn } from "~/lib/utils";
import { SUBJECT_TYPE_ALL, SUBJECT_TYPE_OPTIONS, type ListTypeValue } from "~/lib/bangumi/types";

type SearchFormProps = {
  variant?: "hero" | "nav";
  defaultType?: ListTypeValue | string;
  defaultQuery?: string;
  className?: string;
};

export function SearchForm({
  variant = "nav",
  defaultType = SUBJECT_TYPE_ALL,
  defaultQuery = "",
  className,
}: SearchFormProps) {
  const isHero = variant === "hero";
  const typeValue = defaultType || SUBJECT_TYPE_ALL;
  const location = useLocation();
  const [query, setQuery] = useState(defaultQuery);

  // 保持关键词与 URL 搜索状态同步，方便用户在结果页继续修改或追加搜索词
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get("q") || "";
    if (params.get("view") === "search" && q) {
      setQuery(q);
    } else if (location.pathname === "/" && !isHero) {
      setQuery("");
    }
  }, [location.pathname, location.search, isHero]);

  // Hero：跟随外部 defaultQuery
  useEffect(() => {
    if (isHero) setQuery(defaultQuery);
  }, [isHero, defaultQuery]);

  return (
    <Form
      method="get"
      action="/anime"
      role="search"
      className={cn(isHero ? "w-full max-w-xl" : "min-w-0 w-full", className)}
    >
      <input type="hidden" name="view" value="search" />
      {!isHero ? (
        // 移动端顶栏隐藏 Select 以腾出输入空间，保留 hidden input 确保表单提交 type 参数
        <input type="hidden" name="type" value={typeValue} className="sm:hidden" />
      ) : null}
      <div
        className={cn(
          "flex min-w-0 items-center gap-1.5 sm:gap-2",
          isHero
            ? "h-12 sm:h-14 rounded-xl border border-border bg-card px-2 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20 shadow-xs"
            : "h-10 rounded-lg border border-border bg-card px-1 focus-within:border-ring",
        )}
      >
        <label className="sr-only" htmlFor={isHero ? "hero-search-q" : "nav-search-q"}>
          搜索作品
        </label>
        <Select name="type" defaultValue={typeValue} items={SUBJECT_TYPE_OPTIONS}>
          <SelectTrigger
            size={isHero ? "default" : "sm"}
            aria-label="搜索类型"
            className={cn(
              "shrink-0 border-0 bg-muted text-foreground shadow-none hover:bg-accent",
              isHero
                ? "h-9 min-w-20 px-2 text-xs sm:h-10 sm:min-w-24 sm:px-3 sm:text-sm"
                : "hidden h-8 min-w-[4.5rem] px-1.5 text-[11px] sm:inline-flex sm:min-w-20 sm:px-2 sm:text-xs",
            )}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="start" alignItemWithTrigger={false} className="min-w-36">
            {SUBJECT_TYPE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {!isHero ? null : (
          <Search className="hidden sm:block size-5 shrink-0 text-primary" aria-hidden />
        )}
        <Input
          id={isHero ? "hero-search-q" : "nav-search-q"}
          name="q"
          type="search"
          required
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={isHero ? "搜索番剧、游戏、书籍…" : "搜索…"}
          enterKeyHint="search"
          className={cn(
            "min-w-0 flex-1 border-0 bg-transparent px-1 shadow-none focus-visible:ring-0 dark:bg-transparent",
            isHero
              ? "h-9 text-xs sm:h-10 sm:text-sm text-foreground placeholder:text-muted-foreground placeholder:truncate"
              : "h-8 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground placeholder:truncate",
          )}
        />
        {isHero ? (
          <Button
            type="submit"
            className="h-9 shrink-0 gap-1 px-3 text-xs sm:h-10 sm:gap-1.5 sm:px-4 sm:text-sm font-bold shadow-xs shadow-primary/20"
          >
            搜索
            <ArrowRight className="size-3.5" />
          </Button>
        ) : (
          <Button
            type="submit"
            size="icon-sm"
            variant="ghost"
            aria-label="搜索"
            className="size-8 shrink-0 rounded-lg text-primary hover:bg-accent hover:text-primary"
          >
            <Search className="size-4" />
          </Button>
        )}
      </div>
    </Form>
  );
}
