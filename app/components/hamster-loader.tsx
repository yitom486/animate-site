type HamsterLoaderProps = {
  show: boolean;
};

export function HamsterLoader({ show }: HamsterLoaderProps) {
  if (!show) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-slate-950/15 px-4 backdrop-blur-[4px] transition-all duration-300">
      <div
        className="relative overflow-hidden rounded-2xl border border-white/40 bg-white/70 px-8 py-8 text-center shadow-2xl shadow-rose-950/10 backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-300"
        style={{
          boxShadow: "0 20px 50px -12px rgba(244, 63, 94, 0.15), inset 0 1px 1px rgba(255, 255, 255, 0.6)",
        }}
        role="status"
        aria-live="polite"
      >
        {/* Decorative ambient background glows */}
        <div className="absolute -left-12 -top-12 h-24 w-24 rounded-full bg-rose-400/20 blur-2xl" />
        <div className="absolute -right-12 -bottom-12 h-24 w-24 rounded-full bg-sky-400/20 blur-2xl" />

        {/* SVG Inline Styles */}
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes magic-spin-clockwise {
            to { transform: rotate(360deg); }
          }
          @keyframes magic-spin-counter {
            to { transform: rotate(-360deg); }
          }
          @keyframes magic-pulse {
            0%, 100% { transform: scale(1) rotate(0deg); opacity: 0.85; }
            50% { transform: scale(1.06) rotate(180deg); opacity: 1; }
          }
          @keyframes text-shine {
            0%, 100% { opacity: 0.6; }
            50% { opacity: 1; }
          }

          .magic-ring-outer {
            transform-origin: 50px 50px;
            animation: magic-spin-clockwise 14s linear infinite;
          }
          .magic-ring-middle {
            transform-origin: 50px 50px;
            animation: magic-spin-counter 9s linear infinite;
          }
          .magic-orbit-1 {
            transform-origin: 50px 50px;
            animation: magic-spin-clockwise 3.5s linear infinite;
          }
          .magic-core {
            transform-origin: 50px 50px;
            animation: magic-pulse 5s ease-in-out infinite;
          }
          .magic-text-shine {
            animation: text-shine 2s ease-in-out infinite;
          }
        `}} />

        <div className="relative mx-auto h-28 w-28" aria-hidden="true">
          <svg
            viewBox="0 0 100 100"
            className="h-full w-full"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              {/* Premium Glow Filter */}
              <filter id="magic-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="1.8" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              {/* Curated Soft Color Gradients */}
              <linearGradient id="magic-grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fb7185" />
                <stop offset="50%" stopColor="#ec4899" />
                <stop offset="100%" stopColor="#38bdf8" />
              </linearGradient>
              <linearGradient id="magic-grad-2" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#a855f7" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
            </defs>

            {/* Static outer thin orbit ring */}
            <circle cx="50" cy="50" r="46" stroke="url(#magic-grad-1)" strokeWidth="0.5" fill="none" opacity="0.15" />

            {/* 1. Outer Ring (Clockwise, Runic dashed style) */}
            <circle
              cx="50"
              cy="50"
              r="43"
              stroke="url(#magic-grad-1)"
              strokeWidth="0.8"
              strokeDasharray="4 6 12 6 2 6"
              fill="none"
              className="magic-ring-outer"
              filter="url(#magic-glow)"
            />

            {/* 2. Middle Ring (Counter-clockwise, Fine dotted style) */}
            <circle
              cx="50"
              cy="50"
              r="35"
              stroke="url(#magic-grad-2)"
              strokeWidth="1.2"
              strokeDasharray="1 3.5"
              fill="none"
              className="magic-ring-middle"
              opacity="0.8"
            />

            {/* 3. Outer Orbiting Light Node */}
            <g className="magic-orbit-1">
              {/* Outer soft glow ring */}
              <circle cx="50" cy="15" r="4.5" fill="#38bdf8" opacity="0.25" filter="url(#magic-glow)" />
              {/* Sharp inner core orb */}
              <circle cx="50" cy="15" r="2" fill="#e0f2fe" filter="url(#magic-glow)" />
            </g>

            {/* 4. Magic Hexagram/Core (Pulsing and rotating slowly) */}
            <g className="magic-core">
              {/* Outer core circle ring */}
              <circle cx="50" cy="50" r="23" stroke="url(#magic-grad-2)" strokeWidth="0.5" fill="none" opacity="0.3" />
              
              {/* Upward Triangle */}
              <polygon
                points="50,30 65,56 35,56"
                stroke="url(#magic-grad-1)"
                strokeWidth="0.8"
                fill="none"
                opacity="0.8"
              />
              {/* Downward Triangle */}
              <polygon
                points="50,70 65,44 35,44"
                stroke="url(#magic-grad-1)"
                strokeWidth="0.8"
                fill="none"
                opacity="0.8"
              />

              {/* Inner glowing core center */}
              <circle cx="50" cy="50" r="3" fill="url(#magic-grad-2)" filter="url(#magic-glow)" />
              <circle cx="50" cy="50" r="5" fill="url(#magic-grad-2)" opacity="0.4" filter="url(#magic-glow)" />
            </g>
          </svg>
        </div>

        <p className="magic-text-shine mt-4 font-serif text-xs font-bold tracking-widest text-slate-700">
          正在召唤番剧资料
        </p>
        <p className="mt-1 font-mono text-[9px] font-semibold uppercase tracking-wider text-rose-500">
          loading archive
        </p>
      </div>
    </div>
  );
}
