import { Form } from "react-router";
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
          "flex min-w-0 items-center gap-2",
          isHero
            ? "celadon-glass-strong h-14 rounded-lg px-2"
            : "h-10 rounded-lg border border-rose-100 bg-white/70 pl-1 pr-2",
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
              isHero ? "h-10 min-w-24 px-3" : "h-8 min-w-20 px-2 text-xs",
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

        <Search
          className={cn("shrink-0 text-rose-600", isHero ? "size-5" : "size-3.5")}
          aria-hidden
        />
        <Input
          id={isHero ? "hero-search-q" : "nav-search-q"}
          name="q"
          type="search"
          required
          defaultValue={defaultQuery}
          placeholder={isHero ? "搜索番剧、游戏、书籍或作品名" : "搜索…"}
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
          <button type="submit" className="sr-only">
            搜索
          </button>
        )}
      </div>
    </Form>
  );
}
