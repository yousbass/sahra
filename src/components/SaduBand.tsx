import React from 'react';

export function SaduBand({ className = '' }: { className?: string }) {
  return (
    <div className={`w-full h-3 flex ${className}`} aria-hidden="true">
      {/* Sadu-inspired geometric pattern repeating */}
      <div 
        className="w-full h-full" 
        style={{
          backgroundSize: '24px 100%',
          backgroundImage: `
            linear-gradient(135deg, transparent 40%, #F0A03C 40%, #F0A03C 60%, transparent 60%),
            linear-gradient(45deg, transparent 40%, #F0A03C 40%, #F0A03C 60%, transparent 60%),
            linear-gradient(135deg, transparent 45%, #177E89 45%, #177E89 55%, transparent 55%),
            linear-gradient(45deg, transparent 45%, #177E89 45%, #177E89 55%, transparent 55%)
          `,
          backgroundColor: '#0A1128',
          backgroundPosition: '0 0, 0 0, 12px 0, 12px 0',
          opacity: 0.85
        }}
      />
    </div>
  );
}
