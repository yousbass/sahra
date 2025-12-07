import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Users, Waves, Eye } from 'lucide-react';
import RatingStars from '@/components/RatingStars';
import { RefundPolicyBadge } from '@/components/RefundPolicyBadge';
import type { KashtaListing } from '@/types/listing';

interface KashtaListingCardProps {
  listing: KashtaListing;
  onClick: () => void;
}

export function KashtaListingCard({ listing, onClick }: KashtaListingCardProps) {
  const { t } = useTranslation();
  
  const mainImage = listing.images.find(img => img.isMain) || listing.images[0];

  return (
    <Card 
      onClick={onClick} 
      className="cursor-pointer hover:shadow-lg transition-shadow overflow-hidden group"
    >
      <CardContent className="p-0">
        {/* Main image */}
        <div className="relative h-48 overflow-hidden">
          {mainImage ? (
            <img 
              src={mainImage.url} 
              alt={listing.title} 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
              <Waves className="w-16 h-16 text-blue-400" />
            </div>
          )}
          
          {/* Listing type badge */}
          <Badge className="absolute top-2 right-2 bg-blue-500 hover:bg-blue-600">
            <Waves className="w-3 h-3 mr-1" />
            {t('listingType.kashta.badge')}
          </Badge>
          
          {/* Refund policy badge */}
          {listing.cancellationPolicy && (
            <div className="absolute top-2 left-2">
              <RefundPolicyBadge policy={listing.cancellationPolicy} />
            </div>
          )}
        </div>
        
        {/* Listing details */}
        <div className="p-4">
          <h3 className="font-semibold text-lg mb-2 line-clamp-1">
            {listing.title}
          </h3>
          
          {/* Rating */}
          {listing.rating && listing.reviewCount ? (
            <div className="flex items-center gap-2 mb-2">
              <RatingStars rating={listing.rating} />
              <span className="text-sm text-gray-600">
                {t('home.reviewCount', { count: listing.reviewCount })}
              </span>
            </div>
          ) : null}
          
          {/* Location and capacity */}
          <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
            <span className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {listing.location}
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {t('kashta.seatingCapacity', { count: listing.seatingCapacity })}
            </span>
          </div>
          
          {/* Beach-specific features */}
          <div className="flex flex-wrap gap-2 mb-3">
            {listing.beachfrontAccess && (
              <Badge variant="secondary" className="text-xs">
                {t('kashta.beachfront')}
              </Badge>
            )}
            {listing.shadeType && (
              <Badge variant="secondary" className="text-xs">
                {t(`kashta.shade.${listing.shadeType}`)}
              </Badge>
            )}
            {listing.viewType && (
              <Badge variant="secondary" className="text-xs">
                {t(`kashta.view.${listing.viewType}`)}
              </Badge>
            )}
          </div>
          
          {/* Water activities */}
          {listing.waterActivities && listing.waterActivities.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {listing.waterActivities.slice(0, 3).map((activity) => (
                <Badge key={activity} variant="outline" className="text-xs">
                  {t(`kashta.activities.${activity}`)}
                </Badge>
              ))}
              {listing.waterActivities.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{listing.waterActivities.length - 3}
                </Badge>
              )}
            </div>
          )}
          
          {/* Price */}
          <div className="flex items-center justify-between pt-3 border-t">
            <div>
              <span className="text-2xl font-bold">
                {listing.price} {t('common.currency')}
              </span>
              <span className="text-sm font-normal text-gray-600">
                /{t('common.night')}
              </span>
            </div>
            
            {listing.views && (
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <Eye className="w-4 h-4" />
                {listing.views}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}