import { Link } from "react-router";
import { Star } from "lucide-react";
import { cn } from "~/lib/utils";
import { AnimeCover } from "~/components/anime-cover";
import { buildCardMeta, getCoverUrl, type AnimeCardData } from "~/lib/anime-meta";

type AnimeCardProps = {
  item: AnimeCardData;
  to: string;
  active?: boolean;
  priority?: boolean;
  rank?: number;
};

export function AnimeCard({ item, to, active, priority, rank }: AnimeCardProps) {
  const { title, subtitle, score, ratingTotal } = buildCardMeta(item);
  const cover = getCoverUrl(item.images);

  return (
    <Link
      to={to}
      prefetch="viewport"
      title={subtitle ? `${title} · ${subtitle}` : title}
      className={cn(
        "group flex flex-col overflow-hidden rounded-lg border border-white/75 bg-white/62 shadow-sm transition-all duration-300",
        "hover:-translate-y-0.5 hover:border-rose-300 hover:bg-white/88 hover:shadow-md",
        active && "border-rose-400 bg-white shadow-md ring-2 ring-rose-500/25",
      )}
    >
      <div className="relative aspect-[2/3] overflow-hidden bg-rose-50">
        <AnimeCover
          url={cover}
          alt={title}
          priority={priority}
          className="transition-transform duration-300 group-hover:scale-[1.03]"
        />

        {rank != null ? (
          <div className="absolute top-1.5 left-1.5 rounded-md border border-rose-200 bg-white/90 px-1.5 py-0.5 font-mono text-[10px] font-bold text-rose-800 backdrop-blur-sm">
            #{rank}
          </div>
        ) : null}

        {score != null ? (
          <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 rounded-md border border-amber-200 bg-white/90 px-1.5 py-0.5 font-mono text-[10px] font-bold text-amber-600 backdrop-blur-sm">
            <Star className="size-2.5 fill-amber-500 text-amber-500" />
            {score}
          </div>
        ) : null}
      </div>

      <div className="space-y-1 border-t border-rose-50/80 px-2.5 py-2">
        <h3 className="line-clamp-1 font-serif text-xs font-bold leading-tight text-slate-800 transition-colors group-hover:text-rose-700">
          {title}
        </h3>
        {subtitle ? (
          <p className="truncate font-mono text-[10px] text-slate-500">{subtitle}</p>
        ) : null}
        {ratingTotal ? (
          <p className="truncate font-mono text-[10px] text-slate-400">
            {ratingTotal.toLocaleString()} 人评分
          </p>
        ) : null}
      </div>
    </Link>
  );
}
