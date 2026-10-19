import { useTranslation } from 'react-i18next';

interface CustomLoadingProps {
  message?: string;
  fullScreen?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * MUKHYMAT signature loader — "Night at the camp".
 * A glowing tent under an indigo night sky with a live campfire,
 * rising embers, twinkling stars and a passing shooting star.
 * Pure SVG + CSS transforms/opacity (GPU-friendly), respects
 * prefers-reduced-motion, no external dependencies.
 */
export default function CustomLoading({
  message,
  fullScreen = true,
  size = 'md',
}: CustomLoadingProps) {
  const { t } = useTranslation();

  const sizeClasses = {
    sm: 'scale-75',
    md: 'scale-100',
    lg: 'scale-110',
  };

  const containerClasses = fullScreen
    ? 'fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm'
    : 'flex items-center justify-center p-8';

  return (
    <div className={containerClasses}>
      <div className={`flex flex-col items-center ${sizeClasses[size]} transition-transform duration-300`}>
        {/* Night scene card */}
        <div
          className="relative overflow-hidden rounded-3xl"
          style={{ boxShadow: '0 24px 60px -18px rgba(10,17,40,0.45), 0 0 40px -12px rgba(232,163,61,0.35)' }}
        >
          <svg width="280" height="190" viewBox="0 0 280 190" role="img" aria-label="Camp at night">
            <defs>
              <linearGradient id="mkSky" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#070D22" />
                <stop offset="55%" stopColor="#0F1735" />
                <stop offset="100%" stopColor="#28305E" />
              </linearGradient>
              <radialGradient id="mkMoonHalo" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#F6E7C1" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#F6E7C1" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="mkFireGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#FFAE5C" stopOpacity="0.55" />
                <stop offset="100%" stopColor="#FFAE5C" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="mkDoorLight" cx="50%" cy="35%" r="65%">
                <stop offset="0%" stopColor="#FFD98A" />
                <stop offset="70%" stopColor="#F2A93B" />
                <stop offset="100%" stopColor="#C97E1F" />
              </radialGradient>
              <radialGradient id="mkLightPool" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#FFC46B" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#FFC46B" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="mkCanvasL" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#F0B95C" />
                <stop offset="100%" stopColor="#D2932F" />
              </linearGradient>
              <linearGradient id="mkCanvasR" x1="1" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#C8892B" />
                <stop offset="100%" stopColor="#9E6A1E" />
              </linearGradient>
            </defs>

            {/* Sky */}
            <rect x="0" y="0" width="280" height="190" fill="url(#mkSky)" />

            {/* Stars */}
            <g fill="#FFF8E7">
              <circle className="mk-tw" cx="30" cy="30" r="1.6" />
              <circle className="mk-tw mk-d1" cx="70" cy="18" r="1.1" />
              <circle className="mk-tw mk-d2" cx="118" cy="34" r="1.4" />
              <circle className="mk-tw mk-d3" cx="160" cy="16" r="1.1" />
              <circle className="mk-tw mk-d4" cx="196" cy="40" r="1.3" />
              <circle className="mk-tw mk-d2" cx="252" cy="26" r="1.5" />
              <circle className="mk-tw mk-d1" cx="216" cy="14" r="1.0" />
              <circle className="mk-tw mk-d3" cx="94" cy="52" r="1.0" />
            </g>

            {/* Shooting star */}
            <g className="mk-shoot">
              <line x1="0" y1="0" x2="26" y2="-8" stroke="#FFF8E7" strokeWidth="1.4" strokeLinecap="round" opacity="0.9" />
            </g>

            {/* Moon with halo */}
            <circle cx="232" cy="52" r="30" fill="url(#mkMoonHalo)" className="mk-halo" />
            <g className="mk-moon">
              <path
                d="M 238 38 A 15 15 0 1 0 238 66 A 12.5 12.5 0 1 1 238 38 Z"
                fill="#F6E7C1"
              />
            </g>

            {/* Far dunes */}
            <path className="mk-dune-far" d="M-10,138 Q60,116 130,136 T290,132 L290,200 L-10,200 Z" fill="#1A2248" />
            {/* Near dunes / ground */}
            <path className="mk-dune-near" d="M-10,156 Q80,138 170,154 T290,150 L290,200 L-10,200 Z" fill="#10173A" />

            {/* Light pool spilling from tent door */}
            <ellipse className="mk-breathe" cx="126" cy="166" rx="46" ry="12" fill="url(#mkLightPool)" />

            {/* Tent */}
            <g>
              {/* guy ropes */}
              <line x1="88" y1="120" x2="66" y2="164" stroke="#6E5A33" strokeWidth="1.2" />
              <line x1="164" y1="120" x2="186" y2="164" stroke="#6E5A33" strokeWidth="1.2" />
              {/* canvas */}
              <path d="M 126 84 L 70 164 L 126 164 Z" fill="url(#mkCanvasL)" />
              <path d="M 126 84 L 182 164 L 126 164 Z" fill="url(#mkCanvasR)" />
              {/* canvas seam highlight */}
              <path d="M 126 84 L 126 164" stroke="#FFDF9E" strokeWidth="1.4" opacity="0.5" />
              {/* door with warm light inside (breathing) */}
              <path className="mk-breathe" d="M 126 108 L 108 164 L 144 164 Z" fill="url(#mkDoorLight)" />
              {/* door flap */}
              <path d="M 126 108 L 144 164 L 136 164 Q 128 132 126 108 Z" fill="#7A4E14" opacity="0.85" />
              {/* pole + pennant */}
              <line x1="126" y1="70" x2="126" y2="84" stroke="#8A5B1E" strokeWidth="2" strokeLinecap="round" />
              <path className="mk-flag" d="M 126 70 L 142 74 L 126 79 Z" fill="#E8A33D" />
            </g>

            {/* Campfire */}
            <g>
              <ellipse className="mk-glow" cx="216" cy="158" rx="34" ry="16" fill="url(#mkFireGlow)" />
              {/* logs */}
              <g stroke="#5C3A1A" strokeWidth="4" strokeLinecap="round">
                <line x1="204" y1="164" x2="228" y2="158" />
                <line x1="206" y1="158" x2="226" y2="164" />
              </g>
              {/* flames (staggered flicker) */}
              <g style={{ transformOrigin: '216px 160px' }}>
                <path className="mk-fl mk-fl1" d="M 216 126 C 208 138 206 146 210 154 C 213 159 219 159 222 154 C 226 146 224 138 216 126 Z" fill="#E86A2E" style={{ transformOrigin: '216px 158px' }} />
                <path className="mk-fl mk-fl2" d="M 216 134 C 211 142 210 148 213 153 C 215 157 219 157 221 153 C 223 148 221 142 216 134 Z" fill="#F59E0B" style={{ transformOrigin: '216px 156px' }} />
                <path className="mk-fl mk-fl3" d="M 216 142 C 213 147 212 150 214 153 C 215.5 155.5 218.5 155.5 219.5 153 C 221 150 219 147 216 142 Z" fill="#FFD583" style={{ transformOrigin: '216px 154px' }} />
              </g>
              {/* rising embers */}
              <g fill="#FFC96B">
                <circle className="mk-em mk-em1" cx="212" cy="140" r="1.7" />
                <circle className="mk-em mk-em2" cx="220" cy="142" r="1.3" />
                <circle className="mk-em mk-em3" cx="216" cy="138" r="1.1" />
                <circle className="mk-em mk-em4" cx="224" cy="140" r="1.5" />
              </g>
            </g>
          </svg>
        </div>

        {/* Message + pulsing dots */}
        <div className="mt-6 text-center">
          <p className="text-base font-semibold text-foreground">
            {message || t('loading.default', { defaultValue: 'Loading...' })}
          </p>
          <div className="flex justify-center gap-1.5 mt-3">
            <span className="mk-dot w-2 h-2 rounded-full" style={{ backgroundColor: '#E8A33D' }} />
            <span className="mk-dot w-2 h-2 rounded-full" style={{ backgroundColor: '#E8A33D', animationDelay: '160ms' }} />
            <span className="mk-dot w-2 h-2 rounded-full" style={{ backgroundColor: '#E8A33D', animationDelay: '320ms' }} />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes mk-twinkle {
          0%, 100% { opacity: 0.25; }
          50% { opacity: 1; }
        }
        .mk-tw { animation: mk-twinkle 2.6s ease-in-out infinite; }
        .mk-d1 { animation-delay: 0.5s; }
        .mk-d2 { animation-delay: 1.1s; }
        .mk-d3 { animation-delay: 1.7s; }
        .mk-d4 { animation-delay: 2.2s; }

        @keyframes mk-shooting {
          0%, 78% { transform: translate(46px, 22px); opacity: 0; }
          80% { opacity: 0.9; }
          88% { transform: translate(150px, -6px); opacity: 0; }
          100% { transform: translate(150px, -6px); opacity: 0; }
        }
        .mk-shoot { animation: mk-shooting 5.5s linear infinite; }

        @keyframes mk-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        .mk-moon { animation: mk-float 6s ease-in-out infinite; }

        @keyframes mk-halo-pulse {
          0%, 100% { opacity: 0.55; }
          50% { opacity: 0.95; }
        }
        .mk-halo { animation: mk-halo-pulse 6s ease-in-out infinite; }

        @keyframes mk-drift {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(5px); }
        }
        .mk-dune-far { animation: mk-drift 11s ease-in-out infinite; }
        .mk-dune-near { animation: mk-drift 9s ease-in-out infinite reverse; }

        @keyframes mk-breathing {
          0%, 100% { opacity: 0.72; }
          50% { opacity: 1; }
        }
        .mk-breathe { animation: mk-breathing 2.8s ease-in-out infinite; }

        @keyframes mk-flag-wave {
          0%, 100% { transform: skewY(0deg); }
          50% { transform: skewY(-6deg); }
        }
        .mk-flag { transform-origin: 126px 70px; animation: mk-flag-wave 1.8s ease-in-out infinite; }

        @keyframes mk-flicker {
          0% { transform: scaleY(1) skewX(1.5deg); opacity: 0.9; }
          50% { transform: scaleY(1.12) skewX(-2deg); opacity: 1; }
          100% { transform: scaleY(0.94) skewX(1deg); opacity: 0.92; }
        }
        .mk-fl { animation: mk-flicker 1.15s ease-in-out infinite alternate; }
        .mk-fl2 { animation-duration: 0.95s; animation-delay: -0.25s; }
        .mk-fl3 { animation-duration: 0.8s; animation-delay: -0.5s; }

        @keyframes mk-ember {
          0% { transform: translateY(0) translateX(0); opacity: 0; }
          15% { opacity: 0.95; }
          100% { transform: translateY(-34px) translateX(4px); opacity: 0; }
        }
        .mk-em { animation: mk-ember 2.4s ease-out infinite; }
        .mk-em2 { animation-duration: 2.9s; animation-delay: 0.7s; }
        .mk-em3 { animation-duration: 2.1s; animation-delay: 1.3s; }
        .mk-em4 { animation-duration: 3.2s; animation-delay: 1.8s; }

        @keyframes mk-dot-pulse {
          0%, 100% { transform: translateY(0); opacity: 0.35; }
          40% { transform: translateY(-4px); opacity: 1; }
        }
        .mk-dot { animation: mk-dot-pulse 1.1s ease-in-out infinite; }

        @media (prefers-reduced-motion: reduce) {
          .mk-tw, .mk-shoot, .mk-moon, .mk-halo, .mk-dune-far, .mk-dune-near,
          .mk-breathe, .mk-flag, .mk-fl, .mk-em, .mk-dot {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
