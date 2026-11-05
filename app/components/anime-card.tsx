import { Link, type PrefetchBehavior } from "react-router";
import { Star } from "lucide-react";
import { cn } from "~/lib/utils";
import { AnimeCover } from "~/components/anime-cover";
import {
  buildCardMeta,
  COVER_SIZES_GRID,
  getCoverSources,
  type AnimeCardData,
} from "~/lib/anime-meta";

type AnimeCardProps = {
  item: AnimeCardData;
  to: string;
  active?: boolean;
  priority?: boolean;
  rank?: number;
  /** 默认 intent：仅 hover/focus 时预取详情。viewport 留给后续小范围实验。 */
  prefetch?: PrefetchBehavior;
  /** 点击卡片时的快捷选择回调（例如打开原地抽屉），阻止整页跳转 */
  onSelect?: (item: AnimeCardData) => void;
};

export function AnimeCard({
  item,
  to,
  active,
  priority,
  rank,
  prefetch = "intent",
  onSelect,
}: AnimeCardProps) {
  const { title, subtitle, score, ratingTotal } = buildCardMeta(item);
  const cover = getCoverSources(item.images);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey && e.button === 0 && onSelect) {
      e.preventDefault();
      onSelect(item);
    }
  };

  return (
    <Link
      to={to}
      prefetch={prefetch}
      viewTransition
      onClick={onSelect ? handleClick : undefined}
      title={subtitle ? `${title} · ${subtitle}` : title}
      className={cn(
        "group flex flex-col overflow-hidden rounded-xl border border-border/70 bg-card shadow-xs transition-all duration-300 ease-out [content-visibility:auto] [contain-intrinsic-size:auto_280px]",
        "hover:-translate-y-1.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10",
        active && "border-primary/50 bg-card shadow-md shadow-primary/10 ring-2 ring-primary/40",
      )}
    >
      <div className="relative aspect-[2/3] overflow-hidden bg-muted">
        <AnimeCover
          url={cover?.src}
          srcSet={cover?.srcSet}
          sizes={COVER_SIZES_GRID}
          alt={title}
          priority={priority}
          className="transition-transform duration-500 ease-out group-hover:scale-105"
        />

        {/* 底部微暗遮罩（悬停渐显），增强二次元海报纵深感 */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-overlay via-overlay/30 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          aria-hidden
        />

        {rank != null ? (
          <div className="absolute top-2 left-2 rounded-md border border-primary/30 bg-background/95 px-1.5 py-0.5 font-mono text-[10px] font-bold text-primary shadow-xs">
            #{rank}
          </div>
        ) : null}

        {score != null ? (
          <div className="absolute top-2 right-2 flex items-center gap-1 rounded-md border border-warning/30 bg-background/95 px-1.5 py-0.5 font-mono text-[10px] font-bold text-rating shadow-xs">
            <Star className="size-2.5 fill-rating text-rating" />
            {score}
          </div>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col justify-between space-y-1.5 p-3">
        <div>
          <h3 className="line-clamp-1 font-serif text-xs font-bold leading-snug text-foreground transition-colors group-hover:text-primary">
            {title}
          </h3>
          {subtitle ? (
            <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">
              {subtitle}
            </p>
          ) : null}
        </div>
        {ratingTotal ? (
          <p className="truncate font-mono text-[10px] text-muted-foreground">
            {ratingTotal.toLocaleString()} 人评分
          </p>
        ) : null}
      </div>
    </Link>
  );
}
