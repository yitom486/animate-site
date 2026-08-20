type HamsterLoaderProps = {
  show: boolean;
};

export function HamsterLoader({ show }: HamsterLoaderProps) {
  if (!show) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-slate-900/15 px-4 backdrop-blur-[2px] transition-all duration-300">
      <div
        className="relative overflow-hidden rounded-2xl border border-rose-100/90 bg-white/95 px-8 py-6 text-center shadow-2xl shadow-rose-950/10 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200"
        style={{
          boxShadow:
            "0 20px 40px -15px rgba(251, 113, 133, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.8)",
        }}
        role="status"
        aria-live="polite"
      >
        {/* Soft background light */}
        <div className="absolute -left-10 -top-10 h-20 w-20 rounded-full bg-rose-200/30 blur-2xl" />
        <div className="absolute -right-10 -bottom-10 h-20 w-20 rounded-full bg-amber-200/25 blur-2xl" />

        {/* SVG Inline Styles */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
          @keyframes wheel-spin { to { transform: rotate(360deg); } }
          @keyframes hamster-body-bounce {
            0%, 100% { transform: translate(0, 1.5px) scaleX(1.01) scaleY(0.97); }
            50%      { transform: translate(0, -2px)  scaleX(0.98) scaleY(1.02); }
          }
          @keyframes hamster-shadow-pulse {
            0%, 100% { transform: scaleX(1);    opacity: 0.5; }
            50%      { transform: scaleX(0.8);  opacity: 0.28; }
          }
          @keyframes leg-pedal-front {
            0% { transform: rotate(34deg); } 25% { transform: rotate(-12deg); }
            50% { transform: rotate(-34deg); } 75% { transform: rotate(6deg); }
            100% { transform: rotate(34deg); }
          }
          @keyframes leg-pedal-back {
            0% { transform: rotate(-34deg); } 25% { transform: rotate(6deg); }
            50% { transform: rotate(34deg); } 75% { transform: rotate(-12deg); }
            100% { transform: rotate(-34deg); }
          }
          @keyframes arm-reach {
            0%, 100% { transform: rotate(-26deg); }
            50%      { transform: rotate(28deg); }
          }
          @keyframes ear-twitch {
            0%, 70%, 100% { transform: rotate(0deg); }
            80% { transform: rotate(-8deg); } 90% { transform: rotate(4deg); }
          }
          @keyframes eye-blink {
            0%, 92%, 100% { transform: scaleY(1); } 96% { transform: scaleY(0.1); }
          }
          @keyframes nose-sniff {
            0%, 100% { transform: translateY(0) scale(1); }
            50%      { transform: translateY(0.5px) scale(1.14); }
          }

          .svg-wheel-rotate { transform-origin: 100px 95px; animation: wheel-spin 0.9s linear infinite; }
          .hamster-body-group { transform-origin: 108px 154px; animation: hamster-body-bounce 320ms ease-in-out infinite; }
          .hamster-shadow { transform-origin: 108px 158px; animation: hamster-shadow-pulse 320ms ease-in-out infinite; }
          .leg-front { transform-origin: 122px 144px; animation: leg-pedal-front 320ms linear infinite; }
          .leg-back  { transform-origin: 94px 144px;  animation: leg-pedal-back 320ms linear infinite; }
          .arm-front { transform-origin: 136px 138px; animation: arm-reach 320ms ease-in-out infinite; }
          .ear-front { transform-origin: 134px 110px; animation: ear-twitch 2.6s ease-in-out infinite; }
          .ear-back  { transform-origin: 121px 110px; animation: ear-twitch 2.6s ease-in-out infinite; animation-delay: 130ms; }
          .hamster-eye { transform-origin: 134px 126px; animation: eye-blink 3.4s ease-in-out infinite; }
          .hamster-nose { transform-origin: 149px 131px; animation: nose-sniff 600ms ease-in-out infinite; }
        `,
          }}
        />

        <div className="relative mx-auto h-64 w-64" aria-hidden="true">
          <svg viewBox="0 0 200 200" className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              {/* Light, buttery cartoon fur — soft and bright */}
              <radialGradient id="furGrad" cx="40%" cy="28%" r="85%">
                <stop offset="0%" stopColor="#fff6df" />
                <stop offset="55%" stopColor="#ffe7b3" />
                <stop offset="100%" stopColor="#fbd185" />
              </radialGradient>
              <radialGradient id="bellyGrad" cx="50%" cy="25%" r="90%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="#fff4dd" />
              </radialGradient>
              <linearGradient id="rimGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ffe0e6" />
                <stop offset="100%" stopColor="#fbb6c2" />
              </linearGradient>
            </defs>

            {/* 1. Wheel support stand */}
            <path
              d="M100 95 L68 174 M100 95 L132 174 M38 174 L162 174"
              stroke="#d7dee8"
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
            />

            {/* 2. Rotating wheel */}
            <g className="svg-wheel-rotate">
              <circle
                cx="100"
                cy="95"
                r="66"
                stroke="#fda4af"
                strokeWidth="1.5"
                fill="none"
                opacity="0.3"
              />
              <circle
                cx="100"
                cy="95"
                r="63"
                stroke="url(#rimGrad)"
                strokeWidth="5.5"
                fill="none"
              />
              <circle
                cx="100"
                cy="95"
                r="58.5"
                stroke="#ffe4e6"
                strokeWidth="2.5"
                strokeDasharray="3 7"
                fill="none"
              />
              <line
                x1="100"
                y1="95"
                x2="100"
                y2="32"
                stroke="#ffffff"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <line
                x1="100"
                y1="95"
                x2="100"
                y2="158"
                stroke="#ffffff"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <line
                x1="100"
                y1="95"
                x2="37"
                y2="95"
                stroke="#ffffff"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <line
                x1="100"
                y1="95"
                x2="163"
                y2="95"
                stroke="#ffffff"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <line
                x1="100"
                y1="95"
                x2="55"
                y2="50"
                stroke="#ffffff"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <line
                x1="100"
                y1="95"
                x2="145"
                y2="140"
                stroke="#ffffff"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <line
                x1="100"
                y1="95"
                x2="55"
                y2="140"
                stroke="#ffffff"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <line
                x1="100"
                y1="95"
                x2="145"
                y2="50"
                stroke="#ffffff"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </g>

            {/* 3. Static center cap */}
            <circle cx="100" cy="95" r="6.5" fill="#fb7185" stroke="#ffffff" strokeWidth="2.5" />

            {/* 4. Ground shadow */}
            <ellipse
              cx="108"
              cy="158"
              rx="26"
              ry="3.2"
              fill="#94a3b8"
              opacity="0.45"
              className="hamster-shadow"
            />

            {/* 5. The chubby hamster */}
            <g className="hamster-body-group">
              {/* Stubby tail */}
              <circle cx="70" cy="138" r="5" fill="#ffe7b3" stroke="#f0c878" strokeWidth="1.4" />

              {/* Back leg (far, behind) */}
              <g className="leg-back">
                <path
                  d="M94 140 q-3 8 0 13"
                  stroke="#f3cd80"
                  strokeWidth="9"
                  strokeLinecap="round"
                  fill="none"
                />
                <ellipse
                  cx="93"
                  cy="156"
                  rx="6"
                  ry="3.4"
                  fill="#fff0cf"
                  stroke="#f0c878"
                  strokeWidth="1.3"
                />
              </g>

              {/* Front leg (running) */}
              <g className="leg-front">
                <path
                  d="M122 140 q3 8 0 13"
                  stroke="#ffe1a8"
                  strokeWidth="9.5"
                  strokeLinecap="round"
                  fill="none"
                />
                <ellipse
                  cx="121"
                  cy="156"
                  rx="6.5"
                  ry="3.6"
                  fill="#fff8e8"
                  stroke="#f0c878"
                  strokeWidth="1.3"
                />
              </g>

              {/* One smooth chubby body+head silhouette (no seams) */}
              <path
                d="M70 134
                   C70 112 86 102 106 102
                   C124 102 136 104 145 113
                   C153 121 155 131 149 140
                   C142 150 128 155 110 156
                   C92 157 76 152 71 143
                   C69 140 69 137 70 134 Z"
                fill="url(#furGrad)"
                stroke="#f3c877"
                strokeWidth="2"
                strokeLinejoin="round"
              />

              {/* Soft top-left volume highlight */}
              <ellipse cx="92" cy="118" rx="18" ry="11" fill="#fffaea" opacity="0.55" />

              {/* Cream belly (smooth, no outline) */}
              <ellipse cx="112" cy="146" rx="20" ry="11" fill="url(#bellyGrad)" />

              {/* Front paw reaching out */}
              <g className="arm-front">
                <path
                  d="M132 138 q7 4 10 9"
                  stroke="#ffe1a8"
                  strokeWidth="8"
                  strokeLinecap="round"
                  fill="none"
                />
                <ellipse
                  cx="143"
                  cy="148"
                  rx="5"
                  ry="4"
                  fill="#fff8e8"
                  stroke="#f0c878"
                  strokeWidth="1.3"
                />
              </g>

              {/* Back ear */}
              <g className="ear-back">
                <circle cx="121" cy="108" r="8" fill="#ffe7b3" stroke="#f3c877" strokeWidth="1.6" />
                <circle cx="121" cy="108" r="3.8" fill="#ffc2cf" />
              </g>
              {/* Front ear */}
              <g className="ear-front">
                <circle
                  cx="134"
                  cy="106"
                  r="8.5"
                  fill="#fff0cf"
                  stroke="#f3c877"
                  strokeWidth="1.6"
                />
                <circle cx="134" cy="106" r="4" fill="#ffc2cf" />
              </g>

              {/* Big sparkly eye */}
              <g className="hamster-eye">
                <circle cx="134" cy="126" r="5.2" fill="#4b3a26" />
                <circle cx="135.8" cy="123.8" r="1.8" fill="#ffffff" />
                <circle cx="132.4" cy="127.6" r="0.9" fill="#ffffff" opacity="0.75" />
              </g>

              {/* Rosy cheek blush */}
              <circle cx="140" cy="137" r="5" fill="#ffb3c1" opacity="0.5" />

              {/* Whiskers (light & soft) */}
              <g stroke="#e9c280" strokeWidth="1" strokeLinecap="round" opacity="0.8">
                <line x1="147" y1="130" x2="161" y2="126" />
                <line x1="147" y1="132" x2="162" y2="133" />
                <line x1="147" y1="134" x2="160" y2="140" />
              </g>

              {/* Tiny nose + mouth */}
              <g className="hamster-nose">
                <ellipse cx="149" cy="131" rx="3.2" ry="2.6" fill="#ff9bab" />
                <ellipse cx="148" cy="130" rx="1" ry="0.8" fill="#ffe0e6" />
              </g>
              <path
                d="M149 134 q0 3 -3.2 3.6 M149 134 q0 3 3.2 3.6"
                stroke="#d98aa0"
                strokeWidth="1.1"
                strokeLinecap="round"
                fill="none"
              />
            </g>
          </svg>
        </div>

        <p className="mt-5 font-serif text-base font-bold text-slate-700">小仓鼠正在搬运番剧资料</p>
        <p className="mt-1.5 font-mono text-sm font-semibold text-rose-500">loading...</p>
      </div>
    </div>
  );
}
