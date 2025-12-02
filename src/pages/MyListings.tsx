import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, MapPin, Edit, Trash2, Loader2, Users, Tent, Eye, Calendar } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getCampsByHost, deleteCamp, Camp } from '@/lib/firestore';
import { toast } from 'sonner';

export default function MyListings() {
  const navigate = useNavigate();
  const { user, userData, loading } = useAuth();
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
      toast.error('Please sign in to view your listings');
      navigate('/signin');
    } else if (!userData.isHost) {
      toast.error('You need to become a host first');
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
      toast.error(`Failed to load your listings: ${errorMessage}`);
    } finally {
      setLoadingListings(false);
    }
  };

  const handleDelete = async (campId: string, campTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${campTitle}"?`)) return;

    try {
      console.log('=== DELETING LISTING ===');
      console.log('Camp ID:', campId);
      
      await deleteCamp(campId);
      console.log('✅ Listing deleted successfully');
      
      await loadListings();
      toast.success('Listing deleted successfully');
    } catch (error) {
      console.error('❌ Error deleting listing:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to delete listing: ${errorMessage}`);
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
      <div className="min-h-screen bg-gradient-to-b from-sand-50 via-sand-100 to-sand-200 p-4 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-terracotta-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-700 font-medium">Loading your listings...</p>
        </div>
      </div>
    );
  }

  if (!user || !userData || !userData.isHost) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sand-50 via-sand-100 to-sand-200 p-4">
      <div className="max-w-6xl mx-auto pt-8 pb-20">
        {/* Header */}
        <Button
          onClick={() => navigate('/host')}
          variant="ghost"
          className="mb-6 text-gray-900 hover:text-gray-950 hover:bg-sand-100 font-medium"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">My Listings</h1>
            <p className="text-gray-700 font-medium">
              {listings.length} listing{listings.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => navigate('/host/availability')}
              variant="outline"
              className="border-2 border-terracotta-300 text-terracotta-700 hover:bg-terracotta-50 hover:border-terracotta-400 font-semibold"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Manage Availability
            </Button>
            <Button
              onClick={() => navigate('/host/create')}
              className="bg-gradient-to-r from-terracotta-500 to-terracotta-600 hover:from-terracotta-600 hover:to-terracotta-700 text-white font-semibold shadow-lg"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Listing
            </Button>
          </div>
        </div>

        {listings.length === 0 ? (
          <Card className="bg-white/95 backdrop-blur-sm border-sand-300 p-12 text-center shadow-xl">
            <div className="w-20 h-20 bg-gradient-to-br from-terracotta-500 to-terracotta-600 rounded-full mx-auto flex items-center justify-center mb-4">
              <span className="text-4xl">🏕️</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Listings Yet</h3>
            <p className="text-gray-700 font-medium mb-6">Create your first camp listing to start hosting</p>
            <Button
              onClick={() => navigate('/host/create')}
              className="bg-gradient-to-r from-terracotta-500 to-terracotta-600 hover:from-terracotta-600 hover:to-terracotta-700 text-white font-semibold shadow-lg"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create First Listing
            </Button>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {listings.map((listing) => {
              const totalTents = getTotalTents(listing.tentConfiguration);
              return (
                <Card
                  key={listing.id}
                  className="bg-white/95 backdrop-blur-sm border-sand-300 overflow-hidden hover:shadow-xl transition-all group"
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
                        <MapPin className="w-4 h-4 mr-1" />
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
                              : 'bg-amber-100 text-amber-800 border border-amber-300'
                          }`}
                        >
                          {listing.status === 'active' ? 'Active' : 'Pending Approval'}
                        </Badge>
                      )}
                      {listing.maxGuests && (
                        <Badge variant="secondary" className="bg-sand-100 text-gray-900 border border-sand-300 font-semibold">
                          <Users className="w-3 h-3 mr-1" />
                          Up to {listing.maxGuests}
                        </Badge>
                      )}
                      {totalTents > 0 && (
                        <Badge variant="secondary" className="bg-terracotta-100 text-terracotta-900 border border-terracotta-300 font-semibold">
                          <Tent className="w-3 h-3 mr-1" />
                          {totalTents} Tents
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-2xl font-bold text-terracotta-600">
                          {listing.price} <span className="text-base text-gray-700">BD</span>
                        </p>
                        <p className="text-sm text-gray-600 font-medium">per day</p>
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
                              className="bg-sand-100 text-gray-800 border border-sand-300 text-xs font-medium"
                            >
                              {amenity}
                            </Badge>
                          ))}
                          {listing.amenities.length > 3 && (
                            <Badge
                              variant="secondary"
                              className="bg-terracotta-100 text-terracotta-900 border border-terracotta-300 text-xs font-semibold"
                            >
                              +{listing.amenities.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleViewCamp(listing.id)}
                        variant="outline"
                        className="flex-1 border-2 border-sand-300 text-gray-900 hover:bg-sand-50 hover:border-sand-400 font-semibold"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                      <Button
                        onClick={() => handleEditCamp(listing.id)}
                        variant="outline"
                        className="flex-1 border-2 border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-400 font-semibold"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
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
