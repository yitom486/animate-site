import { useQuery } from "@tanstack/react-query";
import { NewsPanel, NewsPanelError, NewsPanelSkeleton } from "~/components/news-panel";
import { homeNewsQuery } from "~/lib/news/queries";
import { Button } from "~/components/ui/button";

/**
 * 首页资讯：不挡 SSR。页面先出 Hero/导航，hydration 后再拉 /api/news。
 */
export function HomeNewsPanel({ className }: { className?: string }) {
  const query = useQuery(homeNewsQuery());
  if (query.data) return <NewsPanel feed={query.data} className={className} />;
  if (query.isError)
    return (
      <div className={className}>
        <NewsPanelError message="资讯暂时无法读取，请稍后重试。" />
        <Button variant="ghost" onClick={() => void query.refetch()} disabled={query.isFetching}>
          {query.isFetching ? "重试中…" : "重新加载资讯"}
        </Button>
      </div>
    );
  return <NewsPanelSkeleton className={className} />;
}
