import { useEffect, useRef, useState } from "react";
import { Skeleton } from "~/components/ui/skeleton";
import { cn } from "~/lib/utils";
import { toProxiedImageUrl } from "~/lib/anime-meta";

type AnimeCoverProps = {
  url?: string;
  fallbackUrl?: string;
  srcSet?: string;
  sizes?: string;
  alt: string;
  className?: string;
  priority?: boolean;
};

/**
 * 封面加载组件：
 * 支持服务端直接渲染 <img> 以激活浏览器 Preload Scanner。
 * priority 时 eager + high；其余 lazy + auto。
 * 有 srcSet/sizes 时由浏览器按布局宽度选档。
 */
export function AnimeCover({
  url,
  fallbackUrl,
  srcSet,
  sizes,
  alt,
  className,
  priority,
}: AnimeCoverProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [activeUrl, setActiveUrl] = useState(() => url);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setActiveUrl(url);
    setLoaded(false);
    setError(false);
  }, [url]);

  const proxiedUrl = toProxiedImageUrl(activeUrl);

  useEffect(() => {
    setLoaded(false);
    setError(false);
    if (imgRef.current?.complete && (imgRef.current?.naturalWidth ?? 0) > 0) {
      setLoaded(true);
    }
  }, [proxiedUrl, srcSet]);

  const handleError = () => {
    if (fallbackUrl && activeUrl !== fallbackUrl) {
      setActiveUrl(fallbackUrl);
    } else {
      setError(true);
    }
  };

  if (!proxiedUrl) {
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
      {!loaded && !error ? <Skeleton className="absolute inset-0 rounded-none" /> : null}

      <img
        ref={imgRef}
        src={proxiedUrl}
        srcSet={activeUrl === url ? srcSet : undefined}
        sizes={srcSet ? sizes : undefined}
        alt={alt}
        referrerPolicy="no-referrer"
        decoding="async"
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        onLoad={() => setLoaded(true)}
        onError={handleError}
        className={cn(
          "size-full object-cover transition-opacity duration-300",
          loaded ? "opacity-100" : "opacity-0",
        )}
      />

      {error ? (
        <div className="flex size-full items-center justify-center bg-muted text-[10px] text-muted-foreground">
          加载失败
        </div>
      ) : null}
    </div>
  );
}
