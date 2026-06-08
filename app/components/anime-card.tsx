import { Link } from "react-router";
import { Star } from "lucide-react";
import { cn } from "~/lib/utils";
import { AnimeCover } from "~/components/anime-cover";
import { buildCardMeta, getCoverUrl, type AnimeCardData } from "~/lib/anime-meta";

type AnimeCardProps = {
  item: AnimeCardData;
  to: string;
  active?: boolean;
};

export function AnimeCard({ item, to, active }: AnimeCardProps) {
  const { title, subtitle, score } = buildCardMeta(item);
  const cover = getCoverUrl(item.images);

  return (
    <Link
      to={to}
      prefetch="viewport"
      title={subtitle ? `${title} · ${subtitle}` : title}
      className={cn(
        "group flex flex-col overflow-hidden rounded-lg bg-card ring-1 ring-border/60 transition-all duration-200",
        "hover:-translate-y-0.5 hover:shadow-md hover:ring-primary/40",
        active && "shadow-md ring-2 ring-primary",
      )}
    >
      <div className="relative aspect-[2/3] overflow-hidden">
        <AnimeCover
          url={cover}
          alt={title}
          className="transition-transform duration-300 group-hover:scale-[1.03]"
        />

        {score != null ? (
          <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-orange-400 backdrop-blur-sm">
            <Star className="size-2.5 fill-orange-400" />
            {score}
          </div>
        ) : null}
      </div>

      <div className="space-y-0.5 px-2 py-1.5">
        <h3 className="line-clamp-1 text-xs font-medium leading-tight">
          {title}
        </h3>
        {subtitle ? (
          <p className="truncate text-[10px] text-muted-foreground">
            {subtitle}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
