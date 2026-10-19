import { CampfireLoader } from '@/components/CampfireLoader';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Calendar, MapPin, Users, X, Star, Tent, Banknote, MessageCircle, Flag, CheckCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getBookingsByUser, Booking, getCampById, Camp, canUserReview, createReview, getMyDisputes, type GuestDisputeStatus } from '@/lib/firestore';
import { getDepartureDate, getDepartureDateStr } from '@/lib/bookingDates';
import { toast } from 'sonner';
import ReviewForm from '@/components/ReviewForm';
import { CancellationDialog } from '@/components/CancellationDialog';
import { ReportIssueDialog } from '@/components/ReportIssueDialog';
import { MessagingDialog } from '@/components/MessagingDialog';
import { createPaymentSession, verifyBookingPayment } from '@/lib/payments';
import { useTranslation } from 'react-i18next';
import { PatternDunes } from '@/components/BackgroundPatterns';

interface BookingWithCamp extends Booking {
  camp?: Camp;
  eligibleForReview?: boolean;
  /** Tap charge ID — may be present on bookings created with online payment. */
  tapChargeId?: string;
}

export default function Bookings() {
  const navigate = useNavigate();
  const { user, userData, loading } = useAuth();
  const [bookings, setBookings] = useState<BookingWithCamp[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [bookingToCancel, setBookingToCancel] = useState<BookingWithCamp | null>(null);
  const [showCancellationDialog, setShowCancellationDialog] = useState(false);
  const [reviewingBooking, setReviewingBooking] = useState<BookingWithCamp | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [payingBookingId, setPayingBookingId] = useState<string | null>(null);
  const [verifyingBookingId, setVerifyingBookingId] = useState<string | null>(null);
  // Per-booking verification outcome: 'failed' means terminal failure (Pay Now re-exposed),
  // 'inflight' means the charge is still being processed (Pay Now stays hidden).
  // Using a single Map keeps the two states mutually exclusive.
  const [verifyOutcome, setVerifyOutcome] = useState<Map<string, 'inflight' | 'failed'>>(new Map());
  const [viewMode, setViewMode] = useState<'current' | 'past' | 'cancelled'>('current');
  const [messagingBooking, setMessagingBooking] = useState<BookingWithCamp | null>(null);
  const [reportingBooking, setReportingBooking] = useState<BookingWithCamp | null>(null);
  const [myDisputes, setMyDisputes] = useState<Map<string, GuestDisputeStatus>>(new Map());
  const { t, i18n } = useTranslation();

  // Load the guest's own dispute reports so resolved ones can be surfaced.
  useEffect(() => {
    if (!user) return;
    getMyDisputes().then(list => {
      const map = new Map<string, GuestDisputeStatus>();
      // Keep the most recent dispute per booking (list is createdAt-desc).
      for (const d of list) {
        if (!map.has(d.bookingId)) map.set(d.bookingId, d);
      }
      setMyDisputes(map);
    }).catch(() => {});
  }, [user]);

  useEffect(() => {
    console.log('=== BOOKINGS PAGE ===');
    console.log('Auth loading:', loading);
    console.log('User:', user);
    console.log('User data:', userData);

    if (loading) return;

    if (!user || !userData) {
      console.log('❌ No user available');
      setLoadingBookings(false);
      return;
    }

    loadBookings();
  }, [user, userData, loading]);

  const loadBookings = async () => {
    if (!user) {
      console.log('❌ No user available for loading bookings');
      return;
    }

    try {
      console.log('=== LOADING BOOKINGS ===');
      console.log('Fetching bookings for user ID:', user.uid);
      setLoadingBookings(true);

      const userBookings = await getBookingsByUser(user.uid);
      console.log('✅ Successfully loaded bookings:', userBookings);
      
      // Keep cancelled bookings so guests can track refund status on them —
      // they are shown under the dedicated "Cancelled" view.
      const activeBookings = userBookings;
      
      // Fetch camp details and check review eligibility for each active booking
      const bookingsWithCamps = await Promise.all(
        activeBookings.map(async (booking) => {
          try {
            const camp = await getCampById(booking.campId);
            
            // Check if booking is eligible for review — use the real
            // departure date (checkOutDate equals checkInDate by convention).
            const departure = getDepartureDate(booking);
            const today = new Date();
            const isCompleted = departure < today && booking.status !== 'cancelled';
            
            let eligibleForReview = false;
            if (isCompleted && !booking.reviewId) {
              // FIXED: canUserReview only takes 2 parameters (userId, campId)
              const reviewEligibility = await canUserReview(user.uid, booking.campId);
              eligibleForReview = reviewEligibility.canReview;
            }
            
            return { 
              ...booking, 
              camp: camp || undefined,
              eligibleForReview
            };
          } catch (error) {
            console.error(`Failed to load camp ${booking.campId}:`, error);
            return { ...booking, camp: undefined, eligibleForReview: false };
          }
        })
      );
      
      setBookings(bookingsWithCamps);

      // Clear stale pending/failed notices for bookings that are now paid
      setVerifyOutcome(prev => {
        if (prev.size === 0) return prev;
        const next = new Map(prev);
        for (const b of bookingsWithCamps) {
          if (b.paymentStatus === 'paid') next.delete(b.id);
        }
        return next.size === prev.size ? prev : next;
      });
    } catch (error) {
      console.error('❌ Error loading bookings:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to load your bookings: ${errorMessage}`);
    } finally {
      setLoadingBookings(false);
    }
  };

  const handleCancelClick = (booking: BookingWithCamp) => {
    setBookingToCancel(booking);
    setShowCancellationDialog(true);
  };

  const handleCancellationComplete = () => {
    // Reload bookings to show updated status (cancelled bookings will be filtered out)
    loadBookings();
    setBookingToCancel(null);
  };

  const handleViewCamp = (campId: string) => {
    navigate(`/camp/${campId}`, {
      state: { from: '/bookings' }
    });
  };

  const handleWriteReview = (booking: BookingWithCamp) => {
    setReviewingBooking(booking);
    setShowReviewForm(true);
  };

  const handleSubmitReview = async (reviewData: { rating: number; reviewText: string }) => {
    if (!reviewingBooking || !user) return;

    try {
      await createReview(
        {
          campId: reviewingBooking.campId,
          bookingId: reviewingBooking.id,
          rating: reviewData.rating,
          reviewText: reviewData.reviewText,
          userName: user.displayName || user.email || 'Anonymous',
          userPhoto: user.photoURL,
          checkInDate: reviewingBooking.checkInDate,
          checkOutDate: getDepartureDateStr(reviewingBooking)
        },
        user.uid
      );

      toast.success('Review submitted successfully!');
      setShowReviewForm(false);
      setReviewingBooking(null);
      
      // Reload bookings to update review status
      loadBookings();
    } catch (error) {
      console.error('Error submitting review:', error);
      throw error;
    }
  };

  const handleVerifyPayment = async (booking: BookingWithCamp) => {
    if (!booking.tapChargeId) return;
    setVerifyingBookingId(booking.id);
    try {
      const result = await verifyBookingPayment(booking.id, booking.tapChargeId);
      if (!result.checked) {
        toast.error(t('bookingsUser.verifyPaymentError'));
      } else if (result.settled) {
        toast.success(t('bookingsUser.verifyPaymentSuccess'));
        setVerifyOutcome(prev => { const m = new Map(prev); m.delete(booking.id); return m; });
        loadBookings();
      } else {
        // Block Pay Now only for known in-flight Tap statuses. Every other
        // status (FAILED, CANCELLED, VOID, DECLINED, RESTRICTED, and any
        // future Tap status the server doesn't explicitly list) is treated as
        // terminal — the server will create a fresh charge when the guest
        // retries, so it is safe to re-expose Pay Now.
        const inFlightStatuses = new Set(['INITIATED', 'AUTHORIZED', 'CAPTURED']);
        const statusUpper = result.status ? result.status.toUpperCase() : '';
        if (!inFlightStatuses.has(statusUpper)) {
          setVerifyOutcome(prev => new Map(prev).set(booking.id, 'failed'));
        } else {
          setVerifyOutcome(prev => new Map(prev).set(booking.id, 'inflight'));
        }
        toast.info(t('bookingsUser.verifyPaymentPending'));
      }
    } catch {
      toast.error(t('bookingsUser.verifyPaymentError'));
    } finally {
      setVerifyingBookingId(null);
    }
  };

  const handlePayPending = async (booking: BookingWithCamp) => {
    if (!user) return;
    setPayingBookingId(booking.id);

    try {
      const redirectUrl =
        import.meta.env.VITE_PAYMENT_REDIRECT_URL ||
        `${window.location.origin}${import.meta.env.BASE_URL}payment/success?bookingId=${booking.id}`;

      const session = await createPaymentSession({
        amount: booking.totalPrice,
        currency: 'BHD',
        bookingId: booking.id,
        customer: {
          name: userData?.displayName || user.displayName || user.email || 'Guest',
          email: user.email || undefined,
          phone: (booking as { userPhone?: string }).userPhone || undefined,
        },
        redirectUrl,
      });

      if (!session.success || !session.paymentUrl) {
        toast.error(session.error || 'Could not start payment');
        return;
      }

      window.location.href = session.paymentUrl;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Payment failed to start';
      toast.error(message);
    } finally {
      setPayingBookingId(null);
    }
  };

  const calculateNights = (checkIn: string, checkOut: string): number => {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const locale = i18n.language === 'ar' ? 'ar-BH' : 'en-US';
    return date.toLocaleDateString(locale, {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const isPastBooking = (booking: BookingWithCamp) => {
    // checkOutDate === checkInDate by convention; the checkOut datetime
    // carries the real departure day.
    const end = getDepartureDate(booking);
    end.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return end < today;
  };

  // An online booking whose payment hold lapsed before it was paid.
  // Display-only: the client never cancels these; the server/webhook owns state.
  const isExpiredUnpaidOnline = (booking: BookingWithCamp) =>
    booking.paymentMethod !== 'cash_on_arrival' &&
    booking.status !== 'cancelled' &&
    (!booking.paymentStatus || booking.paymentStatus === 'pending' || booking.paymentStatus === 'failed') &&
    typeof booking.expiresAt === 'number' &&
    booking.expiresAt < Date.now();

  // Payment action is only offered while the hold is still valid and no
  // Tap charge is already in flight. When tapChargeId is present the guest
  // must verify first; Pay Now re-appears only after verification confirms
  // the charge was not settled (i.e. the session truly failed/cancelled).
  const canPayOnline = (booking: BookingWithCamp) =>
    booking.paymentMethod !== 'cash_on_arrival' &&
    booking.status !== 'cancelled' &&
    (!booking.paymentStatus || booking.paymentStatus === 'pending' || booking.paymentStatus === 'failed') &&
    !isExpiredUnpaidOnline(booking) &&
    (!booking.tapChargeId || verifyOutcome.get(booking.id) === 'failed');

  // Verify action is offered for any unpaid online booking that already has a
  // stored Tap charge — covers both 'pending' and 'failed' paymentStatus so a
  // guest with a failed booking + in-flight charge is never locked out.
  const canVerifyPayment = (booking: BookingWithCamp) =>
    booking.paymentMethod !== 'cash_on_arrival' &&
    booking.status !== 'cancelled' &&
    (!booking.paymentStatus || booking.paymentStatus === 'pending' || booking.paymentStatus === 'failed') &&
    !!booking.tapChargeId;

  const currentBookings = bookings.filter(b => b.status !== 'cancelled' && !isPastBooking(b));
  const pastBookings = bookings.filter(b => b.status !== 'cancelled' && isPastBooking(b));
  const cancelledBookings = bookings.filter(b => b.status === 'cancelled');
  const displayedBookings =
    viewMode === 'current' ? currentBookings : viewMode === 'past' ? pastBookings : cancelledBookings;

  if (loading || loadingBookings) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-50" />
        <div className="text-center relative z-10">
          <CampfireLoader size="lg" className="mx-auto mb-4" />
          <p className="text-muted-foreground font-medium font-display tracking-widest uppercase">{t('bookingsUser.loadingYourBookings', 'Loading your bookings…')}</p>
        </div>
      </div>
    );
  }

  if (!user || !userData) {
    return (
      <div className="min-h-screen bg-background p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-50" />
        <div className="max-w-md mx-auto pt-20 relative z-10">
          <Card className="bg-card/60 backdrop-blur-md border border-border/50 p-8 text-center shadow-[0_8px_30px_rgba(0,0,0,0.5)] rounded-2xl">
            <div className="w-20 h-20 bg-primary/10 border border-primary/20 rounded-full mx-auto flex items-center justify-center mb-6">
              <Calendar className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-3 font-display tracking-wide uppercase">{t('bookingsUser.signInView')}</h2>
            <p className="text-muted-foreground font-light mb-6">{t('bookingsUser.signInDesc')}</p>
            <Button
              onClick={() => navigate('/signin')}
              className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-[0_0_15px_rgba(212,175,55,0.2)] rounded-xl uppercase tracking-widest font-display text-sm"
            >
              {t('bookingsUser.signInButton')}
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 relative">
      <PatternDunes color="currentColor" className="text-foreground" opacity={0.045} />
      <div className="max-w-4xl mx-auto pt-8 pb-20 relative z-10">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-3 font-display tracking-wide uppercase">{t('bookingsUser.title')}</h1>
          <p className="text-muted-foreground font-light">
            {t('bookingsUser.count', { count: displayedBookings.length })}
          </p>
          <div className="mt-5 inline-flex rounded-xl border border-border/80 overflow-hidden bg-background/50">
            <button
              type="button"
              onClick={() => setViewMode('current')}
              className={`px-6 py-2.5 font-semibold text-sm tracking-wide uppercase transition-all ${
                viewMode === 'current'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-primary/10'
              }`}
            >
              {t('bookingsUser.current', 'Current')}
            </button>
            <button
              type="button"
              onClick={() => setViewMode('past')}
              className={`px-6 py-2.5 font-semibold text-sm tracking-wide uppercase transition-all ${
                viewMode === 'past'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-primary/10'
              }`}
            >
              {t('bookingsUser.past', 'Past')}
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cancelled')}
              className={`px-6 py-2.5 font-semibold text-sm tracking-wide uppercase transition-all ${
                viewMode === 'cancelled'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-primary/10'
              }`}
            >
              {t('bookingsUser.cancelledTab', 'Cancelled')}
            </button>
          </div>
        </div>

        {displayedBookings.length === 0 ? (
          <Card className="bg-card/60 backdrop-blur-md border border-border/50 p-12 text-center shadow-[0_8px_30px_rgba(0,0,0,0.5)] rounded-2xl relative overflow-hidden">
            <PatternDunes color="currentColor" className="text-foreground" opacity={0.05} />
            <div className="w-20 h-20 bg-primary/10 border border-primary/20 rounded-full mx-auto flex items-center justify-center mb-6">
              <Tent className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-3 font-display tracking-wide uppercase">
              {viewMode === 'current' ? t('bookingsUser.emptyTitle') : t('bookingsUser.emptyTitle')}
            </h3>
            <p className="text-muted-foreground font-light mb-6">
              {viewMode === 'current'
                ? t('bookingsUser.emptyDesc')
                : t('bookingsUser.emptyDesc')}
            </p>
            <Button
              onClick={() => navigate('/')}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-[0_0_15px_rgba(212,175,55,0.2)] rounded-xl uppercase tracking-widest font-display text-sm"
            >
              Explore Camps
            </Button>
          </Card>
        ) : (
          <div className="space-y-5">
            {displayedBookings.map((booking) => (
              <Card
                key={booking.id}
                className="bg-card/60 backdrop-blur-md overflow-hidden hover:border-primary/30 transition-all border border-border/50 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.3)]"
              >
                <div className="flex flex-col md:flex-row gap-5 p-5">
                  <img
                    src={booking.campImages?.[0] ?? ''}
                    alt={booking.campTitle}
                    className="w-full md:w-48 h-48 object-cover rounded-xl flex-shrink-0"
                    onError={(e) => {
                      e.currentTarget.src = 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800';
                    }}
                  />
                  <div className="flex-1 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-xl font-semibold text-foreground mb-2 font-display tracking-wide">
                          {booking.campTitle}
                        </h3>
                        <div className="flex items-center text-muted-foreground text-sm font-light">
                          <MapPin className="w-4 h-4 ltr:mr-1.5 rtl:ml-1.5 text-primary/70" />
                          <span>{booking.campLocation}</span>
                        </div>
                      </div>
                      {booking.status === 'confirmed' && (
                        <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold rounded-full tracking-wide uppercase">
                          Confirmed
                        </span>
                      )}
                      {booking.status === 'pending' && (
                        isExpiredUnpaidOnline(booking) ? (
                          <span className="px-3 py-1 bg-muted text-muted-foreground border border-border/50 text-xs font-semibold rounded-full tracking-wide uppercase">
                            {t('bookingsUser.expiredBadge')}
                          </span>
                        ) : booking.paymentMethod !== 'cash_on_arrival' && (!booking.paymentStatus || booking.paymentStatus === 'pending') ? (
                          <span className="px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-semibold rounded-full tracking-wide uppercase">
                            {t('bookingsUser.awaitingPaymentBadge')}
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-primary/10 text-primary border border-primary/20 text-xs font-semibold rounded-full tracking-wide uppercase">
                            Pending
                          </span>
                        )
                      )}
                      {booking.status === 'cancelled' && (
                        <div className="flex flex-col items-end gap-1.5">
                          <span className="px-3 py-1 bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-semibold rounded-full tracking-wide uppercase">
                            {t('status.cancelled', 'Cancelled')}
                          </span>
                          {(booking.refundStatus === 'refunded' || booking.paymentStatus === 'refunded') ? (
                            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold rounded-full">
                              {t('bookingsUser.refunded', 'Refunded')}
                              {booking.refundAmount ? ` · ${Number(booking.refundAmount).toFixed(3)} BHD` : ''}
                            </span>
                          ) : (booking.refundStatus === 'processing' || booking.refundStatus === 'pending') ? (
                            <span className="px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-semibold rounded-full">
                              {t('bookingsUser.refundProcessing', 'Refund processing')}
                              {booking.refundAmount ? ` · ${Number(booking.refundAmount).toFixed(3)} BHD` : ''}
                            </span>
                          ) : null}
                        </div>
                      )}
                    </div>

                    {booking.paymentMethod === 'cash_on_arrival' && (!booking.paymentStatus || booking.paymentStatus === 'pending') && booking.status !== 'cancelled' && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-amber-400 bg-amber-500/10 px-3 py-2 rounded-lg border border-amber-500/20 w-fit">
                          <Banknote className="w-4 h-4" />
                          <span className="font-medium">{t('reserve.cashDueBadge', 'Payment due at check-in')}</span>
                        </div>
                        {booking.status === 'confirmed' && (
                          <div className="text-xs text-muted-foreground bg-card/40 border border-border/60 rounded-xl px-3 py-2 max-w-sm">
                            <p className="font-semibold text-foreground mb-1">{t('bookingsUser.cashNextTitle', 'What happens next')}</p>
                            <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                              <li>{t('bookingsUser.cashNext1', 'Your host will contact you to confirm arrival details')}</li>
                              <li>{t('bookingsUser.cashNext2', 'Bring cash on the day of check-in')}</li>
                              <li>{t('bookingsUser.cashNext3', 'Payment is collected by the host at the site')}</li>
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="w-4 h-4 text-primary" />
                        <div className="text-sm">
                          <p className="font-semibold text-foreground text-xs uppercase tracking-wide">{t('bookingsUser.checkIn')}</p>
                          <p className="text-muted-foreground font-light">{formatDate(booking.checkInDate)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="w-4 h-4 text-primary" />
                        <div className="text-sm">
                          <p className="font-semibold text-foreground text-xs uppercase tracking-wide">{t('bookingsUser.checkOut')}</p>
                          <p className="text-muted-foreground font-light">{formatDate(getDepartureDateStr(booking))}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Users className="w-4 h-4 text-primary" />
                        <div className="text-sm">
                          <p className="font-semibold text-foreground text-xs uppercase tracking-wide">{t('bookingsUser.numberOfGuests')}</p>
                          <p className="text-muted-foreground font-light">{booking.guests}</p>
                        </div>
                      </div>
                    </div>

                    {/* Review Status */}
                    {booking.reviewId && (
                      <div className="flex items-center gap-2 text-sm text-emerald-400 bg-emerald-500/10 px-4 py-2.5 rounded-xl border border-emerald-500/20">
                        <Star className="w-4 h-4 fill-current" />
                        <span className="font-medium">{t('bookingsUser.youReviewed')}</span>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-3 border-t border-border/50">
                      <div>
                        <p className="text-xs text-muted-foreground font-light uppercase tracking-widest">{t('bookingsUser.totalPrice')}</p>
                        <p className="text-2xl font-bold text-primary font-display">
                          {booking.totalPrice} <span className="text-sm text-muted-foreground font-light">BHD</span>
                        </p>
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto flex-wrap">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              className="flex-1 sm:flex-none border border-border/80 text-foreground bg-background/50 hover:bg-primary/10 hover:border-primary/50 font-semibold rounded-xl"
                            >
                              {t('bookingsUser.viewDetails')}
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-card border border-border/50">
                            <DialogHeader>
                              <DialogTitle className="font-display tracking-wide uppercase">Reservation Details</DialogTitle>
                              <DialogDescription>
                                Complete information about your booking
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-6 py-4">
                              <div className="flex items-center justify-between pb-4 border-b border-border/50">
                                <div>
                                  <h3 className="font-semibold text-lg text-foreground">{t('bookingsUser.statusTitle', 'Booking Status')}</h3>
                                  <p className="text-sm text-muted-foreground font-light">{t('bookingsUser.statusDesc', 'Current reservation status')}</p>
                                </div>
                                <span className={`px-4 py-2 rounded-full text-sm font-medium ${
                                  booking.status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                  booking.status === 'pending' ? 'bg-primary/10 text-primary border border-primary/20' :
                                  'bg-red-500/10 text-red-400 border border-red-500/20'
                                }`}>
                                  {booking.status === 'confirmed' ? t('status.confirmed') : booking.status === 'pending' ? t('status.pending') : booking.status === 'cancelled' ? t('status.cancelled') : t('status.na')}
                                </span>
                              </div>

                              <div className="pb-4 border-b border-border/50 space-y-3">
                                <div className="flex items-start justify-between gap-4">
                                  <div>
                                    <h3 className="font-semibold text-lg text-foreground">Payment</h3>
                                    <p className="text-sm text-muted-foreground font-light">
                                      {booking.paymentMethod === 'cash_on_arrival' ? 'Cash on Arrival selected' : 'Online payment'}
                                    </p>
                                    <div className="mt-2 flex gap-2 items-center">
                                      <Badge className="bg-secondary text-foreground border border-border/80">
                                        {(booking.paymentMethod || 'online').replace('_', ' ')}
                                      </Badge>
                                      <Badge variant="secondary" className={(booking.paymentStatus === 'paid' || booking.paymentStatus === 'cash_collected') ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-primary/10 text-primary border border-primary/20'}>
                                        {t(`reserve.paymentState.${booking.paymentStatus || 'pending'}`, booking.paymentStatus || 'pending')}
                                      </Badge>
                                      {booking.paymentMethod === 'cash_on_arrival' && (!booking.paymentStatus || booking.paymentStatus === 'pending') && booking.status !== 'cancelled' && (
                                        <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                          {t('reserve.cashDueBadge', 'Payment due at check-in')}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  {canPayOnline(booking) && (
                                    <Button
                                      onClick={() => handlePayPending(booking)}
                                      disabled={payingBookingId === booking.id}
                                      className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl"
                                    >
                                      {payingBookingId === booking.id ? t('bookingsUser.startingPayment') : t('bookingsUser.payNow')}
                                    </Button>
                                  )}
                                  {canVerifyPayment(booking) && (
                                    <Button
                                      onClick={() => handleVerifyPayment(booking)}
                                      variant="outline"
                                      disabled={verifyingBookingId === booking.id}
                                      className="border border-border/80 text-foreground bg-background/50 hover:bg-primary/10 hover:border-primary/50 font-semibold rounded-xl"
                                    >
                                      {verifyingBookingId === booking.id ? t('bookingsUser.verifyingPayment') : t('bookingsUser.verifyPayment')}
                                    </Button>
                                  )}
                                </div>
                                {verifyOutcome.has(booking.id) && (
                                  <div className={`flex items-start gap-2 text-sm px-3 py-2.5 rounded-xl border ${verifyOutcome.get(booking.id) === 'inflight' ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' : 'text-amber-400 bg-amber-500/10 border-amber-500/20'}`}>
                                    <span>{verifyOutcome.get(booking.id) === 'inflight' ? t('bookingsUser.verifyPaymentInFlightMsg') : t('bookingsUser.verifyPaymentFailedMsg')}</span>
                                  </div>
                                )}
                              </div>

                              <div className="pb-4 border-b border-border/50">
                                <h3 className="font-semibold mb-2 text-foreground">{t('bookingsUser.bookingId')}</h3>
                                <p className="text-sm text-muted-foreground font-mono break-all" dir="ltr">{booking.id}</p>
                              </div>

                              <div className="pb-4 border-b border-border/50">
                                <h3 className="font-semibold mb-3 text-foreground">{t('bookingsUser.campInfo')}</h3>
                                <div className="space-y-2">
                                  <div className="flex items-start">
                                    <span className="font-medium w-32 text-foreground">{t('bookingsUser.campName')}:</span>
                                    <span className="text-muted-foreground font-light">{booking.campTitle}</span>
                                  </div>
                                  <div className="flex items-start">
                                    <MapPin className="h-4 w-4 ltr:mr-2 rtl:ml-2 mt-1 text-primary flex-shrink-0" />
                                    <span className="font-medium w-28 text-foreground">{t('bookingsUser.location')}:</span>
                                    <span className="text-muted-foreground font-light">{booking.campLocation}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="pb-4 border-b border-border/50">
                                <h3 className="font-semibold mb-3 text-foreground">{t('bookingsUser.stayDetails')}</h3>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <div className="flex items-center mb-1">
                                      <Calendar className="h-4 w-4 ltr:mr-2 rtl:ml-2 text-primary" />
                                      <span className="font-medium text-foreground">{t('bookingsUser.checkIn')}</span>
                                    </div>
                                    <p className="text-sm text-muted-foreground font-light ltr:ml-6 rtl:mr-6">
                                      {formatDate(booking.checkInDate)}
                                    </p>
                                  </div>
                                  <div>
                                    <div className="flex items-center mb-1">
                                      <Calendar className="h-4 w-4 ltr:mr-2 rtl:ml-2 text-primary" />
                                      <span className="font-medium text-foreground">{t('bookingsUser.checkOut')}</span>
                                    </div>
                                    <p className="text-sm text-muted-foreground font-light ltr:ml-6 rtl:mr-6">
                                      {formatDate(getDepartureDateStr(booking))}
                                    </p>
                                  </div>
                                </div>
                                <div className="mt-3 flex items-center">
                                  <span className="font-medium text-foreground">{t('bookingsUser.totalNights')}:</span>
                                  <span className="ltr:ml-2 rtl:mr-2 text-muted-foreground font-light">
                                    {calculateNights(booking.checkInDate, getDepartureDateStr(booking))} {t('bookingsUser.nights')}
                                  </span>
                                </div>
                              </div>

                              <div className="pb-4 border-b border-border/50">
                                <h3 className="font-semibold mb-3 text-foreground">{t('bookingsUser.guestInfo')}</h3>
                                <div className="flex items-center">
                                  <Users className="h-4 w-4 ltr:mr-2 rtl:ml-2 text-primary" />
                                  <span className="font-medium text-foreground">{t('bookingsUser.numberOfGuests')}:</span>
                                  <span className="ltr:ml-2 rtl:mr-2 text-muted-foreground font-light">{booking.guests}</span>
                                </div>
                              </div>

                              <div className="pb-4 border-b border-border/50">
                                <h3 className="font-semibold mb-3 text-foreground">{t('bookingsUser.priceBreakdown')}</h3>
                                <div className="space-y-2">
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground font-light">
                                      {booking.priceBreakdown?.basePrice || 0} BHD × {calculateNights(booking.checkInDate, getDepartureDateStr(booking))} {t('bookingsUser.nights')}
                                    </span>
                                    <span className="font-medium text-foreground">
                                      {(booking.priceBreakdown?.basePrice || 0) * calculateNights(booking.checkInDate, getDepartureDateStr(booking))} BHD
                                    </span>
                                  </div>
                                  <div className="flex justify-between pt-2 border-t border-border/50">
                                    <span className="font-semibold text-foreground">{t('bookingsUser.totalPrice')}</span>
                                    <span className="font-bold text-primary text-xl font-display">
                                      {booking.totalPrice} BHD
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div>
                                <h3 className="font-semibold mb-2 text-foreground">{t('bookingsUser.bookingCreated')}</h3>
                                <p className="text-sm text-muted-foreground font-light">
                                  {booking.createdAt ? new Date(
                                    typeof booking.createdAt === 'string' 
                                      ? booking.createdAt 
                                      : booking.createdAt.toDate()
                                  ).toLocaleString(i18n.language === 'ar' ? 'ar-BH' : 'en-US', {
                                    dateStyle: 'long',
                                    timeStyle: 'short'
                                  }) : t('status.na')}
                                </p>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                        
                        {canPayOnline(booking) && (
                          <Button
                            onClick={() => handlePayPending(booking)}
                            className="flex-1 sm:flex-none bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl"
                            disabled={payingBookingId === booking.id}
                          >
                            {payingBookingId === booking.id ? t('bookingsUser.startingPayment') : t('bookingsUser.payNow')}
                          </Button>
                        )}

                        {canVerifyPayment(booking) && (
                          <Button
                            onClick={() => handleVerifyPayment(booking)}
                            variant="outline"
                            className="flex-1 sm:flex-none border border-border/80 text-foreground bg-background/50 hover:bg-primary/10 hover:border-primary/50 font-semibold rounded-xl"
                            disabled={verifyingBookingId === booking.id}
                          >
                            {verifyingBookingId === booking.id ? t('bookingsUser.verifyingPayment') : t('bookingsUser.verifyPayment')}
                          </Button>
                        )}

                        {booking.eligibleForReview && !booking.reviewId && (
                          <Button
                            onClick={() => handleWriteReview(booking)}
                            className="flex-1 sm:flex-none bg-secondary hover:bg-primary/10 text-foreground border border-border/80 hover:border-primary/50 font-semibold rounded-xl"
                          >
                            <Star className="w-4 h-4 ltr:mr-2 rtl:ml-2 text-primary" />
                            {t('bookingsUser.writeReview')}
                          </Button>
                        )}

                        {booking.status !== 'cancelled' && isPastBooking(booking) && myDisputes.get(booking.id)?.status !== 'resolved' && (
                          <Button
                            onClick={() => setReportingBooking(booking)}
                            variant="outline"
                            className="flex-1 sm:flex-none border-2 border-amber-500 text-amber-700 hover:bg-amber-50 font-semibold"
                          >
                            <Flag className="w-4 h-4 ltr:mr-2 rtl:ml-2" />
                            {t('reportIssue.button', 'Report an Issue')}
                          </Button>
                        )}

                        <Button
                          onClick={() => setMessagingBooking(booking)}
                          variant="outline"
                          className="flex-1 sm:flex-none border-2 border-primary text-primary hover:bg-primary/10 font-semibold rounded-xl"
                        >
                          <MessageCircle className="w-4 h-4 ltr:mr-2 rtl:ml-2" />
                          {t('messaging.messageHost', 'Message Host')}
                        </Button>

                        {booking.status !== 'cancelled' && (
                          <Button
                            onClick={() => handleCancelClick(booking)}
                            variant="destructive"
                            className="flex-1 sm:flex-none bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-semibold rounded-xl"
                          >
                            <X className="w-4 h-4 ltr:mr-2 rtl:ml-2" />
                            {t('bookingsUser.cancel')}
                          </Button>
                        )}
                      </div>
                    </div>
                    {verifyOutcome.has(booking.id) && (
                      <div className={`flex items-start gap-2 text-sm px-3 py-2.5 rounded-xl border ${verifyOutcome.get(booking.id) === 'inflight' ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' : 'text-amber-400 bg-amber-500/10 border-amber-500/20'}`}>
                        <span>{verifyOutcome.get(booking.id) === 'inflight' ? t('bookingsUser.verifyPaymentInFlightMsg') : t('bookingsUser.verifyPaymentFailedMsg')}</span>
                      </div>
                    )}
                    {myDisputes.get(booking.id)?.status === 'resolved' && (
                      <div className="flex items-start gap-2 text-sm px-3 py-2.5 rounded-xl border text-green-400 bg-green-500/10 border-green-500/20">
                        <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>{t('disputeResolved.notice')}</span>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Messaging Dialog */}
      {messagingBooking && (
        <MessagingDialog
          open={!!messagingBooking}
          onClose={() => setMessagingBooking(null)}
          bookingId={messagingBooking.id}
          campId={messagingBooking.campId}
          campTitle={messagingBooking.campTitle}
          guestId={user.uid}
          hostId={(messagingBooking as any).hostId || ''}
          currentUserId={user.uid}
          currentUserRole="guest"
        />
      )}

      {/* Report Issue Dialog */}
      {reportingBooking && (
        <ReportIssueDialog
          bookingId={reportingBooking.id}
          campTitle={reportingBooking.campTitle}
          open={!!reportingBooking}
          onOpenChange={(open) => { if (!open) setReportingBooking(null); }}
        />
      )}

      {/* Cancellation Dialog */}
      {bookingToCancel && (
        <CancellationDialog
          booking={{
            id: bookingToCancel.id,
            campId: bookingToCancel.campId,
            campName: bookingToCancel.campTitle,
            campLocation: bookingToCancel.campLocation,
            checkInDate: bookingToCancel.checkInDate,
            checkOutDate: getDepartureDateStr(bookingToCancel),
            numberOfGuests: bookingToCancel.guests,
            totalPrice: bookingToCancel.totalPrice,
            status: bookingToCancel.status,
            userId: bookingToCancel.userId,
            userEmail: user?.email || '',
            cancellationPolicy: bookingToCancel.camp?.cancellationPolicy ?? 'moderate',
          }}
          open={showCancellationDialog}
          onOpenChange={setShowCancellationDialog}
          onCancellationComplete={handleCancellationComplete}
        />
      )}

      {/* Review Form Dialog */}
      <Dialog open={showReviewForm} onOpenChange={setShowReviewForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border border-border/50">
          <DialogHeader>
            <DialogTitle className="font-display tracking-wide uppercase">Write a Review</DialogTitle>
          </DialogHeader>
          {reviewingBooking && (
            <ReviewForm
              campId={reviewingBooking.campId}
              campName={reviewingBooking.campTitle}
              bookingId={reviewingBooking.id}
              checkInDate={reviewingBooking.checkInDate}
              checkOutDate={getDepartureDateStr(reviewingBooking)}
              onSubmit={handleSubmitReview}
              onCancel={() => {
                setShowReviewForm(false);
                setReviewingBooking(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}