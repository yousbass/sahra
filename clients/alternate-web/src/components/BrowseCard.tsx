import { Card } from '@/components/ui/card';
import { Heart, MapPin } from 'lucide-react';
import RatingStars from '@/components/RatingStars';
import { useFavorites } from '@/hooks/useFavorites';
import { LegacyCamp } from '@/lib/dataCompatibility';
import { hasPeakPricing, getStartingRate } from '@/lib/peakPricing';
import { useTranslation } from 'react-i18next';

const FALLBACK_PHOTO = 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800';

// Compact editorial card for the dedicated Camps / Kashtas browse sections.
export function BrowseCard({ camp, onClick }: { camp: LegacyCamp; onClick: () => void }) {
  const { t } = useTranslation();
  const { isFavorite, toggleFavorite } = useFavorites();
  return (
    <Card
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
      className="group cursor-pointer overflow-hidden rounded-3xl bg-card/60 border border-primary/20 hover:border-primary/50 backdrop-blur-sm transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_8px_30px_rgba(0,0,0,0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    >
      <div className="relative h-44 overflow-hidden">
        <img
          src={camp.photo}
          alt={camp.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-in-out"
          onError={(e) => {
            e.currentTarget.src = FALLBACK_PHOTO;
          }}
        />
        <button
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            toggleFavorite(camp.id);
          }}
          className="absolute top-3 right-3 rtl:right-auto rtl:left-3 p-1.5 rounded-full bg-background/50 backdrop-blur-md border border-border/50 hover:bg-background transition-colors z-10"
        >
          <Heart
            className={`w-5 h-5 transition-colors ${
              isFavorite(camp.id) ? 'fill-red-500 text-red-500' : 'text-foreground'
            }`}
          />
        </button>
      </div>
      <div className="p-4">
        <h3 className="font-bold font-sans text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
          {camp.title}
        </h3>
        <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
          <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="truncate">{camp.location}</span>
        </p>
        <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-border/50">
          <span className="text-lg font-bold text-foreground font-display tabular-nums">
            {hasPeakPricing(camp) && (
              <span className="text-xs text-muted-foreground font-medium lowercase">{t('common.from')} </span>
            )}
            {hasPeakPricing(camp) ? getStartingRate(camp) : camp.price} BD{' '}
            <span className="text-xs text-muted-foreground font-medium">{t('home.perDay')}</span>
          </span>
          {(camp.averageRating || 0) > 0 && (
            <RatingStars rating={camp.averageRating || 0} size="sm" />
          )}
        </div>
      </div>
    </Card>
  );
}
