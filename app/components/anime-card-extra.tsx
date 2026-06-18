import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import type { CardExtra } from "~/lib/bangumi";

/** 浏览器内存缓存 + 在途去重，切换星期/重渲染不会重复请求 */
const clientCache = new Map<number, CardExtra>();
const inFlight = new Map<number, Promise<CardExtra>>();

async function loadCardExtra(id: number): Promise<CardExtra> {
  const cached = clientCache.get(id);
  if (cached) return cached;

  const existing = inFlight.get(id);
  if (existing) return existing;

  const p = fetch(`/api/anime/card/${id}`)
    .then((res) => {
      if (!res.ok) throw new Error(`card ${id} failed: ${res.status}`);
      return res.json() as Promise<CardExtra>;
    })
    .then((data) => {
      clientCache.set(id, data);
      inFlight.delete(id);
      return data;
    })
    .catch((err) => {
      inFlight.delete(id);
      throw err;
    });

  inFlight.set(id, p);
  return p;
}

/** 元素进入视口（含临近 200px）触发一次，用于懒加载——可视的优先、其余滚动到临近时补全 */
function useInViewOnce<T extends Element>(rootMargin = "200px") {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (inView) return;
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [inView, rootMargin]);

  return { ref, inView };
}

/** 卡片懒加载增强数据：进入视口后异步拉取详情字段 */
export function useCardExtra<T extends Element>(id: number) {
  const { ref, inView } = useInViewOnce<T>();
  const [data, setData] = useState<CardExtra | null>(
    () => clientCache.get(id) ?? null,
  );

  useEffect(() => {
    if (!inView || data) return;
    let alive = true;
    loadCardExtra(id)
      .then((d) => {
        if (alive) setData(d);
      })
      .catch(() => {
        /* 单卡片失败静默降级，不影响其余卡片 */
      });
    return () => {
      alive = false;
    };
  }, [id, inView, data]);

  return { ref, data };
}

/** 简介弹窗 */
export function SummaryModal({
  title,
  summary,
  onClose,
}: {
  title: string;
  summary: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/85 bg-white/95 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-rose-100 px-6 py-4">
          <h2 className="font-serif text-lg font-bold leading-snug text-slate-800">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            className="shrink-0 rounded-lg border border-rose-100 bg-white/70 p-1.5 text-slate-500 transition-colors hover:bg-white hover:text-rose-700"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5">
          <p className="whitespace-pre-line font-serif text-sm leading-relaxed text-slate-700">
            {summary}
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
