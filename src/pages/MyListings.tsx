import { CampfireLoader } from '@/components/CampfireLoader';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, MapPin, Edit, Trash2, Users, Tent, Eye, Calendar, Star } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getCampsByHost, deleteCamp, Camp } from '@/lib/firestore';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export default function MyListings() {
  const navigate = useNavigate();
  const { user, userData, loading } = useAuth();
  const { t } = useTranslation();
  const [listings, setListings] = useState<Camp[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);

  useEffect(() => {
    console.log('=== MY LISTINGS PAGE ===');
    console.log('Auth loading:', loading);
    console.log('User:', user);
    console.log('User data:', userData);
    
    // Wait for auth to finish loading before checking
    if (loading) return;

    if (!user || !userData) {
      toast.error(t('hostListings.signInRequired'));
      navigate('/signin');
    } else if (!userData.isHost) {
      toast.error(t('hostListings.hostRequired'));
      navigate('/profile');
    } else {
      loadListings();
    }
  }, [user, userData, loading, navigate]);

  const loadListings = async () => {
    if (!user) {
      console.log('❌ No user available');
      return;
    }

    try {
      console.log('=== LOADING LISTINGS ===');
      console.log('Fetching camps for user ID:', user.uid);
      setLoadingListings(true);

      const userListings = await getCampsByHost(user.uid);
      console.log('✅ Successfully loaded listings:', userListings);
      setListings(userListings);
    } catch (error) {
      console.error('❌ Error loading listings:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(t('hostListings.loadFail', { error: errorMessage }));
    } finally {
      setLoadingListings(false);
    }
  };

  const handleDelete = async (campId: string, campTitle: string) => {
    if (!confirm(t('hostListings.deleteConfirm', { title: campTitle }))) return;

    try {
      console.log('=== DELETING LISTING ===');
      console.log('Camp ID:', campId);
      
      await deleteCamp(campId);
      console.log('✅ Listing deleted successfully');
      
      await loadListings();
      toast.success(t('hostListings.deleteSuccess'));
    } catch (error) {
      console.error('❌ Error deleting listing:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(t('hostListings.deleteFail', { error: errorMessage }));
    }
  };

  const handleViewCamp = (campId: string) => {
    console.log('=== VIEWING CAMP ===');
    console.log('Camp ID:', campId);
    navigate(`/camp/${campId}`, {
      state: { from: '/host/listings' }
    });
  };

  const handleEditCamp = (campId: string) => {
    console.log('=== EDITING CAMP ===');
    console.log('Camp ID:', campId);
    navigate(`/edit-listing/${campId}`);
  };

  const getTotalTents = (config?: { large: number; small: number; entertainment: number }) => {
    if (!config) return 0;
    return config.large + config.small + config.entertainment;
  };

  if (loading || loadingListings) {
    return (
      <div className="min-h-screen bg-gradient-to-b desert-bg p-4 flex items-center justify-center">
        <div className="text-center">
          <CampfireLoader size="lg" className="mx-auto mb-4" />
          <p className="text-gray-700 font-medium">{t('hostListings.loading')}</p>
        </div>
      </div>
    );
  }

  if (!user || !userData || !userData.isHost) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b desert-bg p-4">
      <div className="max-w-6xl mx-auto pt-8 pb-20">
        {/* Header */}
        <Button
          onClick={() => navigate('/host')}
          variant="ghost"
          className="mb-6 text-gray-900 hover:text-gray-950 hover:bg-secondary font-medium"
        >
          <ArrowLeft className="w-4 h-4 ltr:mr-2 rtl:ml-2" />
          {t('hostListings.backToDashboard')}
        </Button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">{t('hostListings.title')}</h1>
            <p className="text-gray-700 font-medium">
              {t('hostListings.count', { count: listings.length })}
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => navigate('/host/availability')}
              variant="outline"
              className="border-2 border-border/80 text-primary hover:bg-secondary hover:border-primary font-semibold"
            >
              <Calendar className="w-4 h-4 ltr:mr-2 rtl:ml-2" />
              {t('hostListings.buttons.manageAvailability')}
            </Button>
            <Button
              onClick={() => navigate('/host/create')}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg lantern-halo"
            >
              <Plus className="w-4 h-4 ltr:mr-2 rtl:ml-2" />
              {t('hostListings.buttons.newListing')}
            </Button>
          </div>
        </div>

        {listings.length === 0 ? (
          <Card className="bg-white/95 backdrop-blur-sm border-border/80 p-12 text-center shadow-xl">
            <div className="w-20 h-20 bg-primary/20 rounded-full mx-auto flex items-center justify-center mb-4">
              <Tent className="w-10 h-10 text-primary mx-auto mb-4" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('hostListings.emptyTitle')}</h3>
            <p className="text-gray-700 font-medium mb-6">{t('hostListings.emptyDesc')}</p>
            <Button
              onClick={() => navigate('/host/create')}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg lantern-halo"
            >
              <Plus className="w-4 h-4 ltr:mr-2 rtl:ml-2" />
              {t('hostListings.createFirst')}
            </Button>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {listings.map((listing) => {
              const totalTents = getTotalTents((listing as unknown as { tentConfiguration?: { large: number; small: number; entertainment: number } }).tentConfiguration);
              return (
                <Card
                  key={listing.id}
                  className="bg-white/95 backdrop-blur-sm border-border/80 overflow-hidden hover:shadow-xl transition-all group"
                >
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={listing.images?.[0] || 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800'}
                      alt={listing.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      onError={(e) => {
                        e.currentTarget.src = 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
                    <div className="absolute bottom-3 left-3 right-3">
                      <h3 className="text-white font-bold text-lg mb-1 drop-shadow-lg">
                        {listing.title}
                      </h3>
                      <div className="flex items-center text-white/90 text-sm drop-shadow">
                        <MapPin className="w-4 h-4 ltr:mr-1 rtl:ml-1" />
                        <span>{listing.location}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4">
                    {/* Camp Info Badges */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {listing.status && (
                        <Badge
                      variant="secondary"
                      className={`text-xs font-semibold ${
                        listing.status === 'active'
                          ? 'bg-green-100 text-green-800 border border-green-300'
                          : 'bg-secondary text-primary border border-border/80'
                      }`}
                    >
                          {listing.status === 'active' ? t('hostListings.status.active') : t('hostListings.status.pending')}
                    </Badge>
                  )}
                  {listing.maxGuests && (
                    <Badge variant="secondary" className="bg-secondary text-gray-900 border border-border/80 font-semibold">
                      <Users className="w-3 h-3 ltr:mr-1 rtl:ml-1" />
                          {listing.maxGuests} {t('hostListings.guestsLabel')}
                    </Badge>
                  )}
                  {totalTents > 0 && (
                    <Badge variant="secondary" className="bg-secondary text-gray-900 border border-border/80 font-semibold">
                      <Tent className="w-3 h-3 ltr:mr-1 rtl:ml-1" />
                          {totalTents} {t('hostListings.tentsLabel')}
                    </Badge>
                  )}
                    </div>

                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-2xl font-bold text-primary">
                          {(listing as unknown as { price?: number }).price ?? listing.pricePerNight} <span className="text-base text-gray-700">BD</span>
                        </p>
                        <p className="text-sm text-gray-600 font-medium">{t('home.perDay')}</p>
                  </div>
                </div>

                    {/* Amenities Display */}
                    {listing.amenities && listing.amenities.length > 0 && (
                      <div className="mb-4">
                        <div className="flex flex-wrap gap-1.5">
                          {listing.amenities.slice(0, 3).map((amenity) => (
                            <Badge
                              key={amenity}
                              variant="secondary"
                              className="bg-secondary text-gray-800 border border-border/80 text-xs font-medium"
                            >
                              {amenity}
                            </Badge>
                          ))}
                      {listing.amenities.length > 3 && (
                        <Badge
                          variant="secondary"
                          className="bg-secondary text-gray-800 border border-border/80 text-xs font-semibold"
                        >
                              +{listing.amenities.length - 3} {t('hostListings.more')}
                        </Badge>
                      )}
                        </div>
                      </div>
                    )}

                    {/* Rating row */}
                  {(listing.rating || listing.reviewCount) ? (
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                      <span className="text-sm font-semibold text-gray-800">
                        {typeof listing.rating === 'number' ? listing.rating.toFixed(1) : '—'}
                      </span>
                      <span className="text-sm text-gray-500">
                        ({listing.reviewCount ?? 0})
                      </span>
                    </div>
                  ) : null}

                  <div className="flex gap-2">
                      <Button
                        onClick={() => handleViewCamp(listing.id)}
                        variant="outline"
                        className="flex-1 border-2 border-border/80 text-gray-900 hover:bg-secondary hover:border-primary font-semibold"
                      >
                        <Eye className="w-4 h-4 ltr:mr-1 rtl:ml-1" />
                        {t('hostListings.buttons.view')}
                      </Button>
                      <Button
                        onClick={() => handleEditCamp(listing.id)}
                        variant="outline"
                        className="flex-1 border-2 border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-400 font-semibold"
                      >
                        <Edit className="w-4 h-4 ltr:mr-1 rtl:ml-1" />
                        {t('hostListings.buttons.edit')}
                      </Button>
                      <Button
                        onClick={() => handleDelete(listing.id, listing.title)}
                        variant="outline"
                        className="border-2 border-red-300 text-red-700 hover:bg-red-50 hover:border-red-400 font-semibold"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}