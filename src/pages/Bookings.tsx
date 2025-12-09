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
import { Calendar, MapPin, Users, Loader2, X, Star } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getBookingsByUser, Booking, getCampById, Camp, canUserReview, createReview } from '@/lib/firestore';
import { toast } from 'sonner';
import ReviewForm from '@/components/ReviewForm';
import { CancellationDialog } from '@/components/CancellationDialog';
import type { CancellationPolicy } from '@/lib/refundCalculator';
import { createPaymentSession } from '@/lib/payments';
import { useTranslation } from 'react-i18next';

interface BookingWithCamp extends Booking {
  camp?: Camp;
  eligibleForReview?: boolean;
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
  const [viewMode, setViewMode] = useState<'current' | 'past'>('current');
  const { t } = useTranslation();

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
      
      // FIXED: Filter out cancelled bookings completely
      const activeBookings = userBookings.filter(booking => booking.status !== 'cancelled');
      console.log(`📋 Filtered bookings: ${userBookings.length} total, ${activeBookings.length} active (${userBookings.length - activeBookings.length} cancelled removed)`);
      
      // Fetch camp details and check review eligibility for each active booking
      const bookingsWithCamps = await Promise.all(
        activeBookings.map(async (booking) => {
          try {
            const camp = await getCampById(booking.campId);
            
            // Check if booking is eligible for review
            const checkOutDate = new Date(booking.checkOutDate);
            const today = new Date();
            const isCompleted = checkOutDate < today && booking.status !== 'cancelled';
            
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
          checkOutDate: reviewingBooking.checkOutDate
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

  const handlePayPending = async (booking: BookingWithCamp) => {
    if (!user) return;
    setPayingBookingId(booking.id);

    try {
      const redirectUrl =
        import.meta.env.VITE_PAYMENT_REDIRECT_URL ||
        `${window.location.origin}/payment-success?bookingId=${booking.id}`;

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
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const isPastBooking = (booking: BookingWithCamp) => {
    const endDateStr = (booking as { checkOutDate?: string }).checkOutDate || booking.checkOut;
    if (!endDateStr) return false;
    const end = new Date(endDateStr);
    if (isNaN(end.getTime())) return false;
    end.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return end < today;
  };

  const currentBookings = bookings.filter(b => !isPastBooking(b));
  const pastBookings = bookings.filter(b => isPastBooking(b));
  const displayedBookings = viewMode === 'current' ? currentBookings : pastBookings;

  if (loading || loadingBookings) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-50 via-orange-100 to-orange-200 p-4 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-amber-800 animate-spin mx-auto mb-4" />
          <p className="text-gray-700 font-medium">Loading your bookings...</p>
        </div>
      </div>
    );
  }

  if (!user || !userData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-50 via-orange-100 to-orange-200 p-4">
        <div className="max-w-md mx-auto pt-20">
          <Card className="bg-white/95 backdrop-blur-sm border-orange-300 p-8 text-center shadow-xl">
            <div className="w-20 h-20 bg-gradient-to-br from-amber-700 to-amber-900 rounded-full mx-auto flex items-center justify-center mb-4">
              <Calendar className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">View Your Bookings</h2>
            <p className="text-gray-700 font-medium mb-6">Sign in to see your desert camp reservations</p>
            <Button
              onClick={() => navigate('/signin')}
              className="w-full h-12 bg-gradient-to-r from-amber-700 to-amber-900 hover:from-amber-800 hover:to-amber-950 text-white font-semibold shadow-lg"
            >
              Sign In
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 via-orange-100 to-orange-200 p-4">
      <div className="max-w-4xl mx-auto pt-8 pb-20">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('bookingsUser.title')}</h1>
          <p className="text-gray-700 font-medium">
            {viewMode === 'current'
              ? t('bookingsUser.count', { count: currentBookings.length })
              : t('bookingsUser.count', { count: pastBookings.length })}
          </p>
          <div className="mt-4 inline-flex rounded-xl border-2 border-amber-800 overflow-hidden">
            <button
              type="button"
              onClick={() => setViewMode('current')}
              className={`px-6 py-2.5 font-semibold transition ${
                viewMode === 'current'
                  ? 'bg-amber-800 text-white'
                  : 'bg-white text-amber-800 hover:bg-amber-50'
              }`}
            >
              {t('bookingsUser.current', 'Current')}
            </button>
            <button
              type="button"
              onClick={() => setViewMode('past')}
              className={`px-6 py-2.5 font-semibold transition ${
                viewMode === 'past'
                  ? 'bg-amber-800 text-white'
                  : 'bg-white text-amber-800 hover:bg-amber-50'
              }`}
            >
              {t('bookingsUser.past', 'Past')}
            </button>
          </div>
        </div>

        {displayedBookings.length === 0 ? (
          <Card className="bg-white/95 backdrop-blur-sm border-orange-300 p-12 text-center shadow-xl">
            <div className="w-20 h-20 bg-gradient-to-br from-amber-700 to-amber-900 rounded-full mx-auto flex items-center justify-center mb-4">
              <span className="text-4xl">🏕️</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {viewMode === 'current' ? t('bookingsUser.emptyTitle') : t('bookingsUser.emptyTitle')}
            </h3>
            <p className="text-gray-700 font-medium mb-6">
              {viewMode === 'current'
                ? t('bookingsUser.emptyDesc')
                : t('bookingsUser.emptyDesc')}
            </p>
            <Button
              onClick={() => navigate('/')}
              className="bg-gradient-to-r from-amber-700 to-amber-900 hover:from-amber-800 hover:to-amber-950 text-white font-semibold shadow-lg"
            >
              Explore Camps
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {displayedBookings.map((booking) => (
              <Card
                key={booking.id}
                className="bg-white/95 backdrop-blur-sm overflow-hidden hover:shadow-xl transition-shadow border-orange-300"
              >
                <div className="flex flex-col md:flex-row gap-4 p-4">
                  <img
                    src={booking.campPhoto}
                    alt={booking.campTitle}
                    className="w-full md:w-48 h-48 object-cover rounded-lg flex-shrink-0"
                    onError={(e) => {
                      e.currentTarget.src = 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800';
                    }}
                  />
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-1">
                          {booking.campTitle}
                        </h3>
                        <div className="flex items-center text-gray-700 text-sm font-medium">
                          <MapPin className="w-4 h-4 mr-1" />
                          <span>{booking.campLocation}</span>
                        </div>
                      </div>
                      {booking.status === 'confirmed' && (
                        <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-semibold rounded-full">
                          CONFIRMED
                        </span>
                      )}
                      {booking.status === 'pending' && (
                        <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-sm font-semibold rounded-full">
                          PENDING
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="flex items-center gap-2 text-gray-700">
                        <Calendar className="w-4 h-4 text-amber-800" />
                        <div className="text-sm">
                          <p className="font-semibold">Check-in</p>
                          <p className="text-gray-600">{booking.checkIn}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-gray-700">
                        <Calendar className="w-4 h-4 text-amber-800" />
                        <div className="text-sm">
                          <p className="font-semibold">Check-out</p>
                          <p className="text-gray-600">{booking.checkOut}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-gray-700">
                        <Users className="w-4 h-4 text-amber-800" />
                        <div className="text-sm">
                          <p className="font-semibold">Guests</p>
                          <p className="text-gray-600">{booking.guests}</p>
                        </div>
                      </div>
                    </div>

                    {/* Review Status */}
                    {booking.reviewId && (
                      <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg border border-green-200">
                        <Star className="w-4 h-4 fill-current" />
                        <span className="font-medium">You reviewed this camp</span>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 border-t border-orange-300">
                      <div>
                        <p className="text-sm text-gray-600 font-medium">Total Price</p>
                        <p className="text-2xl font-bold text-amber-800">
                          {booking.totalPrice} <span className="text-base text-gray-700">BD</span>
                        </p>
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto flex-wrap">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              className="flex-1 sm:flex-none border-2 border-amber-800 text-amber-800 hover:bg-amber-50 font-semibold"
                            >
                              {t('bookingsUser.viewDetails')}
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Reservation Details</DialogTitle>
                              <DialogDescription>
                                Complete information about your booking
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-6 py-4">
                              <div className="flex items-center justify-between pb-4 border-b">
                                <div>
                                  <h3 className="font-semibold text-lg">{t('bookingsUser.statusTitle', 'Booking Status')}</h3>
                                  <p className="text-sm text-muted-foreground">{t('bookingsUser.statusDesc', 'Current reservation status')}</p>
                                </div>
                                <span className={`px-4 py-2 rounded-full text-sm font-medium ${
                                  booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                                  booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {booking.status === 'confirmed' ? t('status.confirmed') : booking.status === 'pending' ? t('status.pending') : booking.status === 'cancelled' ? t('status.cancelled') : t('status.na')}
                                </span>
                              </div>

                              <div className="pb-4 border-b flex items-start justify-between gap-4">
                                <div>
                                  <h3 className="font-semibold text-lg">Payment</h3>
                                  <p className="text-sm text-muted-foreground">
                                    {booking.paymentMethod === 'cash_on_arrival' ? 'Cash on Arrival selected' : 'Online payment'}
                                  </p>
                                  <div className="mt-2 flex gap-2 items-center">
                                    <Badge className="bg-orange-100 text-gray-900 border border-orange-300">
                                      {(booking.paymentMethod || 'online').replace('_', ' ')}
                                    </Badge>
                                    <Badge variant="secondary" className={booking.paymentStatus === 'paid' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-amber-100 text-amber-900 border border-orange-200'}>
                                      {booking.paymentStatus || 'pending'}
                                    </Badge>
                                  </div>
                                </div>
                                {booking.paymentMethod !== 'cash_on_arrival' && (!booking.paymentStatus || booking.paymentStatus === 'pending' || booking.paymentStatus === 'failed' || booking.paymentStatus === 'cancelled') && (
                                  <Button
                                    onClick={() => handlePayPending(booking)}
                                    disabled={payingBookingId === booking.id}
                                    className="bg-amber-800 hover:bg-amber-900 text-white font-semibold"
                                  >
                                    {payingBookingId === booking.id ? 'Starting Payment...' : 'Pay Now'}
                                  </Button>
                                )}
                              </div>

                              <div className="pb-4 border-b">
                                <h3 className="font-semibold mb-2">Booking ID</h3>
                                <p className="text-sm text-muted-foreground font-mono break-all">{booking.id}</p>
                              </div>

                              <div className="pb-4 border-b">
                                <h3 className="font-semibold mb-3">Camp Information</h3>
                                <div className="space-y-2">
                                  <div className="flex items-start">
                                    <span className="font-medium w-32">Camp Name:</span>
                                    <span className="text-muted-foreground">{booking.campTitle}</span>
                                  </div>
                                  <div className="flex items-start">
                                    <MapPin className="h-4 w-4 mr-2 mt-1 text-primary flex-shrink-0" />
                                    <span className="font-medium w-28">Location:</span>
                                    <span className="text-muted-foreground">{booking.campLocation}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="pb-4 border-b">
                                <h3 className="font-semibold mb-3">Stay Details</h3>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <div className="flex items-center mb-1">
                                      <Calendar className="h-4 w-4 mr-2 text-primary" />
                                      <span className="font-medium">Check-in</span>
                                    </div>
                                    <p className="text-sm text-muted-foreground ml-6">
                                      {formatDate(booking.checkIn)}
                                    </p>
                                  </div>
                                  <div>
                                    <div className="flex items-center mb-1">
                                      <Calendar className="h-4 w-4 mr-2 text-primary" />
                                      <span className="font-medium">Check-out</span>
                                    </div>
                                    <p className="text-sm text-muted-foreground ml-6">
                                      {formatDate(booking.checkOut)}
                                    </p>
                                  </div>
                                </div>
                                <div className="mt-3 flex items-center">
                                  <span className="font-medium">Total Nights:</span>
                                  <span className="ml-2 text-muted-foreground">
                                    {calculateNights(booking.checkIn, booking.checkOut)} nights
                                  </span>
                                </div>
                              </div>

                              <div className="pb-4 border-b">
                                <h3 className="font-semibold mb-3">Guest Information</h3>
                                <div className="flex items-center">
                                  <Users className="h-4 w-4 mr-2 text-primary" />
                                  <span className="font-medium">Number of Guests:</span>
                                  <span className="ml-2 text-muted-foreground">{booking.guests}</span>
                                </div>
                              </div>

                              <div className="pb-4 border-b">
                                <h3 className="font-semibold mb-3">Price Breakdown</h3>
                                <div className="space-y-2">
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">
                                      {booking.camp?.price || 0} BD × {calculateNights(booking.checkIn, booking.checkOut)} nights
                                    </span>
                                    <span className="font-medium">
                                      {(booking.camp?.price || 0) * calculateNights(booking.checkIn, booking.checkOut)} BD
                                    </span>
                                  </div>
                                  <div className="flex justify-between pt-2 border-t">
                                    <span className="font-semibold">Total Price</span>
                                    <span className="font-bold text-primary text-xl">
                                      {booking.totalPrice} BD
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div>
                                <h3 className="font-semibold mb-2">Booking Created</h3>
                                <p className="text-sm text-muted-foreground">
                                  {booking.createdAt ? new Date(
                                    typeof booking.createdAt === 'string' 
                                      ? booking.createdAt 
                                      : booking.createdAt.toDate()
                                  ).toLocaleString('en-US', {
                                    dateStyle: 'long',
                                    timeStyle: 'short'
                                  }) : 'N/A'}
                                </p>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                        
                        {booking.paymentMethod !== 'cash_on_arrival' && (!booking.paymentStatus || booking.paymentStatus === 'pending' || booking.paymentStatus === 'failed' || booking.paymentStatus === 'cancelled') && (
                          <Button
                            onClick={() => handlePayPending(booking)}
                            className="flex-1 sm:flex-none bg-amber-800 hover:bg-amber-900 text-white font-semibold"
                            disabled={payingBookingId === booking.id}
                          >
                            {payingBookingId === booking.id ? t('bookingsUser.startingPayment') : t('bookingsUser.payNow')}
                          </Button>
                        )}

                        {booking.eligibleForReview && !booking.reviewId && (
                          <Button
                            onClick={() => handleWriteReview(booking)}
                            className="flex-1 sm:flex-none bg-gradient-to-r from-orange-500 to-[#FF8C42] hover:from-[#FF8C42] hover:to-amber-700 text-white font-semibold"
                          >
                            <Star className="w-4 h-4 mr-2" />
                            {t('bookingsUser.writeReview')}
                          </Button>
                        )}

                        <Button
                          onClick={() => handleCancelClick(booking)}
                          variant="destructive"
                          className="flex-1 sm:flex-none bg-red-600 hover:bg-red-700 text-white font-semibold"
                        >
                          <X className="w-4 h-4 mr-2" />
                          {t('bookingsUser.cancel')}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Cancellation Dialog */}
      {bookingToCancel && (
        <CancellationDialog
          booking={{
            id: bookingToCancel.id,
            campId: bookingToCancel.campId,
            campName: bookingToCancel.campTitle,
            campLocation: bookingToCancel.campLocation,
            checkInDate: bookingToCancel.checkInDate,
            checkOutDate: bookingToCancel.checkOutDate,
            numberOfGuests: bookingToCancel.guests,
            totalPrice: bookingToCancel.totalPrice,
            status: bookingToCancel.status,
            userId: bookingToCancel.userId,
            userEmail: user?.email || '',
            cancellationPolicy: (bookingToCancel.camp?.cancellationPolicy as CancellationPolicy) || 'moderate',
          }}
          open={showCancellationDialog}
          onOpenChange={setShowCancellationDialog}
          onCancellationComplete={handleCancellationComplete}
        />
      )}

      {/* Review Form Dialog */}
      <Dialog open={showReviewForm} onOpenChange={setShowReviewForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Write a Review</DialogTitle>
          </DialogHeader>
          {reviewingBooking && (
            <ReviewForm
              campId={reviewingBooking.campId}
              campName={reviewingBooking.campTitle}
              bookingId={reviewingBooking.id}
              checkInDate={reviewingBooking.checkInDate}
              checkOutDate={reviewingBooking.checkOutDate}
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