import { useTranslation } from 'react-i18next';
import { Tent, Waves } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ListingType } from '@/types/listing';

interface ListingTypeSelectorProps {
  value: ListingType | 'all';
  onChange: (type: ListingType | 'all') => void;
  disabled?: boolean;
  variant?: 'cards' | 'tabs';
  campCount?: number;
  kashtaCount?: number;
}

export function ListingTypeSelector({
  value,
  onChange,
  disabled = false,
  variant = 'cards',
  campCount,
  kashtaCount
}: ListingTypeSelectorProps) {
  const { t } = useTranslation();

  if (variant === 'tabs') {
    return (
      <div className="inline-flex rounded-xl border border-border/50 p-1 bg-background/50 backdrop-blur-sm">
        <button
          type="button"
          onClick={() => onChange('camp')}
          disabled={disabled}
          className={cn(
            'px-5 py-2.5 rounded-lg text-sm font-medium transition-all font-sans',
            value === 'camp'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
          )}
        >
          <Tent className="w-4 h-4 inline-block ltr:mr-2 rtl:ml-2" />
          {t('listingType.camp.title')}
        </button>
        <button
          type="button"
          onClick={() => onChange('kashta')}
          disabled={disabled}
          className={cn(
            'px-5 py-2.5 rounded-lg text-sm font-medium transition-all font-sans',
            value === 'kashta'
              ? 'bg-accent text-accent-foreground shadow-[0_0_10px_rgba(23,126,137,0.3)]'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
          )}
        >
          <Waves className="w-4 h-4 inline-block ltr:mr-2 rtl:ml-2" />
          {t('listingType.kashta.title')}
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <button
        type="button"
        onClick={() => onChange('camp')}
        disabled={disabled}
        className={cn(
          'p-6 border rounded-2xl transition-all text-left rtl:text-right',
          'hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden',
          value === 'camp'
            ? 'border-primary bg-primary/5 shadow-md shadow-primary/5'
            : 'border-border/80 bg-card hover:border-primary/30 shadow-sm'
        )}
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none transition-opacity opacity-0 group-hover:opacity-100" />
        <div className="relative flex items-start gap-5 rtl:flex-row-reverse">
          <div className={cn(
            'p-3.5 rounded-2xl border transition-all',
            value === 'camp' ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary border-border text-muted-foreground group-hover:text-primary group-hover:border-primary/30'
          )}>
            <Tent className="w-7 h-7" />
          </div>
          <div className="flex-1 pt-1">
            <div className="flex items-center justify-between mb-1">
              <h3 className={cn(
                "font-semibold text-xl font-sans transition-colors",
                value === 'camp' ? "text-primary" : "text-foreground group-hover:text-primary/90"
              )}>
                {t('listingType.camp.title')}
              </h3>
              {campCount !== undefined && (
                <span className="text-xs font-medium text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                  {campCount}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
              {t('listingType.camp.description')}
            </p>
            <div className="text-xs font-medium text-foreground bg-primary/10 inline-block px-2.5 py-1 rounded-lg">
              {t('listingType.camp.features')}
            </div>
          </div>
        </div>
      </button>

      <button
        type="button"
        onClick={() => onChange('kashta')}
        disabled={disabled}
        className={cn(
          'p-6 border rounded-2xl transition-all text-left rtl:text-right',
          'hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden',
          value === 'kashta'
            ? 'border-accent bg-accent/5 shadow-md shadow-accent/5'
            : 'border-border/80 bg-card hover:border-accent/30 shadow-sm'
        )}
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none transition-opacity opacity-0 group-hover:opacity-100" />
        <div className="relative flex items-start gap-5 rtl:flex-row-reverse">
          <div className={cn(
            'p-3.5 rounded-2xl border transition-all',
            value === 'kashta' ? 'bg-accent text-accent-foreground border-accent shadow-[0_0_15px_rgba(23,126,137,0.3)]' : 'bg-secondary border-border text-muted-foreground group-hover:text-accent group-hover:border-accent/30'
          )}>
            <Waves className="w-7 h-7" />
          </div>
          <div className="flex-1 pt-1">
            <div className="flex items-center justify-between mb-1">
              <h3 className={cn(
                "font-semibold text-xl font-sans transition-colors",
                value === 'kashta' ? "text-accent" : "text-foreground group-hover:text-accent/90"
              )}>
                {t('listingType.kashta.title')}
              </h3>
              {kashtaCount !== undefined && (
                <span className="text-xs font-medium text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                  {kashtaCount}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
              {t('listingType.kashta.description')}
            </p>
            <div className="text-xs font-medium text-foreground bg-accent/10 inline-block px-2.5 py-1 rounded-lg border border-accent/20">
              {t('listingType.kashta.features')}
            </div>
          </div>
        </div>
      </button>
    </div>
  );
}