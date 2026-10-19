import { CampfireLoader } from '@/components/CampfireLoader';
import { useState, useEffect, type ReactElement } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MapPin, Wifi, Utensils, Wind, Tent, ArrowLeft, Users, Home, Check, Star as StarIcon, ShieldCheck, XCircle, Clock, Waves, Umbrella, Eye, Sofa, Tv, Coffee, Table2, Gamepad2, CircleDot, Sparkles, Coins, Navigation, Share2, Zap } from 'lucide-react';
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
import { hasPeakPricing, getStartingRate } from '@/lib/peakPricing';
import { useTranslation } from 'react-i18next';
import PhotoGallery from '@/components/PhotoGallery';

import { SaduBand } from '@/components/SaduBand';

type ExtendedCamp = LegacyCamp & {
  images?: string[];
  coordinates?: { lat: number; lng: number };
  cancellationPolicy?: CancellationPolicy;
  listingType?: string;
  instantBook?: boolean;
  seatingCapacity?: number;
  beachfrontAccess?: boolean;
  shadeType?: string;
  viewType?: string;
  waterActivities?: string[];
  capacity?: number;
  ratingDistribution?: { 5: number; 4: number; 3: number; 2: number; 1: number };
};

interface TentDetail {
  id?: string;
  type?: string;
  furnished?: boolean;
  carpeted?: boolean;
  tv?: boolean;
  sofas?: boolean;
  teaSets?: boolean;
  pingPongTable?: boolean;
  foosballTable?: boolean;
  airHockeyTable?: boolean;
  volleyballField?: boolean;
  footballField?: boolean;
  description?: string;
}

