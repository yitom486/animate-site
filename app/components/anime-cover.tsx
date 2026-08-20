import { useEffect, useRef, useState } from "react";
import { Skeleton } from "~/components/ui/skeleton";
import { cn } from "~/lib/utils";

type AnimeCoverProps = {
  url?: string;
  alt: string;
  className?: string;
  priority?: boolean;
};

/**
 * 封面加载组件：
 * 支持服务端直接渲染 <img> 标签以激活浏览器 Preload Scanner。
 * 根据 priority 决定使用原生 lazy-load 还是高优先级 eager 加载。
 */
export function AnimeCover({ url, alt, className, priority }: AnimeCoverProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // 监听 url 变化或挂载事件，重置加载状态并检查缓存情况
  useEffect(() => {
    setLoaded(false);
    setError(false);
    if (imgRef.current?.complete) {
      setLoaded(true);
    }
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
      {!loaded && !error ? <Skeleton className="absolute inset-0 rounded-none" /> : null}

      <img
        ref={imgRef}
        src={url}
        alt={alt}
        referrerPolicy="no-referrer"
        decoding="async"
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "low"}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        className={cn(
          "size-full object-cover transition-opacity duration-300",
          loaded ? "opacity-100" : "opacity-0",
        )}
      />

      {error ? (
        <div className="flex size-full items-center justify-center text-[10px] text-muted-foreground">
          加载失败
        </div>
      ) : null}
    </div>
  );
}
