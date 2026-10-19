import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Users, Waves, Eye, Heart } from 'lucide-react';
import RatingStars from '@/components/RatingStars';
import { RefundPolicyBadge } from '@/components/RefundPolicyBadge';
import { useFavorites } from '@/hooks/useFavorites';
import { hasPeakPricing, getStartingRate } from '@/lib/peakPricing';
import type { KashtaListing } from '@/types/listing';

interface KashtaListingCardProps {
  listing: KashtaListing;
  onClick: () => void;
}

export function KashtaListingCard({ listing, onClick }: KashtaListingCardProps) {
  const { t } = useTranslation();
  const { isFavorite, toggleFavorite } = useFavorites();
  
  const mainImage = listing.images.find(img => img.isMain) || listing.images[0];
  const favorited = isFavorite(listing.id);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    toggleFavorite(listing.id);
  };

  return (
    <Card 
      onClick={onClick} 
      className="group cursor-pointer overflow-hidden bg-card/60 border border-border/50 hover:border-primary/50 transition-all duration-500 hover:shadow-[0_8px_30px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)] hover:-translate-y-1 backdrop-blur-sm rounded-3xl"
    >
      <CardContent className="p-0">
        {/* Main image */}
        <div className="relative h-64 overflow-hidden rounded-t-3xl">
          {mainImage ? (
            <img 
              src={mainImage.url} 
              alt={listing.title} 
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-in-out" 
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-background to-secondary flex items-center justify-center">
              <Waves className="w-16 h-16 text-primary/50" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent opacity-80" />
          
          {/* Listing type badge */}
          <div className="absolute top-4 left-4 rtl:left-auto rtl:right-4">
            <Badge className="bg-accent text-accent-foreground backdrop-blur-sm font-semibold px-3 py-1 border border-accent/20 rounded-xl shadow-[0_0_10px_rgba(23,126,137,0.3)]">
              <Waves className="w-4 h-4 ltr:mr-1 rtl:ml-1" />
              {t('listingType.kashta.badge')}
            </Badge>
          </div>
          
          {/* Refund policy badge */}
          {listing.cancellationPolicy && (
            <div className="absolute top-4 right-16 flex gap-2 rtl:right-auto rtl:left-16">
              <RefundPolicyBadge policy={listing.cancellationPolicy as unknown as 'refundable' | 'non-refundable'} />
            </div>
          )}
          
          {/* Favorite button */}
          <button
            onClick={handleFavoriteClick}
            className="absolute top-4 right-4 rtl:right-auto rtl:left-4 z-20 p-2 rounded-full bg-background/50 backdrop-blur-md border border-border/50 hover:bg-background transition-colors"
          >
            <Heart 
              className={`w-5 h-5 transition-colors ${favorited ? 'fill-red-500 text-red-500' : 'text-foreground'}`} 
            />
          </button>
          
          <div className="absolute bottom-4 left-4 right-4">
            <div className="flex items-center text-white text-base font-semibold drop-shadow-md">
              <MapPin className="w-5 h-5 ltr:mr-2 rtl:ml-2 text-primary" />
              {listing.location}
            </div>
          </div>
        </div>
        
        {/* Listing details */}
        <div className="p-6 relative">
          <h3 className="text-xl font-bold text-foreground mb-3 line-clamp-2 group-hover:text-primary transition-colors font-sans">
            {listing.title}
          </h3>
          
          {/* Rating */}
          {listing.rating && listing.reviewCount ? (
            <div className="flex items-center gap-2 mb-4">
              <RatingStars rating={listing.rating} size="lg" />
              <span className="text-base font-medium text-muted-foreground">
                {t('home.reviewCount', { count: listing.reviewCount })}
              </span>
            </div>
          ) : null}
          
          {/* Location and capacity */}
          <div className="flex items-center gap-6 text-base text-muted-foreground mb-5 font-medium">
            <span className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              {t('kashta.seatingCapacity', { count: listing.seatingCapacity })}
            </span>
          </div>
          
          {/* Beach-specific features */}
          <div className="flex flex-wrap gap-2 mb-4">
            {listing.beachfrontAccess && (
              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-xs py-1 rounded-lg">
                {t('kashta.beachfront')}
              </Badge>
            )}
            {listing.shadeType && (
              <Badge variant="secondary" className="bg-secondary text-foreground border-border text-xs py-1 rounded-lg">
                {t(`kashta.shade.${listing.shadeType}`)}
              </Badge>
            )}
            {listing.viewType && (
              <Badge variant="secondary" className="bg-secondary text-foreground border-border text-xs py-1 rounded-lg">
                {t(`kashta.view.${listing.viewType}`)}
              </Badge>
            )}
          </div>
          
          {/* Water activities */}
          {listing.waterActivities && listing.waterActivities.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-5">
              {listing.waterActivities.slice(0, 3).map((activity) => (
                <Badge key={activity} variant="outline" className="border-primary/30 text-primary/80 bg-background/50 text-xs py-1 rounded-lg">
                  {t(`kashta.activities.${activity}`)}
                </Badge>
              ))}
              {listing.waterActivities.length > 3 && (
                <Badge variant="outline" className="border-border text-muted-foreground text-xs py-1 rounded-lg">
                  +{listing.waterActivities.length - 3}
                </Badge>
              )}
            </div>
          )}
          
          {/* Price */}
          <div className="flex items-center justify-between pt-5 border-t border-border/50">
            <div>
              {hasPeakPricing(listing) && (
                <span className="text-sm font-medium text-muted-foreground mr-1 lowercase">{t('common.from')}</span>
              )}
              <span className="text-3xl font-bold text-primary font-display tracking-tight tabular-nums">
                {hasPeakPricing(listing) ? getStartingRate(listing) : listing.price} {t('common.currency')}
              </span>
              <span className="text-base font-medium text-muted-foreground ml-2">
                /{t('common.night')}
              </span>
            </div>
            
            {listing.views && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground font-medium">
                <Eye className="w-4 h-4 text-primary/70" />
                {listing.views}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}