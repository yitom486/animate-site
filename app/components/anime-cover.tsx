import { useEffect, useState } from "react";
import { Skeleton } from "~/components/ui/skeleton";
import { cn } from "~/lib/utils";

type AnimeCoverProps = {
  url?: string;
  alt: string;
  className?: string;
};

/**
 * 封面异步加载：SSR 只输出占位符，客户端挂载后并发拉取图片。
 * HTML 里不会嵌入图片二进制，只有 hydrate 后浏览器才发起 img 请求。
 */
export function AnimeCover({ url, alt, className }: AnimeCoverProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoaded(false);
    setError(false);
    setSrc(url ?? null);
  }, [url]);

  if (!url) {
    return (
      <div
        className={cn(
          "flex size-full items-center justify-center bg-muted text-[10px] text-muted-foreground",
          className,
        )}
      >
        暂无封面
      </div>
    );
  }

  return (
    <div className={cn("relative size-full overflow-hidden bg-muted", className)}>
      {!loaded && !error ? (
        <Skeleton className="absolute inset-0 rounded-none" />
      ) : null}

      {src && !error ? (
        <img
          src={src}
          alt={alt}
          referrerPolicy="no-referrer"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          className={cn(
            "size-full object-cover transition-opacity duration-300",
            loaded ? "opacity-100" : "opacity-0",
          )}
        />
      ) : null}

      {error ? (
        <div className="flex size-full items-center justify-center text-[10px] text-muted-foreground">
          加载失败
        </div>
      ) : null}
    </div>
  );
}
