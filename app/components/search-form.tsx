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
            ? "celadon-glass-strong h-14 rounded-lg px-2"
            : "h-10 rounded-lg border border-rose-100 bg-white/70 pl-1 pr-1",
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
              "shrink-0 border-0 bg-rose-50/80 text-rose-800 shadow-none hover:bg-rose-50 focus-visible:ring-rose-500/20",
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

        {!isHero ? null : <Search className="size-5 shrink-0 text-rose-600" aria-hidden />}
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
              ? "h-10 text-sm text-slate-800 placeholder:text-slate-400"
              : "h-8 text-sm text-slate-800 placeholder:text-slate-400",
          )}
        />
        {isHero ? (
          <Button
            type="submit"
            className="h-9 gap-1.5 rounded-lg bg-gradient-to-r from-rose-300 to-sky-300 px-4 text-xs font-bold text-slate-700 shadow-md shadow-rose-900/5 hover:from-rose-200 hover:to-sky-200"
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
            className="size-8 shrink-0 rounded-lg text-rose-700 hover:bg-rose-50 hover:text-rose-800"
          >
            <Search className="size-4" />
          </Button>
        )}
      </div>
    </Form>
  );
}
