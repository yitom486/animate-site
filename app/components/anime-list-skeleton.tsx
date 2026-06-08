import { Skeleton } from "~/components/ui/skeleton";

const PLACEHOLDERS = Array.from({ length: 24 }, (_, i) => i);

export function AnimeListSkeleton() {
  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 items-baseline gap-2 px-4 pt-4">
        <Skeleton className="h-6 w-12" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="grid grid-cols-3 gap-3 p-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
          {PLACEHOLDERS.map((i) => (
            <div key={i} className="overflow-hidden rounded-lg ring-1 ring-border/60">
              <Skeleton className="aspect-[2/3] w-full rounded-none" />
              <div className="space-y-1 px-2 py-1.5">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-2.5 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
