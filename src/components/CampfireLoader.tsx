import React from 'react';
import { cn } from '@/lib/utils';

interface CampfireLoaderProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  text?: string;
}

export function CampfireLoader({ className, size = 'md', text }: CampfireLoaderProps) {
  const sizeMap = {
    sm: 'w-8 h-8',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
    xl: 'w-36 h-36',
  };

  const wrapperSizeMap = {
    sm: 'w-10 h-10',
    md: 'w-20 h-20',
    lg: 'w-28 h-28',
    xl: 'w-44 h-44',
  };

  return (
    <div className={cn("flex flex-col items-center justify-center gap-3", className)}>
      <div className={cn("relative flex items-center justify-center", wrapperSizeMap[size])}>
        {/* Glow */}
        <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl campfire-glow"></div>
        
        {/* Flames SVG */}
        <svg 
          viewBox="0 0 100 100" 
          className={cn("relative z-10 overflow-visible", sizeMap[size])}
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Logs */}
          <path d="M25 80 L75 80" stroke="#715544" strokeWidth="8" strokeLinecap="round" className="z-10 relative"/>
          <path d="M35 75 L65 85" stroke="#5C4638" strokeWidth="8" strokeLinecap="round" className="z-10 relative"/>
          
          {/* Main Flame */}
          <path 
            className="campfire-flame fill-primary" 
            d="M50 15 C30 40 30 70 50 80 C70 70 70 40 50 15 Z" 
          />
          {/* Inner Flame 1 */}
          <path 
            className="campfire-flame delay-1 fill-[#F0A03C]" 
            d="M50 35 C40 50 40 70 50 78 C60 70 60 50 50 35 Z" 
          />
          {/* Inner Flame 2 */}
          <path 
            className="campfire-flame delay-2 fill-yellow-200" 
            d="M50 50 C45 60 45 70 50 76 C55 70 55 60 50 50 Z" 
          />
          
          {/* Little sparks */}
          <circle cx="35" cy="40" r="1.5" className="fill-yellow-400 animate-ping" style={{animationDuration: '1s'}} />
          <circle cx="65" cy="30" r="2" className="fill-primary animate-ping" style={{animationDelay: '0.3s', animationDuration: '1.2s'}} />
          <circle cx="45" cy="20" r="1.5" className="fill-[#F0A03C] animate-ping" style={{animationDelay: '0.6s', animationDuration: '0.9s'}} />
        </svg>
      </div>
      
      {text && (
        <span className="text-muted-foreground font-medium animate-pulse text-sm">
          {text}
        </span>
      )}
    </div>
  );
}
