type HamsterLoaderProps = {
  show: boolean;
};

export function HamsterLoader({ show }: HamsterLoaderProps) {
  if (!show) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-slate-900/15 px-4 backdrop-blur-[2px]">
      <div
        className="rounded-2xl border border-rose-100/80 bg-white/90 p-6 text-center shadow-2xl shadow-rose-950/10 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200"
        role="status"
        aria-live="polite"
      >
        {/* SVG Inline Styles */}
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes svg-wheel-spin {
            to { transform: rotate(360deg); }
          }
          @keyframes svg-hamster-bob {
            0%, 100% {
              transform: translate(5px, 2px) scale(1) rotate(-0.5deg);
            }
            50% {
              transform: translate(7px, -1px) scale(1.03, 0.97) rotate(1deg);
            }
          }
          @keyframes svg-paw-run-front {
            0%, 100% { transform: translate(0, 0) rotate(15deg); }
            25% { transform: translate(3px, -3px) rotate(40deg); }
            50% { transform: translate(-1px, -1px) rotate(-10deg); }
            75% { transform: translate(-3px, 1px) rotate(-25deg); }
          }
          @keyframes svg-paw-run-back {
            0%, 100% { transform: translate(0, 0) rotate(-15deg); }
            25% { transform: translate(-3px, 1px) rotate(-35deg); }
            50% { transform: translate(-1px, -1px) rotate(10deg); }
            75% { transform: translate(3px, -3px) rotate(35deg); }
          }
          @keyframes svg-tail-wig {
            0% { transform: rotate(-15deg); }
            100% { transform: rotate(20deg); }
          }
          @keyframes svg-ear-twitch {
            0%, 90%, 100% { transform: rotate(0deg); }
            93%, 97% { transform: rotate(-10deg) skewX(2deg); }
            95% { transform: rotate(8deg) skewX(-2deg); }
          }
          @keyframes svg-eye-blink {
            0%, 90%, 100% { transform: scaleY(1); }
            95% { transform: scaleY(0.15); }
          }
          @keyframes svg-sniff {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.15) translateY(-0.2px); }
          }

          .svg-wheel-rotate {
            transform-origin: 100px 95px;
            animation: svg-wheel-spin 1.1s linear infinite;
          }
          .svg-hamster-group {
            transform-origin: 112px 135px;
            animation: svg-hamster-bob 500ms ease-in-out infinite;
          }
          .svg-hamster-paw-front {
            transform-origin: 125px 153px;
            animation: svg-paw-run-front 250ms linear infinite;
          }
          .svg-hamster-paw-back {
            transform-origin: 102px 153px;
            animation: svg-paw-run-back 250ms linear infinite;
            animation-delay: -125ms;
          }
          .svg-hamster-tail {
            transform-origin: 96px 142px;
            animation: svg-tail-wig 180ms ease-in-out infinite alternate;
          }
          .svg-hamster-ear-front {
            transform-origin: 118px 121px;
            animation: svg-ear-twitch 3.8s ease-in-out infinite;
          }
          .svg-hamster-eye-group {
            transform-origin: 127px 128px;
            animation: svg-eye-blink 3.5s ease-in-out infinite;
          }
          .svg-hamster-nose {
            transform-origin: 135px 133px;
            animation: svg-sniff 150ms ease-in-out infinite;
          }
        `}} />

        <div className="relative mx-auto h-36 w-36" aria-hidden="true">
          <svg
            viewBox="0 0 200 200"
            className="h-full w-full"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* 1. Wheel Support Stand (Metallic/Clean) */}
            <path
              d="M100 95 C100 130, 82 172, 55 175 M100 95 C100 130, 118 172, 145 175 M40 175 L160 175"
              stroke="#e2e8f0"
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
            />

            {/* 2. Rotating Wheel Group */}
            <g className="svg-wheel-rotate">
              {/* Outer Rim Shadow/Ring */}
              <circle cx="100" cy="95" r="68" stroke="#fda4af" strokeWidth="1.5" fill="none" opacity="0.6" />
              {/* Outer Rim */}
              <circle cx="100" cy="95" r="65" stroke="#fecdd3" strokeWidth="5.5" fill="none" />
              {/* Inner Grips / Dashed running track */}
              <circle cx="100" cy="95" r="61.5" stroke="#ffe4e6" strokeWidth="2.5" strokeDasharray="3 8" fill="none" />
              
              {/* Wheel Spokes */}
              <line x1="100" y1="95" x2="100" y2="30" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="100" y1="95" x2="100" y2="160" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="100" y1="95" x2="35" y2="95" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="100" y1="95" x2="165" y2="95" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="100" y1="95" x2="54" y2="49" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
              <line x1="100" y1="95" x2="146" y2="141" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
              <line x1="100" y1="95" x2="54" y2="141" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
              <line x1="100" y1="95" x2="146" y2="49" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
            </g>

            {/* 3. Wheel Axle Hub (static, sits on top) */}
            <circle cx="100" cy="95" r="6" fill="#fb7185" stroke="#ffffff" strokeWidth="2.5" />

            {/* 4. Cute Hamster Group */}
            <g className="svg-hamster-group">
              {/* Little Pink Tail */}
              <path
                d="M96 142 C92 143, 90 148, 93 150 C95 151, 97 148, 96 142"
                fill="#fda4af"
                stroke="#c2410c"
                strokeWidth="1.2"
                strokeLinecap="round"
                className="svg-hamster-tail"
              />

              {/* Back Foot (drawn under body) */}
              <path
                d="M102 153 C100 157, 96 156, 95 153"
                stroke="#f43f5e"
                strokeWidth="3"
                strokeLinecap="round"
                fill="none"
                className="svg-hamster-paw-back"
              />

              {/* Front Foot (drawn under body) */}
              <path
                d="M125 153 C127 157, 131 156, 132 153"
                stroke="#f43f5e"
                strokeWidth="3"
                strokeLinecap="round"
                fill="none"
                className="svg-hamster-paw-front"
              />

              {/* Back Ear */}
              <path
                d="M110 122 C107 116, 113 111, 116 115 Z"
                fill="#fdba74"
                stroke="#c2410c"
                strokeWidth="1.5"
              />

              {/* Hamster Main Body */}
              <path
                d="M98 144 C90 134, 102 120, 118 120 C130 120, 136 128, 134 138 C132 146, 122 150, 110 150 C102 150, 100 147, 98 144 Z"
                fill="#fed7aa"
                stroke="#c2410c"
                strokeWidth="2.2"
                strokeLinejoin="round"
              />

              {/* Lighter White/Cream Chest/Belly */}
              <path
                d="M112 150 C120 150, 132 147, 133 138 C134 133, 126 128, 120 132 C116 135, 110 142, 112 150 Z"
                fill="#fff7ed"
              />

              {/* Front Ear (with twitching animation) */}
              <g className="svg-hamster-ear-front">
                <path
                  d="M118 121 C117 113, 124 109, 128 114 C130 117, 125 122, 118 121 Z"
                  fill="#ffd8aa"
                  stroke="#c2410c"
                  strokeWidth="2"
                />
                <path
                  d="M120 120 C119 116, 123 113, 126 116 C127 118, 124 121, 120 120 Z"
                  fill="#fda4af"
                />
              </g>

              {/* Blinking Eye Group */}
              <g className="svg-hamster-eye-group">
                <circle cx="127" cy="128" r="2.8" fill="#3f2d2d" />
                <circle cx="128.2" cy="126.8" r="0.8" fill="#ffffff" />
              </g>

              {/* Rosy Cheek */}
              <ellipse cx="124" cy="135" rx="3.8" ry="2.2" fill="#fecdd3" opacity="0.85" />

              {/* Sniffing Nose */}
              <polygon
                points="134,133 136,132 135,135"
                fill="#f43f5e"
                className="svg-hamster-nose"
              />

              {/* Cute Whisker Lines */}
              <line x1="133" y1="135" x2="139" y2="136" stroke="#c2410c" strokeWidth="1" strokeLinecap="round" />
              <line x1="132" y1="137" x2="137" y2="140" stroke="#c2410c" strokeWidth="1" strokeLinecap="round" />
            </g>
          </svg>
        </div>

        <p className="mt-5 font-serif text-sm font-bold text-slate-700">
          小仓鼠正在搬运番剧资料
        </p>
        <p className="mt-1 font-mono text-[11px] font-semibold text-rose-500">
          loading...
        </p>
      </div>
    </div>
  );
}
