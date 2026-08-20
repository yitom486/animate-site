type VisibleCallback = () => void;

const observed = new Map<Element, VisibleCallback>();
let sharedObserver: IntersectionObserver | null = null;

function getSharedObserver(): IntersectionObserver {
  if (sharedObserver) return sharedObserver;

  sharedObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const cb = observed.get(entry.target);
        if (!cb) continue;
        observed.delete(entry.target);
        sharedObserver?.unobserve(entry.target);
        cb();
      }
    },
    { rootMargin: "200px" },
  );

  return sharedObserver;
}

/**
 * 共享 IntersectionObserver：多卡注册到同一实例，进入预取区后触发一次并注销。
 */
export function observeInViewOnce(el: Element, onVisible: VisibleCallback): () => void {
  observed.set(el, onVisible);
  getSharedObserver().observe(el);

  return () => {
    if (!observed.has(el)) return;
    observed.delete(el);
    sharedObserver?.unobserve(el);
  };
}
