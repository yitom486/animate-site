import { useEffect, useState } from "react";
import { Form, useLocation, useNavigation } from "react-router";
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
  const navigation = useNavigation();
  const [query, setQuery] = useState(defaultQuery);

  // 顶栏：跳转完成后清空，避免结果页仍占着上次关键词
  useEffect(() => {
    if (!isHero && navigation.state === "idle") {
      setQuery("");
    }
  }, [isHero, navigation.state, location.pathname, location.search]);

  // Hero：跟随外部 defaultQuery（较少变化）
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
      <div
        className={cn(
          "flex min-w-0 items-center gap-1.5 sm:gap-2",
          isHero
            ? "h-14 rounded-lg border border-border bg-card px-2 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20"
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
                ? "h-10 min-w-24 px-3"
                : "h-8 min-w-[4.5rem] px-1.5 text-[11px] sm:min-w-20 sm:px-2 sm:text-xs",
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

        {!isHero ? null : <Search className="size-5 shrink-0 text-primary" aria-hidden />}
        <Input
          id={isHero ? "hero-search-q" : "nav-search-q"}
          name="q"
          type="search"
          required
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={isHero ? "搜索番剧、游戏、书籍或作品名" : "搜索…"}
          enterKeyHint="search"
          className={cn(
            "min-w-0 flex-1 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 dark:bg-transparent",
            isHero
              ? "h-10 text-sm text-foreground placeholder:text-muted-foreground"
              : "h-8 text-sm text-foreground placeholder:text-muted-foreground",
          )}
        />
        {isHero ? (
          <Button type="submit" className="h-10 gap-1.5 px-4 text-sm">
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
