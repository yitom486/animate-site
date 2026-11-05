import { Skeleton } from "~/components/ui/skeleton";

const PLACEHOLDERS = Array.from({ length: 24 }, (_, i) => i);

export function AnimeListSkeleton() {
  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-border/70 bg-card/60 backdrop-blur-xs">
      <div className="flex shrink-0 items-center justify-between border-b border-border/70 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-6 w-28 rounded-md" />
          <Skeleton className="h-4 w-16 rounded-md" />
        </div>
        <Skeleton className="h-7 w-20 rounded-lg" />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
          {PLACEHOLDERS.map((i) => (
            <div
              key={i}
              className="flex flex-col overflow-hidden rounded-xl border border-border/60 bg-card shadow-xs"
            >
              <div className="relative aspect-[2/3] w-full overflow-hidden bg-muted">
                <Skeleton className="size-full rounded-none" />
                <div className="absolute top-2 left-2">
                  <Skeleton className="h-4 w-7 rounded-md" />
                </div>
              </div>
              <div className="space-y-2 p-3">
                <Skeleton className="h-3.5 w-full rounded-md" />
                <Skeleton className="h-2.5 w-3/5 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
