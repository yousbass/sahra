import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MapPin, Wifi, Utensils, Wind, Tent, ArrowLeft, Users, Home, Check, Loader2, Star as StarIcon, ShieldCheck, XCircle, Clock } from 'lucide-react';
import { getCampById, canUserReview, createReview } from '@/lib/firestore';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import RatingStars from '@/components/RatingStars';
import ReviewsSummary from '@/components/ReviewsSummary';
import ReviewsList from '@/components/ReviewsList';
import ReviewForm from '@/components/ReviewForm';
import { RefundPolicyBadge } from '@/components/RefundPolicyBadge';
import type { CancellationPolicy } from '@/lib/refundCalculator';
import { LegacyCamp, normalizeCampToLegacy } from '@/lib/dataCompatibility';

export default function CampDetails() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [camp, setCamp] = useState<LegacyCamp | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [canReview, setCanReview] = useState(false);

  useEffect(() => {
    console.log('=== CAMP DETAILS PAGE ===');
    console.log('Camp ID from URL:', slug);
    
    if (slug) {
      loadCamp(slug);
    } else {
      console.log('❌ No camp ID provided');
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    if (camp && user) {
      checkReviewEligibility();
    }
  }, [camp, user]);

  const loadCamp = async (campId: string) => {
    try {
      console.log('=== LOADING CAMP ===');
      console.log('Camp ID:', campId);
      setLoading(true);
      
      const foundCamp = await getCampById(campId);
      console.log('✅ Camp loaded:', foundCamp);
      
      if (foundCamp) {
        // Convert to legacy format for compatibility
        const legacyCamp = normalizeCampToLegacy(foundCamp);
        const defaultCheckInTime = legacyCamp.checkInTime || '08:00 AM';
        const defaultCheckOutTime = legacyCamp.checkOutTime || '03:00 AM';
        const amenities = legacyCamp.amenities && legacyCamp.amenities.length > 0
          ? legacyCamp.amenities
          : ['WiFi', 'Traditional Meals', 'Air Conditioning', 'Luxury Tents'];
        const tents = (foundCamp as unknown as { tents?: unknown[] }).tents || legacyCamp.tents || [];
        
        console.log("DEBUG: legacyCamp checkInTime:", defaultCheckInTime);
        console.log("DEBUG: legacyCamp checkOutTime:", defaultCheckOutTime);
        setCamp({
          ...legacyCamp,
          checkInTime: defaultCheckInTime,
          checkOutTime: defaultCheckOutTime,
          description: legacyCamp.description || 'Experience the magic of the Bahrain desert with our luxury camping facilities. Enjoy traditional Bedouin hospitality combined with modern comfort.',
          amenities,
          tents,
        });
      } else {
        console.log('❌ Camp not found');
        toast.error('Camp not found');
      }
    } catch (error) {
      console.error('❌ Error loading camp:', error);
      toast.error('Failed to load camp details');
    } finally {
      setLoading(false);
    }
  };

  const checkReviewEligibility = async () => {
    if (!camp || !user) return;

    try {
      const result = await canUserReview(user.uid, camp.id);
      setCanReview(result.canReview);
    } catch (error) {
      console.error('Error checking review eligibility:', error);
    }
  };

  const handleSubmitReview = async (reviewData: { rating: number; reviewText: string }) => {
    if (!camp || !user) return;

    try {
      await createReview({
        campId: camp.id,
        userId: user.uid,
        rating: reviewData.rating,
        reviewText: reviewData.reviewText,
        userName: user.displayName || user.email || 'Anonymous',
        userPhoto: user.photoURL,
        checkInDate: new Date().toISOString(),
        checkOutDate: new Date().toISOString()
      });

      toast.success('Review submitted successfully!');
      setShowReviewForm(false);
      setCanReview(false);
      
      loadCamp(camp.id);
    } catch (error) {
      console.error('Error submitting review:', error);
      throw error;
    }
  };

  const handleBack = () => {
    const originalFrom = location.state?.originalFrom || location.state?.from;
    
    if (originalFrom) {
      navigate(originalFrom);
    } else if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  const handleReserve = () => {
    console.log('=== RESERVE BUTTON CLICKED ===');
    console.log('Camp ID:', camp?.id);
    console.log('Navigating to:', `/reserve?camp=${camp?.id}`);
    
    const originalFrom = location.state?.originalFrom || location.state?.from || '/';
    navigate(`/reserve?camp=${camp?.id}`, {
      state: { originalFrom }
    });
  };

  const getAmenityIcon = (amenity: string) => {
    const lower = amenity.toLowerCase();
    if (lower.includes('wifi') || lower.includes('internet')) return <Wifi className="w-5 h-5" />;
    if (lower.includes('meal') || lower.includes('food') || lower.includes('dining')) return <Utensils className="w-5 h-5" />;
    if (lower.includes('air') || lower.includes('ac') || lower.includes('conditioning')) return <Wind className="w-5 h-5" />;
    if (lower.includes('tent') || lower.includes('accommodation')) return <Tent className="w-5 h-5" />;
    return <StarIcon className="w-5 h-5" />;
  };

  const getPolicyDetails = (policy: CancellationPolicy) => {
    switch (policy) {
      case 'flexible':
        return {
          name: 'Flexible',
          icon: <ShieldCheck className="w-6 h-6 text-green-600" />,
          color: 'green',
          description: 'Full refund if cancelled 24+ hours before check-in',
          details: [
            { time: '24+ hours before', refund: '100%', color: 'green', description: 'Full refund (minus service fee)' },
            { time: 'Less than 24 hours', refund: '0%', color: 'red', description: 'No refund' }
          ]
        };
      case 'moderate':
        return {
          name: 'Moderate',
          icon: <ShieldCheck className="w-6 h-6 text-blue-600" />,
          color: 'blue',
          description: '50% refund if cancelled 48+ hours before check-in',
          details: [
            { time: '48+ hours before', refund: '50%', color: 'green', description: '50% refund' },
            { time: 'Less than 48 hours', refund: '0%', color: 'red', description: 'No refund' }
          ]
        };
      case 'strict':
        return {
          name: 'Strict',
          icon: <XCircle className="w-6 h-6 text-orange-600" />,
          color: 'orange',
          description: '50% refund if cancelled 7+ days before check-in',
          details: [
            { time: '7+ days before', refund: '50%', color: 'green', description: '50% refund' },
            { time: 'Less than 7 days', refund: '0%', color: 'red', description: 'No refund' }
          ]
        };
      default:
        return {
          name: 'Moderate',
          icon: <ShieldCheck className="w-6 h-6 text-blue-600" />,
          color: 'blue',
          description: '50% refund if cancelled 48+ hours before check-in',
          details: [
            { time: '48+ hours before', refund: '50%', color: 'green', description: '50% refund' },
            { time: 'Less than 48 hours', refund: '0%', color: 'red', description: 'No refund' }
          ]
        };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sand-50 via-sand-100 to-sand-200 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-terracotta-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-700 font-medium">Loading camp details...</p>
        </div>
      </div>
    );
  }

  if (!camp) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sand-50 via-sand-100 to-sand-200 p-4 flex items-center justify-center">
        <Card className="bg-white/95 backdrop-blur-sm border-sand-300 p-8 text-center shadow-xl">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Camp not found</h2>
          <Button
            onClick={() => navigate('/')}
            className="bg-gradient-to-r from-terracotta-500 to-terracotta-600 hover:from-terracotta-600 hover:to-terracotta-700 text-white font-semibold"
          >
            Back to Search
          </Button>
        </Card>
      </div>
    );
  }

  const totalTents = (camp.tentConfiguration?.large || 0) + 
                     (camp.tentConfiguration?.small || 0) + 
                     (camp.tentConfiguration?.entertainment || 0);

  const hasReviews = camp.reviewCount && camp.reviewCount > 0;
  const tentDetails = (camp as unknown as { tents?: Array<Record<string, unknown>> }).tents || [];

  // Only allow booking for active listings (pending/inactive should be view-only)
  const isActive = !camp.status || camp.status === 'active';
  
  // Get check-in/check-out times with defaults
  const checkInTime = camp?.checkInTime || '08:00 AM';
  const checkOutTime = camp?.checkOutTime || '03:00 AM';

  // Get cancellation policy (default to moderate if not set)
  const cancellationPolicy = (camp.refundPolicy === 'refundable' ? 'flexible' : 
                              camp.refundPolicy === 'non-refundable' ? 'strict' : 
                              'moderate') as CancellationPolicy;
  const policyDetails = getPolicyDetails(cancellationPolicy);

  return (
    <div className="min-h-screen bg-gradient-to-b from-sand-50 via-sand-100 to-sand-200">
      {/* Hero Image */}
      <div className="relative h-[38vh] sm:h-[50vh] md:h-[60vh]">
        <img
          src={camp.photo}
          alt={camp.title}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.src = 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent"></div>
        
        <Button
          onClick={handleBack}
          variant="secondary"
          className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm hover:bg-white text-gray-900 shadow-lg font-semibold"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-3xl md:text-5xl font-bold text-white mb-3 drop-shadow-lg">
              {camp.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-white/90">
              <div className="flex items-center gap-2 bg-black/30 backdrop-blur-sm px-3 py-1.5 rounded-full">
                <MapPin className="w-4 h-4" />
                <span className="text-sm font-medium">{camp.location}</span>
              </div>
              {camp.averageRating && camp.averageRating > 0 && (
                <div className="bg-black/30 backdrop-blur-sm px-3 py-1.5 rounded-full">
                  <RatingStars rating={camp.averageRating} size="sm" showValue />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8 pb-24">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {!isActive && (
              <Card className="bg-amber-50 border-amber-200 p-4 text-amber-900 font-medium">
                This listing is awaiting approval. Booking will be available once it is activated.
              </Card>
            )}
            {/* Camp Overview */}
            {(camp.maxGuests || totalTents > 0) && (
              <Card className="bg-white/95 backdrop-blur-sm border-sand-300 p-6 shadow-xl">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Camp Overview</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {camp.maxGuests && (
                    <div className="flex items-center gap-3 p-4 bg-gradient-to-br from-sand-50 to-terracotta-50 rounded-lg border-2 border-sand-300">
                      <Users className="w-6 h-6 text-terracotta-600" />
                      <div>
                        <p className="text-2xl font-bold text-gray-900">{camp.maxGuests}</p>
                        <p className="text-sm text-gray-700 font-medium">Max Guests</p>
                      </div>
                    </div>
                  )}
                  {totalTents > 0 && (
                    <div className="flex items-center gap-3 p-4 bg-gradient-to-br from-sand-50 to-terracotta-50 rounded-lg border-2 border-sand-300">
                      <Tent className="w-6 h-6 text-terracotta-600" />
                      <div>
                        <p className="text-2xl font-bold text-gray-900">{totalTents}</p>
                        <p className="text-sm text-gray-700 font-medium">Total Tents</p>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Camp Hours */}
                <div className="mt-4 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-5 h-5 text-terracotta-600" />
                    <h3 className="text-lg font-bold text-gray-900">Camp Hours</h3>
                  </div>
                  <div className="space-y-1">
                    <p className="text-gray-900 font-semibold">
                      Check-in: <span className="text-terracotta-600">{checkInTime}</span>
                    </p>
                    <p className="text-gray-900 font-semibold">
                      Check-out: <span className="text-terracotta-600">{checkOutTime}</span> <span className="text-sm text-gray-600">(next day)</span>
                    </p>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    Full day camp experience in Bahrain style
                  </p>
                </div>
              </Card>
            )}

            {/* Description */}
            <Card className="bg-white/95 backdrop-blur-sm border-sand-300 p-6 shadow-xl">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">About This Camp</h2>
              <p className="text-gray-700 leading-relaxed font-medium">{camp.description}</p>
            </Card>

            {/* Cancellation Policy */}
            <Card className="bg-white/95 backdrop-blur-sm border-sand-300 p-6 shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                {policyDetails.icon}
                <h2 className="text-2xl font-bold text-gray-900">Cancellation Policy</h2>
              </div>
              
              <div className="mb-4">
                <Badge 
                  className={`text-base px-4 py-2 ${
                    policyDetails.color === 'green' 
                      ? 'bg-green-100 text-green-800 border-green-300' 
                      : policyDetails.color === 'blue'
                      ? 'bg-blue-100 text-blue-800 border-blue-300'
                      : 'bg-orange-100 text-orange-800 border-orange-300'
                  } border-2`}
                >
                  {policyDetails.name} Cancellation
                </Badge>
              </div>

              <p className="text-gray-700 font-medium mb-4">
                {policyDetails.description}
              </p>

              <div className="space-y-3">
                {policyDetails.details.map((detail, index) => (
                  <div 
                    key={index}
                    className={`flex items-start gap-3 p-3 rounded-lg border ${
                      detail.color === 'green' 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    {detail.color === 'green' ? (
                      <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                    )}
                    <div>
                      <p className="font-semibold text-gray-900">{detail.description}</p>
                      <p className="text-sm text-gray-700">Cancel {detail.time} check-in</p>
                      {detail.refund === '100%' && (
                        <p className="text-xs text-gray-600 mt-1">Service fee is non-refundable</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              <p className="text-sm text-gray-600 font-medium pt-4 border-t border-sand-200 mt-4">
                💡 Refunds are processed within 5-10 business days to your original payment method.
              </p>
            </Card>

            {/* Amenities */}
            <Card className="bg-white/95 backdrop-blur-sm border-sand-300 p-6 shadow-xl">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Facilities & Amenities</h2>
              {camp.amenities && camp.amenities.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {camp.amenities.map((amenity, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 bg-gradient-to-br from-sand-50 to-terracotta-50 rounded-lg border-2 border-sand-300"
                    >
                      <div className="text-terracotta-600">
                        {getAmenityIcon(amenity)}
                      </div>
                      <span className="text-sm font-semibold text-gray-900">{amenity}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-700 font-medium">No amenities listed for this camp.</p>
              )}
            </Card>

            {/* Tent Details */}
            {tentDetails.length > 0 && (
              <Card className="bg-white/95 backdrop-blur-sm border-sand-300 p-6 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-gray-900">Tent Details</h2>
                  <Badge className="bg-terracotta-100 text-terracotta-900 border border-terracotta-200">
                    {tentDetails.length} tent{tentDetails.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {tentDetails.map((tent: any, idx: number) => {
                    const features: string[] = [];
                    if (tent.furnished) features.push('Furnished');
                    if (tent.carpeted) features.push('Carpeted');
                    if (tent.tv) features.push('TV');
                    if (tent.sofas) features.push('Sofas');
                    if (tent.teaSets) features.push('Tea Sets');
                    if (tent.pingPongTable) features.push('Ping Pong');
                    if (tent.foosballTable) features.push('Foosball');
                    if (tent.airHockeyTable) features.push('Air Hockey');
                    if (tent.volleyballField) features.push('Volleyball');
                    if (tent.footballField) features.push('Football');

                    const typeLabel =
                      tent.type === 'large'
                        ? 'Large Tent'
                        : tent.type === 'small'
                        ? 'Small Tent'
                        : tent.type === 'entertainment'
                        ? 'Entertainment Tent'
                        : 'Tent';

                    return (
                      <div
                        key={tent.id || idx}
                        className="p-4 border border-sand-200 rounded-lg bg-gradient-to-br from-sand-50 to-terracotta-50"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-semibold text-gray-900">
                            {typeLabel} #{idx + 1}
                          </p>
                          <Badge className="bg-sand-100 text-gray-900 border border-sand-300 text-xs font-semibold">
                            {features.length > 0 ? `${features.length} features` : 'No features set'}
                          </Badge>
                        </div>
                        {features.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-2">
                            {features.map((f) => (
                              <Badge
                                key={f}
                                variant="secondary"
                                className="bg-white text-gray-900 border border-sand-300 text-xs font-semibold"
                              >
                                {f}
                              </Badge>
                            ))}
                          </div>
                        )}
                        {tent.description && (
                          <p className="text-sm text-gray-700 leading-relaxed">
                            {tent.description}
                          </p>
                        )}
                        {!tent.description && features.length === 0 && (
                          <p className="text-xs text-gray-500">No details provided for this tent.</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* Reviews Section */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Guest Reviews</h2>
                {user && canReview && (
                  <Button
                    onClick={() => setShowReviewForm(true)}
                    className="bg-gradient-to-r from-terracotta-500 to-terracotta-600 hover:from-terracotta-600 hover:to-terracotta-700"
                  >
                    Write a Review
                  </Button>
                )}
                {!user && (
                  <Button
                    onClick={() => navigate('/login')}
                    variant="outline"
                    className="border-terracotta-500 text-terracotta-600 hover:bg-terracotta-50"
                  >
                    Sign in to Review
                  </Button>
                )}
              </div>

              {hasReviews && camp.ratingDistribution && (
                <ReviewsSummary
                  averageRating={camp.averageRating || 0}
                  reviewCount={camp.reviewCount || 0}
                  ratingDistribution={camp.ratingDistribution}
                />
              )}

              <ReviewsList campId={camp.id} currentUserId={user?.uid} />
            </div>
          </div>

          {/* Booking Card */}
          <div className="lg:col-span-1">
            <Card className="bg-white/95 backdrop-blur-sm border-sand-300 p-6 sticky top-4 shadow-xl">
              <div className="mb-6">
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-4xl font-bold text-terracotta-600">{camp.price}</span>
                  <span className="text-lg text-gray-700 font-medium">BD</span>
                </div>
                <p className="text-sm text-gray-600 font-medium">per day</p>
              </div>

              {camp.maxGuests && (
                <div className="mb-4 p-3 bg-sand-50 rounded-lg border border-sand-300">
                  <p className="text-sm text-gray-900 font-semibold">
                    <Users className="w-4 h-4 inline mr-1" />
                    Accommodates up to {camp.maxGuests} guests
                  </p>
                </div>
              )}

              <Button
                onClick={handleReserve}
                disabled={!isActive}
                className="w-full h-14 bg-gradient-to-r from-terracotta-500 to-terracotta-600 hover:from-terracotta-600 hover:to-terracotta-700 text-white font-semibold text-lg shadow-lg mb-4"
              >
                {isActive ? 'Reserve Now' : 'Pending Approval'}
              </Button>

              <div className="space-y-3 pt-4 border-t border-sand-300">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 font-medium">Instant Confirmation</span>
                  <span className="text-green-600 font-semibold">✓</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 font-medium">{policyDetails.name} Cancellation</span>
                  <span className={`font-semibold ${
                    policyDetails.color === 'green' ? 'text-green-600' : 
                    policyDetails.color === 'blue' ? 'text-blue-600' : 
                    'text-orange-600'
                  }`}>
                    ✓
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 font-medium">24/7 Support</span>
                  <span className="text-green-600 font-semibold">✓</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Review Form Dialog */}
      <Dialog open={showReviewForm} onOpenChange={setShowReviewForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Write a Review</DialogTitle>
          </DialogHeader>
          <ReviewForm
            campId={camp.id}
            campName={camp.title}
            bookingId=""
            checkInDate={new Date().toISOString()}
            checkOutDate={new Date().toISOString()}
            onSubmit={handleSubmitReview}
            onCancel={() => setShowReviewForm(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