export default function CampDetails() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const [camp, setCamp] = useState<ExtendedCamp | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [canReview, setCanReview] = useState(false);
  const [reviewBookingId, setReviewBookingId] = useState<string | null>(null);
  // Actual stay dates from the proving booking (Audit v4 H-3): reviews must
  // record when the stay happened, not when the review was written.
  const [reviewStayDates, setReviewStayDates] = useState<{ checkInDate: string; checkOutDate: string } | null>(null);

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
        const tents = ((foundCamp as unknown as { tents?: unknown[] }).tents || legacyCamp.tents || []) as LegacyCamp['tents'];
        
        console.log("DEBUG: legacyCamp checkInTime:", defaultCheckInTime);
        console.log("DEBUG: legacyCamp checkOutTime:", defaultCheckOutTime);
        console.log("DEBUG: listingType:", (legacyCamp as unknown as Record<string, unknown>).listingType);
        
        const rawCamp = foundCamp as unknown as {
          images?: string[];
          coordinates?: { lat: number; lng: number };
        };
        setCamp({
          ...legacyCamp,
          checkInTime: defaultCheckInTime,
          checkOutTime: defaultCheckOutTime,
          description: legacyCamp.description || 'Experience the magic of the Bahrain desert with our luxury camping facilities. Enjoy traditional Bedouin hospitality combined with modern comfort.',
          amenities,
          tents,
          images: rawCamp.images && rawCamp.images.length > 0
            ? rawCamp.images
            : legacyCamp.photo ? [legacyCamp.photo] : [],
          coordinates: rawCamp.coordinates,
        });
      } else {
        console.log('❌ Camp not found');
        toast.error(t('campDetails.notFound'));
      }
    } catch (error) {
      console.error('❌ Error loading camp:', error);
      toast.error(t('campDetails.loadCampFailed'));
    } finally {
      setLoading(false);
    }
  };

  const checkReviewEligibility = async () => {
    if (!camp || !user) return;

    try {
      const result = await canUserReview(user.uid, camp.id);
      setCanReview(result.canReview);
      setReviewBookingId(result.bookingId ?? null);
      setReviewStayDates(result.checkInDate
        ? { checkInDate: result.checkInDate, checkOutDate: result.checkOutDate || result.checkInDate }
        : null);
    } catch (error) {
      console.error('Error checking review eligibility:', error);
    }
  };

  const handleSubmitReview = async (reviewData: { rating: number; reviewText: string }) => {
    if (!camp || !user || !reviewBookingId) return;

    try {
      await createReview(
        {
          campId: camp.id,
          // Proof of stay: Firestore rules verify this booking belongs to the
          // caller, targets this camp, and represents a completed stay.
          bookingId: reviewBookingId,
          rating: reviewData.rating,
          reviewText: reviewData.reviewText,
          userName: user.displayName || user.email || 'Anonymous',
          userPhoto: user.photoURL,
          checkInDate: reviewStayDates?.checkInDate || new Date().toISOString(),
          checkOutDate: reviewStayDates?.checkOutDate || reviewStayDates?.checkInDate || new Date().toISOString(),
        },
        user.uid,
      );

      toast.success(t('campDetails.reviewSuccess'));
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

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: camp?.title || '', url }); } catch { /* cancelled */ }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        toast.success(t('campDetails.linkCopied'));
      } catch { toast.error('Could not copy link'); }
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
    if (lower.includes('umbrella') || lower.includes('shade')) return <Umbrella className="w-5 h-5" />;
    if (lower.includes('water') || lower.includes('beach') || lower.includes('sea')) return <Waves className="w-5 h-5" />;
    return <StarIcon className="w-5 h-5" />;
  };

  // Function to translate amenity names
  const translateAmenity = (amenity: string): string => {
    const translationKey = `amenityNames.${amenity}`;
    const translated = t(translationKey);
    return translated !== translationKey ? translated : amenity;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getPolicyDetails = (policy: CancellationPolicy | string | any) => {
    // Handle new policy structure
    if (typeof policy === 'object' && policy.type) {
      if (policy.type === 'full_refundable') {
        return {
          name: t('cancelSelector.fullRefundable.name'),
          icon: <ShieldCheck className="w-6 h-6 text-green-600" />,
          color: 'green',
          description: t('cancelSelector.fullRefundable.description'),
          details: [
            { 
              time: t('campDetails.policyDetails.time24Plus'),
              refund: t('campDetails.policyDetails.refund100'),
              color: 'green', 
              description: t('cancelSelector.fullRefundable.rule1')
            },
            { 
              time: t('campDetails.policyDetails.timeLess24'),
              refund: t('campDetails.policyDetails.refund0'),
              color: 'red', 
              description: t('cancelSelector.fullRefundable.rule2')
            }
          ],
          arboonPercentage: 0
        };
      } else if (policy.type === 'partial_refundable') {
        const arboon = policy.arboonPercentage || 20;
        return {
          name: t('cancelSelector.partialRefundable.name'),
          icon: <Coins className="w-6 h-6 text-accent" />,
          color: 'amber',
          description: t('cancelSelector.partialRefundable.description'),
          details: [
            { 
              time: t('campDetails.policyDetails.time48Plus'),
              refund: `${100 - arboon}%`,
              color: 'green', 
              description: t('cancelSelector.partialRefundable.rule1')
            },
            { 
              time: t('campDetails.policyDetails.time2448'),
              refund: `${50 - arboon}%`,
              color: 'amber', 
              description: t('cancelSelector.partialRefundable.rule2')
            },
            { 
              time: t('campDetails.policyDetails.timeLess24'),
              refund: '0%',
              color: 'red', 
              description: t('cancelSelector.partialRefundable.rule3')
            }
          ],
          arboonPercentage: arboon
        };
      }
    }
    
    // Handle legacy string format (backward compatibility)
    const legacyPolicy = typeof policy === 'string' ? policy : 'moderate';
    switch (legacyPolicy) {
      case 'flexible':
        return {
          name: t('campDetails.policy.flexible.name'),
          icon: <ShieldCheck className="w-6 h-6 text-green-600" />,
          color: 'green',
          description: t('campDetails.policy.flexible.description'),
          details: [
            { 
              time: t('campDetails.policyDetails.time24Plus'),
              refund: '100%',
              color: 'green', 
              description: t('campDetails.policy.flexible.detail1Note')
            },
            { 
              time: t('campDetails.policyDetails.timeLess24'),
              refund: '0%',
              color: 'red', 
              description: t('campDetails.policy.flexible.detail2Note')
            }
          ],
          arboonPercentage: 0
        };
      case 'strict':
        return {
          name: t('campDetails.policy.strict.name'),
          icon: <XCircle className="w-6 h-6 text-primary" />,
          color: 'amber',
          description: t('campDetails.policy.strict.description'),
          details: [
            { 
              time: t('campDetails.policyDetails.time7Plus'),
              refund: '50%',
              color: 'green', 
              description: t('campDetails.policy.strict.detail1Note')
            },
            { 
              time: t('campDetails.policyDetails.timeLess7'),
              refund: '0%',
              color: 'red', 
              description: t('campDetails.policy.strict.detail2Note')
            }
          ],
          arboonPercentage: 0
        };
      default:
        return {
          name: t('campDetails.policy.moderate.name'),
          icon: <ShieldCheck className="w-6 h-6 text-blue-600" />,
          color: 'blue',
          description: t('campDetails.policy.moderate.description'),
          details: [
            { 
              time: t('campDetails.policyDetails.time48Plus'),
              refund: '50%',
              color: 'green', 
              description: t('campDetails.policy.moderate.detail1Note')
            },
            { 
              time: t('campDetails.policyDetails.timeLess24'),
              refund: '0%',
              color: 'red', 
              description: t('campDetails.policy.moderate.detail2Note')
            }
          ],
          arboonPercentage: 0
        };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-50" />
        <div className="text-center relative z-10">
          <CampfireLoader size="lg" className="mb-4" />
          <p className="text-muted-foreground font-medium font-sans tracking-wide">{t('campDetails.loading')}</p>
        </div>
      </div>
    );
  }

  if (!camp) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-50" />
        <Card className="bg-card/60 backdrop-blur-md border border-border/50 p-8 text-center shadow-[0_8px_30px_rgba(0,0,0,0.5)] max-w-md w-full relative z-10">
          <h2 className="text-2xl font-bold text-foreground mb-4 font-sans">{t('campDetails.notFound')}</h2>
          <Button
            onClick={() => navigate('/')}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-[0_0_15px_rgba(212,175,55,0.2)] w-full"
          >
            {t('campDetails.backToSearch')}
          </Button>
        </Card>
      </div>
    );
  }

  // Determine listing type
  const isKashta = camp.listingType === 'kashta';
  
  // Calculate total tents (only for camps)
  const totalTents = !isKashta ? (
    (camp.tentConfiguration?.large || 0) + 
    (camp.tentConfiguration?.small || 0) + 
    (camp.tentConfiguration?.entertainment || 0)
  ) : 0;

  const hasReviews = camp.reviewCount && camp.reviewCount > 0;
  const tentDetails = (camp as unknown as { tents?: TentDetail[] }).tents || [];

  // Only allow booking for active listings (pending/inactive should be view-only)
  const isActive = !camp.status || camp.status === 'active';
  
  // Get check-in/check-out times with defaults
  const checkInTime = camp?.checkInTime || '08:00 AM';
  const checkOutTime = camp?.checkOutTime || '03:00 AM';

  // Get cancellation policy with backward compatibility
  const cancellationPolicy = camp.cancellationPolicy || 
    (camp.refundPolicy === 'refundable' ? { type: 'full_refundable' as const } : 
     camp.refundPolicy === 'non-refundable' ? { type: 'partial_refundable' as const, arboonPercentage: 50 } : 
     { type: 'full_refundable' as const });
  
  const policyDetails = getPolicyDetails(cancellationPolicy);

  // Get kashta-specific fields
  const seatingCapacity = camp.seatingCapacity || 0;
  const beachfrontAccess = camp.beachfrontAccess || false;
  const shadeType = camp.shadeType;
  const viewType = camp.viewType;
  const waterActivities = camp.waterActivities || [];

  // Gallery images
  const galleryImages = camp.images && camp.images.length > 0
    ? camp.images
    : camp.photo ? [camp.photo] : [];

  // Map coordinates
  const campCoords = camp.coordinates;

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Hero Gallery */}
      <div className="relative border-b border-border/50">
        <PhotoGallery images={galleryImages} altBase={camp.title} isRTL={isRTL} />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 pointer-events-none" />

        <Button
          onClick={handleBack}
          variant="secondary"
          className={`absolute top-6 ${isRTL ? 'right-6' : 'left-6'} bg-background/50 backdrop-blur-md border border-border/80 hover:bg-background text-foreground shadow-[0_0_15px_rgba(0,0,0,0.5)] font-medium transition-all z-10`}
        >
          <ArrowLeft className={`w-4 h-4 ${isRTL ? 'ml-2 rotate-180' : 'mr-2'} text-primary`} />
          {t('campDetails.back')}
        </Button>

        <Button
          onClick={handleShare}
          variant="secondary"
          size="icon"
          className={`absolute top-6 ${isRTL ? 'left-6' : 'right-6'} bg-background/50 backdrop-blur-md border border-border/80 hover:bg-background text-foreground shadow-[0_0_15px_rgba(0,0,0,0.5)] transition-all z-10`}
          aria-label={t('campDetails.share')}
        >
          <Share2 className="w-4 h-4" />
        </Button>

        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 z-10 pointer-events-none">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-3 mb-4">
              <Badge className={`backdrop-blur-md font-semibold px-4 py-1.5 pointer-events-auto ${
                isKashta 
                  ? 'bg-accent/20 text-accent border border-accent/30 shadow-[0_0_10px_rgba(23,126,137,0.2)]' 
                  : 'bg-primary/20 text-primary border border-primary/30 shadow-[0_0_10px_rgba(240,160,60,0.2)]'
              }`}>
                {isKashta ? (
                  <>
                    <Waves className={`w-4 h-4 ${isRTL ? 'ml-1.5' : 'mr-1.5'}`} />
                    {t('listingType.kashta.badge')}
                  </>
                ) : (
                  <>
                    <Tent className={`w-4 h-4 ${isRTL ? 'ml-1.5' : 'mr-1.5'}`} />
                    {t('listingType.camp.badge')}
                  </>
                )}
              </Badge>
              {camp?.instantBook && (
                <Badge className="backdrop-blur-md font-semibold px-4 py-1.5 pointer-events-auto bg-primary/20 text-primary border border-primary/30 shadow-[0_0_10px_rgba(240,160,60,0.2)]">
                  <Zap className={`w-4 h-4 ${isRTL ? 'ml-1.5' : 'mr-1.5'} fill-primary`} />
                  {t('campDetails.instantBook')}
                </Badge>
              )}
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-4 drop-shadow-2xl font-sans tracking-wide">
              {camp.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-muted-foreground font-light">
              <div className="flex items-center gap-2 bg-background/50 backdrop-blur-md border border-border/50 px-4 py-2 rounded-full">
                <MapPin className="w-4 h-4 text-primary" />
                <span className="text-sm">{camp.location}</span>
              </div>
              {camp.averageRating && camp.averageRating > 0 && (
                <div className="bg-background/50 backdrop-blur-md border border-border/50 px-4 py-2 rounded-full">
                  <RatingStars rating={camp.averageRating} size="sm" showValue />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <SaduBand />

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-8 sm:py-12 pb-32">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {!isActive && (
              <Card className="bg-destructive/10 border border-destructive/30 p-6 text-destructive font-medium rounded-2xl">
                {t('reserve.bookingUnavailableDesc', { status: camp.status || 'pending' })}
              </Card>
            )}
            
            {/* Overview */}
            <Card className="bg-card/40 backdrop-blur-sm border border-border/50 p-8 shadow-lg rounded-2xl">
              <h2 className="text-2xl font-bold text-foreground mb-6 font-sans tracking-normal">{t('campDetails.overview')}</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {/* Capacity */}
                {(isKashta ? seatingCapacity : camp.maxGuests) && (
                  <div className="flex items-center gap-3 p-4 bg-background/50 rounded-lg border border-border/80 group hover:border-primary/50 transition-colors">
                    <Users className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
                    <div>
                      <p className="text-2xl font-bold text-foreground font-sans tracking-tight">
                        {isKashta ? seatingCapacity : camp.maxGuests}
                      </p>
                      <p className="text-xs text-muted-foreground font-light uppercase tracking-widest">
                        {isKashta ? t('listingType.kashta.seatingCapacity') : t('campDetails.maxGuests')}
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Tents (Camp only) */}
                {!isKashta && totalTents > 0 && (
                  <div className="flex items-center gap-3 p-4 bg-background/50 rounded-lg border border-border/80 group hover:border-primary/50 transition-colors">
                    <Tent className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
                    <div>
                      <p className="text-2xl font-bold text-foreground font-sans tracking-tight">{totalTents}</p>
                      <p className="text-xs text-muted-foreground font-light uppercase tracking-widest">{t('campDetails.totalTents')}</p>
                    </div>
                  </div>
                )}
                
                {/* Beachfront Access (Kashta only) */}
                {isKashta && (
                  <div className="flex items-center gap-3 p-4 bg-background/50 rounded-lg border border-border/80 group hover:border-primary/50 transition-colors">
                    <Waves className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
                    <div>
                      <p className="text-2xl font-bold text-foreground font-sans tracking-tight">{beachfrontAccess ? '✓' : '✗'}</p>
                      <p className="text-xs text-muted-foreground font-light uppercase tracking-widest">{t('listingType.kashta.beachfrontAccess')}</p>
                    </div>
                  </div>
                )}
                
                {/* View Type (Kashta only) */}
                {isKashta && viewType && (
                  <div className="flex items-center gap-3 p-4 bg-background/50 rounded-lg border border-border/80 group hover:border-primary/50 transition-colors">
                    <Eye className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
                    <div>
                      <p className="text-lg font-bold text-foreground capitalize font-sans tracking-tight">{viewType}</p>
                      <p className="text-xs text-muted-foreground font-light uppercase tracking-widest">{t('listingType.kashta.viewType')}</p>
                    </div>
                  </div>
                )}
                
                {/* Shade Type (Kashta only) */}
                {isKashta && shadeType && (
                  <div className="flex items-center gap-3 p-4 bg-background/50 rounded-lg border border-border/80 group hover:border-primary/50 transition-colors">
                    <Umbrella className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
                    <div>
                      <p className="text-lg font-bold text-foreground capitalize font-sans tracking-tight">{shadeType}</p>
                      <p className="text-xs text-muted-foreground font-light uppercase tracking-widest">{t('listingType.kashta.shadeType')}</p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Hours */}
              <div className="mt-6 p-5 bg-primary/5 border border-primary/20 rounded-2xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-bold text-foreground font-sans tracking-wide">
                      {isKashta ? t('listingType.kashta.hours') : t('campDetails.campHours')}
                    </h3>
                  </div>
                  <div className="space-y-1">
                    <p className="text-foreground font-medium">
                      {t('campDetails.checkIn')} <span className="text-primary tracking-wide">{checkInTime}</span>
                    </p>
                    <p className="text-foreground font-medium">
                      {t('campDetails.checkOut')} <span className="text-primary tracking-wide">{checkOutTime}</span> <span className="text-sm text-muted-foreground font-light">{t('campDetails.nextDay')}</span>
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground mt-3 font-light">
                    {t('campDetails.fullDayHint')}
                  </p>
                </div>
              </div>
            </Card>

            {/* Description */}
            <Card className="bg-card/40 backdrop-blur-sm border border-border/50 p-8 shadow-lg rounded-2xl">
              <h2 className="text-2xl font-bold text-foreground mb-4 font-sans tracking-normal">{t('campDetails.about')}</h2>
              <p className="text-muted-foreground leading-relaxed font-light">{camp.description}</p>
            </Card>

            {/* Water Activities (Kashta only) */}
            {isKashta && waterActivities.length > 0 && (
              <Card className="bg-card/40 backdrop-blur-sm border border-border/50 p-8 shadow-lg rounded-2xl">
                <h2 className="text-2xl font-bold text-foreground mb-6 font-sans tracking-normal">{t('listingType.kashta.waterActivities')}</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {waterActivities.map((activity, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 bg-background/50 rounded-lg border border-border/80 group hover:border-primary/50 transition-colors"
                    >
                      <Waves className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
                      <span className="text-sm font-medium text-foreground font-sans tracking-wide">{activity}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Cancellation Policy - UPDATED */}
            <Card className="bg-card/40 backdrop-blur-sm border border-border/50 p-8 shadow-lg rounded-2xl">
              <div className="flex items-center gap-3 mb-6">
                {policyDetails.icon}
                <h2 className="text-2xl font-bold text-foreground font-sans tracking-normal">{t('campDetails.cancellationPolicy')}</h2>
              </div>
              
              <div className="mb-6">
                <Badge 
                  className={`text-base px-5 py-2 font-sans tracking-wide ${
                    policyDetails.color === 'green' 
                      ? 'bg-green-500/10 text-green-400 border-green-500/30' 
                      : policyDetails.color === 'amber'
                      ? 'bg-primary/10 text-primary border-primary/30'
                      : policyDetails.color === 'blue'
                      ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                      : 'bg-primary/10 text-primary border-primary/30'
                  } border`}
                >
                  {policyDetails.name}
                </Badge>
              </div>

              <p className="text-muted-foreground font-light mb-6 leading-relaxed">
                {policyDetails.description}
              </p>

              {/* Show عربون info if applicable */}
              {policyDetails.arboonPercentage > 0 && (
                <div className="mb-6 p-5 bg-primary/5 border border-primary/20 rounded-2xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Coins className="w-5 h-5 text-primary" />
                    <h3 className="font-bold text-foreground font-sans tracking-wide">
                      {t('cancelSelector.partialRefundable.arboonLabel')}
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground font-light">
                    <span className="font-bold text-primary">{policyDetails.arboonPercentage}%</span> {t('cancelSelector.partialRefundable.arboonHelper')}
                  </p>
                </div>
              )}

              <div className="space-y-4">
                {policyDetails.details.map((detail, index) => (
                  <div 
                    key={index}
                    className={`flex items-start gap-3 p-4 rounded-2xl border ${
                      detail.color === 'green' 
                        ? 'bg-green-500/10 border-green-500/20' 
                        : detail.color === 'amber'
                        ? 'bg-primary/5 border-primary/20'
                        : 'bg-red-500/10 border-red-500/20'
                    }`}
                  >
                    {detail.color === 'green' ? (
                      <Check className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                    ) : detail.color === 'amber' ? (
                      <Clock className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                    )}
                    <div>
                      <p className="font-semibold text-foreground">{detail.time}: {detail.refund} {t('common.refund')}</p>
                      <p className="text-sm text-muted-foreground mt-1 font-light">{detail.description}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              <p className="text-sm text-muted-foreground font-light pt-6 border-t border-border/50 mt-6">
                {t('campDetails.refundNote')}
              </p>
            </Card>

            {/* Amenities — grouped by category */}
            <Card className="bg-card/40 backdrop-blur-sm border border-border/50 p-8 shadow-lg rounded-2xl">
              <h2 className="text-2xl font-bold text-foreground mb-6 font-sans tracking-normal">{t('campDetails.amenities')}</h2>
              {camp.amenities && camp.amenities.length > 0 ? (() => {
                type AmenityGroup = { label: string; items: string[] };
                const groupDefs: { key: string; label: string; keywords: string[] }[] = [
                  { key: 'connectivity', label: t('campDetails.amenityGroups.connectivity', 'Connectivity'), keywords: ['wifi', 'internet', 'hotspot', 'signal'] },
                  { key: 'food', label: t('campDetails.amenityGroups.food', 'Food & Dining'), keywords: ['meal', 'food', 'dining', 'kitchen', 'bbq', 'grill', 'breakfast', 'coffee', 'tea', 'restaurant'] },
                  { key: 'comfort', label: t('campDetails.amenityGroups.comfort', 'Comfort & Climate'), keywords: ['air', ' ac ', 'conditioning', 'heating', 'shade', 'umbrella', 'cooling', 'bathroom', 'shower', 'toilet'] },
                  { key: 'water', label: t('campDetails.amenityGroups.water', 'Water & Outdoors'), keywords: ['water', 'beach', 'sea', 'pool', 'lake', 'outdoor', 'bonfire', 'fire', 'parking'] },
                ];
                const grouped: Record<string, AmenityGroup> = {};
                groupDefs.forEach(g => { grouped[g.key] = { label: g.label, items: [] }; });
                grouped['other'] = { label: t('campDetails.amenityGroups.other', 'Other Amenities'), items: [] };

                camp.amenities.forEach((amenity) => {
                  const lower = ` ${amenity.toLowerCase()} `;
                  let placed = false;
                  for (const g of groupDefs) {
                    if (g.keywords.some(k => lower.includes(k))) {
                      grouped[g.key].items.push(amenity);
                      placed = true;
                      break;
                    }
                  }
                  if (!placed) grouped['other'].items.push(amenity);
                });

                const allGroups = [...groupDefs.map(g => g.key), 'other'].filter(k => grouped[k].items.length > 0);
                return (
                  <div className="space-y-6">
                    {allGroups.map(key => (
                      <div key={key}>
                        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">{grouped[key].label}</p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {grouped[key].items.map((amenity, i) => (
                            <div key={i} className="flex items-center gap-3 p-3 bg-background/50 rounded-xl border border-border/60 group hover:border-primary/40 transition-colors">
                              <span className="text-primary shrink-0 group-hover:scale-110 transition-transform">{getAmenityIcon(amenity)}</span>
                              <span className="text-sm font-medium text-foreground leading-snug">{translateAmenity(amenity)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })() : (
                <p className="text-muted-foreground font-light">{t('campDetails.notFound')}</p>
              )}
            </Card>

            {/* Tent Details (Camp only) */}
            {!isKashta && tentDetails.length > 0 && (
              <Card className="bg-card/40 backdrop-blur-sm border border-border/50 shadow-lg rounded-2xl overflow-hidden">
                {/* Header with gradient background */}
                <div className="bg-primary/10 border-b border-primary/20 p-8">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-4 bg-background/80 backdrop-blur-md rounded-2xl border border-primary/20">
                        <Tent className="w-8 h-8 text-primary" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-foreground font-sans tracking-normal">{t('campDetails.tentDetails', { defaultValue: 'Tent Details' })}</h2>
                        <p className="text-muted-foreground text-sm font-light mt-1">{t('common.exploreAccommodations')}</p>
                      </div>
                    </div>
                    <Badge className="bg-background/80 backdrop-blur-md text-primary border border-primary/20 text-base px-5 py-2 font-bold font-sans tracking-wide shadow-sm">
                      {tentDetails.length} {tentDetails.length === 1 ? t('common.tent') : t('common.tents')}
                    </Badge>
                  </div>
                </div>

                {/* Tent Cards */}
                <div className="p-8 space-y-6">
                  {tentDetails.map((tent: TentDetail, idx: number) => {
                    const features: { name: string; icon: ReactElement }[] = [];
                    if (tent.furnished) features.push({ name: t('campDetails.tentFeatures.furnished', { defaultValue: 'Furnished' }), icon: <Home className="w-4 h-4" /> });
                    if (tent.carpeted) features.push({ name: t('campDetails.tentFeatures.carpeted', { defaultValue: 'Carpeted' }), icon: <Sparkles className="w-4 h-4" /> });
                    if (tent.tv) features.push({ name: t('campDetails.tentFeatures.tv', { defaultValue: 'TV' }), icon: <Tv className="w-4 h-4" /> });
                    if (tent.sofas) features.push({ name: t('campDetails.tentFeatures.sofas', { defaultValue: 'Sofas' }), icon: <Sofa className="w-4 h-4" /> });
                    if (tent.teaSets) features.push({ name: t('campDetails.tentFeatures.teaSets', { defaultValue: 'Tea Sets' }), icon: <Coffee className="w-4 h-4" /> });
                    if (tent.pingPongTable) features.push({ name: t('campDetails.tentFeatures.pingPong', { defaultValue: 'Ping Pong' }), icon: <Table2 className="w-4 h-4" /> });
                    if (tent.foosballTable) features.push({ name: t('campDetails.tentFeatures.foosball', { defaultValue: 'Foosball' }), icon: <Gamepad2 className="w-4 h-4" /> });
                    if (tent.airHockeyTable) features.push({ name: t('campDetails.tentFeatures.airHockey', { defaultValue: 'Air Hockey' }), icon: <Gamepad2 className="w-4 h-4" /> });
                    if (tent.volleyballField) features.push({ name: t('campDetails.tentFeatures.volleyball', { defaultValue: 'Volleyball' }), icon: <CircleDot className="w-4 h-4" /> });
                    if (tent.footballField) features.push({ name: t('campDetails.tentFeatures.football', { defaultValue: 'Football' }), icon: <CircleDot className="w-4 h-4" /> });

                    const typeLabel =
                      tent.type === 'large'
                        ? t('campDetails.tentTypes.large', { defaultValue: 'Large Tent' })
                        : tent.type === 'small'
                        ? t('campDetails.tentTypes.small', { defaultValue: 'Small Tent' })
                        : tent.type === 'entertainment'
                        ? t('campDetails.tentTypes.entertainment', { defaultValue: 'Entertainment Tent' })
                        : t('campDetails.tentTypes.generic', { defaultValue: 'Tent' });

                    const tentTypeColor = 
                      tent.type === 'large' ? 'bg-primary/20 text-primary border-primary/30' :
                      tent.type === 'small' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                      tent.type === 'entertainment' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' :
                      'bg-secondary text-foreground border-border';

                    return (
                      <div
                        key={tent.id || idx}
                        className="group relative overflow-hidden rounded-2xl border border-border/50 bg-background/50 hover:shadow-[0_8px_30px_rgba(0,0,0,0.5)] hover:border-primary/30 transition-all duration-300"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        
                        <div className="relative p-6">
                          {/* Header */}
                          <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-4">
                              <div className={`p-3 ${tentTypeColor} rounded-2xl border`}>
                                <Tent className="w-6 h-6" />
                              </div>
                              <div>
                                <h3 className="text-xl font-bold text-foreground font-sans tracking-wide">
                                  {typeLabel} #{idx + 1}
                                </h3>
                                <p className="text-sm text-muted-foreground font-light mt-1">
                                  {features.length > 0 
                                    ? `${features.length} ${features.length === 1 ? t('common.premiumFeature') : t('common.premiumFeatures')}` 
                                    : t('common.standardConfiguration')}
                                </p>
                              </div>
                            </div>
                            {features.length > 0 && (
                              <Badge className="bg-primary/20 text-primary border border-primary/30 px-4 py-1.5 font-bold shadow-sm tracking-wide font-sans">
                                <Sparkles className={`w-3.5 h-3.5 ${isRTL ? 'ml-1.5' : 'mr-1.5'}`} />
                                Premium
                              </Badge>
                            )}
                          </div>

                          {/* Features Grid */}
                          {features.length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
                              {features.map((feature, featureIdx) => (
                                <div
                                  key={featureIdx}
                                  className="flex items-center gap-2 p-3 bg-card/60 backdrop-blur-sm rounded-2xl border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 group/feature"
                                >
                                  <div className="text-primary group-hover/feature:scale-110 transition-transform duration-200">
                                    {feature.icon}
                                  </div>
                                  <span className="text-xs font-semibold text-foreground tracking-wide">
                                    {feature.name}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Description */}
                          {tent.description && (
                            <div className="mt-4 p-4 bg-card/40 backdrop-blur-sm rounded-2xl border border-border/50">
                              <p className="text-sm text-muted-foreground leading-relaxed font-light">
                                {tent.description}
                              </p>
                            </div>
                          )}

                          {/* Empty state */}
                          {!tent.description && features.length === 0 && (
                            <div className="p-6 bg-secondary/30 rounded-2xl border border-dashed border-border/50">
                              <p className="text-sm text-muted-foreground text-center font-light">
                                {t('campDetails.tentFeatures.noDetails', { defaultValue: 'No details provided for this tent.' })}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* Map Section */}
            {(campCoords || camp.location) && (
              <Card className="bg-card/40 backdrop-blur-sm border border-border/50 p-8 shadow-lg rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <MapPin className="w-6 h-6 text-primary" />
                    <h2 className="text-2xl font-bold text-foreground font-sans tracking-normal">{t('campDetails.location')}</h2>
                  </div>
                  {campCoords && (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${campCoords.lat},${campCoords.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors px-4 py-2 rounded-xl font-semibold text-sm"
                    >
                      <Navigation className={`w-4 h-4 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                      {t('campDetails.getDirections')}
                    </a>
                  )}
                </div>
                <div className="rounded-2xl overflow-hidden border border-border/50 h-64 sm:h-80">
                  {campCoords ? (
                    <iframe
                      title={camp.title}
                      width="100%"
                      height="100%"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      src={`https://www.google.com/maps?q=${campCoords.lat},${campCoords.lng}&z=14&output=embed`}
                      className="border-0"
                    />
                  ) : (
                    <iframe
                      title={camp.title}
                      width="100%"
                      height="100%"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      src={`https://www.google.com/maps?q=${encodeURIComponent(camp.location)}&output=embed`}
                      className="border-0"
                    />
                  )}
                </div>
                {!campCoords && (
                  <p className="text-sm text-muted-foreground mt-3 font-light">
                    {t('campDetails.mapApproximate')}
                  </p>
                )}
              </Card>
            )}

            {/* Meet your host */}
            {(camp as any).hostId && (camp as any).hostName && (
              <Card className="bg-card/60 backdrop-blur-md border border-border/50 p-6 rounded-2xl">
                <h2 className="text-xl font-bold font-sans text-foreground mb-4">{t('campDetails.meetHost')}</h2>
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                    <Users className="w-7 h-7 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-foreground text-lg">{(camp as any).hostName}</p>
                    <p className="text-sm text-muted-foreground">{t('campDetails.hostMemberSince')}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/host-profile/${(camp as any).hostId}`)}
                    className="border border-primary/50 text-primary hover:bg-primary/10 font-semibold bg-background/50 shrink-0"
                  >
                    {t('campDetails.hostViewProfile')}
                  </Button>
                </div>
              </Card>
            )}

            {/* Reviews Section */}
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-foreground font-sans tracking-normal">{t('campDetails.reviews')}</h2>
                {user && canReview && (
                  <Button
                    onClick={() => setShowReviewForm(true)}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-[0_0_15px_rgba(212,175,55,0.2)]"
                  >
                    {t('campDetails.writeReview')}
                  </Button>
                )}
                {!user && (
                  <Button
                    onClick={() => navigate('/signin')}
                    variant="outline"
                    className="border border-primary/50 text-primary hover:bg-primary/10 font-semibold bg-background/50"
                  >
                    {t('campDetails.signInReview')}
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
            <Card className="bg-card/60 backdrop-blur-md border border-border/50 p-8 sticky top-24 shadow-[0_8px_30px_rgba(0,0,0,0.5)] rounded-2xl">
              <div className="mb-8">
                <div className="flex items-baseline gap-2 mb-2">
                  {hasPeakPricing(camp) && (
                    <span className="text-sm text-muted-foreground font-light lowercase">{t('common.from')}</span>
                  )}
                  <span className="text-5xl font-bold text-primary font-sans tracking-tighter">{hasPeakPricing(camp) ? getStartingRate(camp) : camp.price}</span>
                  <span className="text-xl text-muted-foreground font-light">BD</span>
                </div>
                <p className="text-sm text-muted-foreground font-light">{t('campDetails.pricePerDay')}</p>
                <p className="text-xs text-muted-foreground/70 mt-1">{t('campDetails.serviceFeeNote')}</p>
                {isKashta && (
                  <p className="text-xs text-teal-400 bg-teal-950/30 border border-teal-800/40 rounded-xl px-3 py-1.5 mt-2">
                    {t('campDetails.kashtaDayRentalNote')}
                  </p>
                )}
              </div>

              {(isKashta ? seatingCapacity : camp.maxGuests) && (
                <div className="mb-6 p-4 bg-background/50 rounded-2xl border border-border/80 text-center">
                  <p className="text-sm text-foreground font-medium tracking-wide">
                    <Users className={`w-4 h-4 inline ${isRTL ? 'ml-2' : 'mr-2'} text-primary`} />
                    {isKashta 
                      ? t('listingType.kashta.accommodates', { count: seatingCapacity })
                      : t('campDetails.accommodates', { count: camp.maxGuests })
                    }
                  </p>
                </div>
              )}

              <Button
                onClick={handleReserve}
                disabled={!isActive}
                className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:shadow-[0_0_30px_rgba(212,175,55,0.5)] mb-6 disabled:opacity-50 transition-all font-sans tracking-wide rounded-2xl"
              >
                {isActive ? t('campDetails.reserveNow') : t('campDetails.pendingApproval')}
              </Button>

              <div className="space-y-4 pt-6 border-t border-border/50">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground font-light">{t('common.instantConfirmation')}</span>
                  <span className="text-green-400 font-semibold">✓</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground font-light">{policyDetails.name} {t('campDetails.policyDetails.cancellation')}</span>
                  <span className={`font-semibold ${
                    policyDetails.color === 'green' ? 'text-green-400' : 
                    policyDetails.color === 'amber' ? 'text-primary' :
                    policyDetails.color === 'blue' ? 'text-blue-400' : 
                    'text-primary'
                  }`}>
                    ✓
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground font-light">{t('common.support247')}</span>
                  <span className="text-green-400 font-semibold">✓</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Review Form Dialog */}
      <Dialog open={showReviewForm} onOpenChange={setShowReviewForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border/50">
          <DialogHeader>
          <DialogTitle className="font-sans tracking-normal">{t('campDetails.reviewDialog')}</DialogTitle>
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
