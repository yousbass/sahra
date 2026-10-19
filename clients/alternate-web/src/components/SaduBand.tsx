import { useTranslation } from 'react-i18next';

export function SaduBand() {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  return (
    <div 
      className="w-full h-3 relative overflow-hidden bg-background/50 border-y border-border/30" 
      aria-hidden="true"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div 
        className="absolute inset-0 w-full h-full opacity-70 flex items-center justify-between pointer-events-none"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, hsl(var(--primary)) 30%, hsl(var(--accent)) 50%, hsl(var(--primary)) 70%, transparent 100%)',
          maskImage: 'repeating-linear-gradient(45deg, transparent, transparent 6px, black 6px, black 12px)',
          WebkitMaskImage: 'repeating-linear-gradient(45deg, transparent, transparent 6px, black 6px, black 12px)'
        }}
      />
      <div className="absolute inset-0 flex items-center justify-around px-4">
        {[...Array(24)].map((_, i) => (
          <div 
            key={i} 
            className="w-1.5 h-1.5 rotate-45 opacity-60"
            style={{ 
              backgroundColor: i % 2 === 0 ? 'hsl(var(--accent))' : 'hsl(var(--primary))',
              boxShadow: '0 0 0 1px hsl(var(--foreground)/0.1)',
              margin: '0 1vw' 
            }}
          />
        ))}
      </div>
    </div>
  );
}
