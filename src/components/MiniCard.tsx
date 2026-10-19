import { Badge } from '@/components/ui/badge';
import { Waves, MapPin, Star } from 'lucide-react';
import { LegacyCamp } from '@/lib/dataCompatibility';
import { hasPeakPricing, getStartingRate } from '@/lib/peakPricing';
import { useTranslation } from 'react-i18next';
import { FavoriteButton } from '@/components/FavoriteButton';

const FALLBACK_PHOTO = 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800';

// Firestore's normalizeCampData attaches listingType at runtime; the shared
// LegacyCamp interface predates it, so read it through a local view type.
export const listingTypeOf = (c: LegacyCamp): 'camp' | 'kashta' =>
  (c as LegacyCamp & { listingType?: 'camp' | 'kashta' }).listingType || 'camp';

export function MiniCard({ camp, onClick }: { camp: LegacyCamp; onClick: () => void }) {
  const { t } = useTranslation();
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
      className="group cursor-pointer rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    >
      <div className="relative h-40 rounded-xl overflow-hidden border border-gray-200 bg-gray-100">
        <img
          src={camp.photo}
          alt={camp.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={(e) => {
            e.currentTarget.src = FALLBACK_PHOTO;
          }}
        />
        <FavoriteButton campId={camp.id} size="sm" className="absolute top-2 ltr:right-2 rtl:left-2" />
        {listingTypeOf(camp) === 'kashta' && (
          <Badge className="absolute top-2 ltr:left-2 rtl:right-2 bg-accent hover:bg-accent/90 text-accent-foreground">
            <Waves className="w-3 h-3 ltr:mr-1 rtl:ml-1" />
            {t('listingType.kashta.badge')}
          </Badge>
        )}
      </div>
      <div className="mt-2.5 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 leading-snug">{camp.title}</h3>
          <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{camp.location}</span>
          </p>
        </div>
        {(camp.averageRating || 0) > 0 && (
          <span className="flex items-center gap-1 text-xs font-semibold text-gray-700 shrink-0">
            <Star className="w-3.5 h-3.5 fill-primary text-primary" />
            {(camp.averageRating || 0).toFixed(1)}
          </span>
        )}
      </div>
      <p className="text-sm font-bold text-gray-900 mt-1 tabular-nums">
        {hasPeakPricing(camp) ? `${t('common.from')} ${getStartingRate(camp)}` : camp.price} BD <span className="font-medium text-gray-500 text-xs">{t('home.perDay')}</span>
      </p>
    </div>
  );
}
