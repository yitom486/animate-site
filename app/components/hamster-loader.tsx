import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

type HamsterLoaderProps = { show: boolean };

const ANIME_LOADING_HINTS = [
  "新番传送中…",
  "少女祈祷中…",
  "正在连线 Bangumi…",
  "精彩即将展开… ✦",
  "魔导阵充能中…",
];

/**
 * 现代二次元萌系加载动效 (Sakura Mascot & Laser Line)
 * 彻底告别枯燥的通用旋转小菊花与土拨鼠轮子，结合顶部粉色流光与右下角 Q 弹萌系团子。
 */
export function HamsterLoader({ show }: HamsterLoaderProps) {
  const [hintIndex, setHintIndex] = useState(0);

  // 每次触发加载时随机切换趣味二次元文案
  useEffect(() => {
    if (show) {
      setHintIndex((prev) => (prev + 1) % ANIME_LOADING_HINTS.length);
    }
  }, [show]);

  if (!show) return null;

  return (
    <>
      {/* 1. 顶部极光粉色加载进度流光（提供即时反馈） */}
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden bg-primary/20"
        role="progressbar"
        aria-label="页面加载中"
      >
        <div className="h-full w-full origin-left animate-pulse bg-gradient-to-r from-primary/40 via-primary to-primary-foreground" />
      </div>

      {/* 2. 右下角 Q 弹萌系樱花团子浮动指示器 */}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed right-5 bottom-5 z-50 flex items-center gap-2.5 rounded-full border border-primary/30 bg-card/95 px-3.5 py-2 text-xs font-bold text-foreground shadow-lg shadow-primary/15 backdrop-blur-md transition-all duration-300"
      >
        {/* Q 弹二次元萌团子 SVG */}
        <div className="relative flex size-6 shrink-0 items-center justify-center">
          <svg
            viewBox="0 0 36 32"
            className="size-5 animate-bounce stroke-primary text-primary"
            strokeWidth="1.8"
            aria-hidden="true"
          >
            {/* 团子饱满身体 */}
            <path
              d="M 18 4 C 8 4 4 13 4 22 C 4 28 9 30 18 30 C 27 30 32 28 32 22 C 32 13 28 4 18 4 Z"
              className="fill-primary/15"
            />
            {/* 萌萌的大眼睛 */}
            <circle cx="12" cy="18" r="1.6" className="fill-primary stroke-none" />
            <circle cx="24" cy="18" r="1.6" className="fill-primary stroke-none" />
            {/* 眼睛高光 */}
            <circle cx="12.6" cy="17.4" r="0.6" className="fill-card stroke-none" />
            <circle cx="24.6" cy="17.4" r="0.6" className="fill-card stroke-none" />
            {/* 羞涩红晕 */}
            <ellipse cx="9" cy="21.5" rx="2" ry="1" className="fill-primary/40 stroke-none" />
            <ellipse cx="27" cy="21.5" rx="2" ry="1" className="fill-primary/40 stroke-none" />
            {/* 微笑嘴角 */}
            <path
              d="M 16 21.5 Q 18 23.5 20 21.5"
              className="fill-none stroke-primary"
              strokeLinecap="round"
            />
          </svg>

          {/* 旋转的小樱花/星光徽标 */}
          <Sparkles className="absolute -top-1 -right-1 size-3 animate-spin text-primary opacity-80" />
        </div>

        {/* 趣味二次元加载提示词 */}
        <span className="font-serif tracking-wider text-primary">
          {ANIME_LOADING_HINTS[hintIndex]}
        </span>
      </div>
    </>
  );
}
