import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';

interface CustomLoadingProps {
  message?: string;
  fullScreen?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function CustomLoading({ 
  message, 
  fullScreen = true, 
  size = 'md' 
}: CustomLoadingProps) {
  const { t } = useTranslation();
  const [showStickFigure, setShowStickFigure] = useState(false);

  useEffect(() => {
    // Delay stick figure appearance for tent-to-walk transition
    const timer = setTimeout(() => setShowStickFigure(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const sizeClasses = {
    sm: 'scale-75',
    md: 'scale-100',
    lg: 'scale-125'
  };

  const containerClasses = fullScreen
    ? 'fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-b from-orange-50 via-orange-100 to-orange-200'
    : 'flex items-center justify-center p-8';

  return (
    <div className={containerClasses}>
      <div className={`relative ${sizeClasses[size]} transition-transform duration-300`}>
        {/* Desert Background */}
        <div className="absolute inset-0 -z-10">
          {/* Sun */}
          <div className="absolute top-0 right-8 w-16 h-16 bg-gradient-to-br from-yellow-300 to-orange-400 rounded-full opacity-60 animate-pulse" />
          
          {/* Sand Dunes */}
          <svg className="absolute bottom-0 left-0 w-full h-24 opacity-30" viewBox="0 0 400 100" preserveAspectRatio="none">
            <path d="M0,50 Q100,20 200,50 T400,50 L400,100 L0,100 Z" fill="#D2691E" opacity="0.3" />
            <path d="M0,70 Q100,50 200,70 T400,70 L400,100 L0,100 Z" fill="#CD853F" opacity="0.2" />
          </svg>
        </div>

        {/* Main Animation Container */}
        <div className="relative w-64 h-48 flex items-end justify-center">
          {/* Tent */}
          <div className="relative animate-tent-sway" style={{ transformOrigin: 'bottom center' }}>
            {/* Tent Body - Triangle */}
            <svg width="120" height="100" viewBox="0 0 120 100" className="drop-shadow-lg">
              {/* Main tent triangle */}
              <path
                d="M 60 10 L 10 90 L 110 90 Z"
                fill="#D2691E"
                stroke="#8B4513"
                strokeWidth="2"
              />
              {/* Tent entrance - darker triangle */}
              <path
                d="M 60 10 L 45 90 L 75 90 Z"
                fill="#A0522D"
                stroke="#8B4513"
                strokeWidth="1.5"
              />
              {/* Tent opening */}
              <path
                d="M 55 60 L 50 90 L 70 90 L 65 60 Z"
                fill="#654321"
              />
            </svg>

            {/* Tent Pole */}
            <div className="absolute top-2 left-1/2 w-0.5 h-20 bg-amber-900 -translate-x-1/2" />
          </div>

          {/* Stick Figure Walking */}
          {showStickFigure && (
            <div 
              className="absolute bottom-0 left-1/2 animate-walk-out"
              style={{ transformOrigin: 'bottom center' }}
            >
              <svg width="40" height="60" viewBox="0 0 40 60" className="animate-walk-cycle">
                {/* Head */}
                <circle cx="20" cy="10" r="6" fill="#2C1810" stroke="#1a1a1a" strokeWidth="1" />
                
                {/* Body */}
                <line x1="20" y1="16" x2="20" y2="35" stroke="#2C1810" strokeWidth="2.5" strokeLinecap="round" />
                
                {/* Arms - animated */}
                <g className="animate-arm-swing">
                  <line x1="20" y1="20" x2="12" y2="30" stroke="#2C1810" strokeWidth="2" strokeLinecap="round" />
                  <line x1="20" y1="20" x2="28" y2="28" stroke="#2C1810" strokeWidth="2" strokeLinecap="round" />
                </g>
                
                {/* Legs - animated */}
                <g className="animate-leg-walk">
                  <line x1="20" y1="35" x2="15" y2="50" stroke="#2C1810" strokeWidth="2.5" strokeLinecap="round" />
                  <line x1="20" y1="35" x2="25" y2="50" stroke="#2C1810" strokeWidth="2.5" strokeLinecap="round" />
                </g>
              </svg>
            </div>
          )}
        </div>

        {/* Loading Message */}
        <div className="mt-8 text-center">
          <p className="text-lg font-semibold text-gray-800 animate-pulse">
            {message || t('loading.default', { defaultValue: 'Loading...' })}
          </p>
          <div className="flex justify-center gap-1 mt-3">
            <span className="w-2 h-2 bg-#8B5A3C rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 bg-#8B5A3C rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 bg-#8B5A3C rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes tent-sway {
          0%, 100% { transform: rotate(-1deg); }
          50% { transform: rotate(1deg); }
        }

        @keyframes walk-out {
          0% { 
            transform: translateX(-50%) translateX(0px);
            opacity: 0;
          }
          20% {
            opacity: 1;
          }
          100% { 
            transform: translateX(-50%) translateX(60px);
            opacity: 1;
          }
        }

        @keyframes walk-cycle {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-2px); }
        }

        @keyframes arm-swing {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-15deg); }
          75% { transform: rotate(15deg); }
        }

        @keyframes leg-walk {
          0%, 100% { transform: scaleY(1) translateY(0); }
          25% { transform: scaleY(1.1) translateY(-2px); }
          50% { transform: scaleY(0.95) translateY(1px); }
          75% { transform: scaleY(1.05) translateY(-1px); }
        }

        .animate-tent-sway {
          animation: tent-sway 3s ease-in-out infinite;
        }

        .animate-walk-out {
          animation: walk-out 3s ease-in-out infinite;
        }

        .animate-walk-cycle {
          animation: walk-cycle 0.6s ease-in-out infinite;
        }

        .animate-arm-swing {
          transform-origin: 20px 20px;
          animation: arm-swing 0.6s ease-in-out infinite;
        }

        .animate-leg-walk {
          transform-origin: 20px 35px;
          animation: leg-walk 0.6s ease-in-out infinite;
        }

        /* Respect user's motion preferences */
        @media (prefers-reduced-motion: reduce) {
          .animate-tent-sway,
          .animate-walk-out,
          .animate-walk-cycle,
          .animate-arm-swing,
          .animate-leg-walk {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}