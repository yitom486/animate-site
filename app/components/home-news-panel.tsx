import { useEffect, useState } from "react";
import { NewsPanel, NewsPanelError, NewsPanelSkeleton } from "~/components/news-panel";
import type { NewsFeed } from "~/lib/news";

/**
 * 首页资讯：不挡 SSR。页面先出 Hero/导航，hydration 后再拉 /api/news。
 */
export function HomeNewsPanel({ className }: { className?: string }) {
  const [feed, setFeed] = useState<NewsFeed | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();

    fetch("/api/news?limit=24", { signal: ac.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(`资讯接口 HTTP ${res.status}`);
        return (await res.json()) as NewsFeed;
      })
      .then((data) => {
        setFeed(data);
        setError(null);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        console.warn("[home-news]", err);
        setError("暂时无法拉取资讯，请稍后刷新。");
      });

    return () => ac.abort();
  }, []);

  if (feed) return <NewsPanel feed={feed} className={className} />;
  if (error) return <NewsPanelError className={className} message={error} />;
  return <NewsPanelSkeleton className={className} />;
}
