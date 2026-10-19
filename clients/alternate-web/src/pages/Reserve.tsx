import { CampfireLoader } from '@/components/CampfireLoader';
import { Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Clock, Users, Phone, MessageSquare, ArrowLeft, Tent, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getCampById, createBookingWithLock, hasUserBookingOnDate, DateUnavailableError, updateUserProfile } from '@/lib/firestore';
import { format, addDays } from 'date-fns';
import { toast } from 'sonner';
import { BookingCalendar } from '@/components/BookingCalendar';
import { RefundPolicyBadge } from '@/components/RefundPolicyBadge';
import { getBookedDates } from '@/lib/availability';
import { getBlockedDates, getBlockedDatesList } from '@/lib/dateBlocking';
import { checkAvailability } from '@/lib/availability';
import { LegacyCamp, normalizeCampToLegacy } from '@/lib/dataCompatibility';

// Extended camp type with fields present in Firestore but absent from LegacyCamp interface
type ExtendedLegacyCamp = LegacyCamp & {
  hostEmail?: string;
  instantBook?: boolean;
};
import { createPaymentSession } from '@/lib/payments';
import { useTranslation } from 'react-i18next';
import { useLoading } from '@/contexts/LoadingContext';
import { resolveCancellationTier } from '@/lib/policyUtils';
import { getNightlyRateForDate, type NightlyRateKind } from '@/lib/peakPricing';

export default function Reserve() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, userData, loading } = useAuth();
  const campId = searchParams.get('camp');

  // Phone already on the profile (collected at signup or a previous booking):
  // skip asking again — it's reused for the booking so hosts can still call.
  const profilePhone = (userData?.phone || '').trim();
  const hasProfilePhone = (() => {
    const digits = profilePhone.replace(/\D/g, '');
    return digits.length >= 8 && digits.length <= 15;
  })();
  const { showLoading, hideLoading } = useLoading();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  const [camp, setCamp] = useState<ExtendedLegacyCamp | null>(null);
  const [loadingCamp, setLoadingCamp] = useState(true);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  
  // Single day booking - Bahrain style (customizable check-in/check-out times)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [bookedDates, setBookedDates] = useState<Date[]>([]);
  const [blockedDates, setBlockedDates] = useState<Date[]>([]);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  
  const [arrivalTime, setArrivalTime] = useState('08:00');
  const [guests, setGuests] = useState(2);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [specialRequests, setSpecialRequests] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'cash_on_arrival'>('online');
  
  // Payment states
  const [showPayment, setShowPayment] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [blockedStatus, setBlockedStatus] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Expiry countdown for held online bookings (mirrors the booking's expiresAt)
  const [bookingExpiresAt, setBookingExpiresAt] = useState<number | null>(null);
  const [countdownNow, setCountdownNow] = useState(Date.now());

  useEffect(() => {
    if (!bookingExpiresAt) return;
    const id = setInterval(() => setCountdownNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [bookingExpiresAt]);

  const countdownMs = bookingExpiresAt ? Math.max(0, bookingExpiresAt - countdownNow) : 0;
  const countdownMins = Math.floor(countdownMs / 60000);
  const countdownSecs = Math.floor((countdownMs % 60000) / 1000);

  // Compact cancellation-policy summary shown directly above the reserve CTA.
  // Uses the shared resolver (canonical cancellationPolicy object first, legacy
  // strings as fallback) so the wording always reflects the actual policy.
  const policySummaryKey = (() => {
    const tier = resolveCancellationTier(
      (camp as unknown as { cancellationPolicy?: unknown })?.cancellationPolicy,
      camp?.refundPolicy,
    );
    if (tier === 'free') return 'reserve.policyTierFree';
    if (tier === 'partial') return 'reserve.policyTierPartial';
    if (tier === 'none') return 'reserve.policyTierNone';
    return 'reserve.policyTierReview';
  })();

  // Get check-in and check-out times with defaults
  const checkInTime = camp?.checkInTime || '08:00 AM';
  const checkOutTime = camp?.checkOutTime || '03:00 AM';

  useEffect(() => {
    console.log('=== RESERVE PAGE (DAILY BOOKING WITH AVAILABILITY) ===');
    console.log('Auth loading:', loading);
    console.log('Camp ID from URL:', campId);
    
    // Wait for auth to finish loading so we know who the user is (may be null).
    // Guests can browse the camp and see the availability calendar without signing
    // in — the public campAvailability index supports unauthenticated reads.
    // Sign-in is enforced in handleContinueToPayment when they actually submit.
    if (loading) return;

    if (campId) {
      loadCamp(campId);
      loadAvailability(campId);
    } else {
      console.log('❌ No camp ID provided in URL');
      setLoadingCamp(false);
    }
  }, [campId, loading]);

  const loadCamp = async (id: string) => {
    try {
      console.log('=== LOADING CAMP FOR RESERVATION ===');
      console.log('Camp ID:', id);
      showLoading(t('loading.fetching'));
      setLoadingCamp(true);
      
      const foundCamp = await getCampById(id);
      console.log('✅ Camp loaded:', foundCamp);
      
      if (foundCamp) {
        // Convert to legacy format for compatibility
        const legacyCamp = normalizeCampToLegacy(foundCamp);
        const mergedCamp = {
          ...legacyCamp,
          checkInTime: legacyCamp.checkInTime || '08:00 AM',
          checkOutTime: legacyCamp.checkOutTime || '03:00 AM',
        };
      setCamp(mergedCamp as ExtendedLegacyCamp);
      if (mergedCamp.status && mergedCamp.status !== 'active') {
        setBlockedStatus(mergedCamp.status);
      } else {
        setBlockedStatus(null);
      }
        console.log('Camp converted to legacy format');
      } else {
        console.log('❌ Camp not found');
        toast.error(t('reserve.campNotFound'));
      }
    } catch (error) {
      console.error('❌ Error loading camp:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(t('reserve.toastLoadCampFailed', { error: errorMessage }));
    } finally {
      setLoadingCamp(false);
      hideLoading();
    }
  };

  const handlePayNow = async () => {
    if (!bookingId || !camp) return;
    setPaying(true);
    setPaymentError(null);

    try {
      const redirectUrl =
        import.meta.env.VITE_PAYMENT_REDIRECT_URL ||
        `${window.location.origin}${import.meta.env.BASE_URL}payment/success?bookingId=${bookingId}`;

      const session = await createPaymentSession({
        amount: priceBreakdown.total,
        currency: 'BHD',
        bookingId,
        customer: {
          name: userData?.displayName || user?.email || 'Guest',
          email: user?.email || undefined,
          phone: (hasProfilePhone ? profilePhone : phoneNumber) || undefined,
        },
        redirectUrl,
      });

      if (!session.success || !session.paymentUrl) {
        setPaymentError(session.error || 'Could not start payment');
        toast.error(session.error || 'Could not start payment');
        return;
      }

      // Tap's checkout can't run inside an embedded iframe ("Feature-Policy:
      // payment") — e.g. the Replit preview pane — so escape to the top
      // window when framed; otherwise navigate this tab as usual.
      let navigated = false;
      try {
        if (window.top && window.top !== window.self) {
          window.top.location.href = session.paymentUrl;
          navigated = true;
        }
      } catch {
        // Sandboxed frame refused top navigation — use this frame instead.
      }
      if (!navigated) {
        window.location.href = session.paymentUrl;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Payment failed to start';
      setPaymentError(message);
      toast.error(message);
    } finally {
      setPaying(false);
    }
  };

  const loadAvailability = async (id: string) => {
    try {
      console.log('=== LOADING AVAILABILITY DATA ===');
      console.log('Camp ID:', id);
      setLoadingAvailability(true);
      setAvailabilityError(null);
      
      // Load booked dates
      const booked = await getBookedDates(id);
      setBookedDates(booked);
      console.log(`✅ Loaded ${booked.length} booked dates`);
      
      // Load blocked dates
      const blocked = await getBlockedDates(id);
      const blockedDatesList = getBlockedDatesList(blocked);
      setBlockedDates(blockedDatesList);
      console.log(`✅ Loaded ${blockedDatesList.length} blocked dates`);
      
    } catch (error) {
      console.error('❌ Error loading availability:', error);
      // Set a persistent error for every failure — fail closed so guests
      // never see an unmarked calendar when freshness is uncertain.
      setAvailabilityError(t('messages.availabilityError'));
    } finally {
      setLoadingAvailability(false);
    }
  };

  const handleDateSelect = async (date: Date | null) => {
    if (!date || !campId) return;
    
    console.log('=== DATE SELECTED ===');
    console.log('Selected date:', date);
    
    setCheckingAvailability(true);
    
    try {
      // Check availability in real-time
      const availability = await checkAvailability(campId, date);
      
      if (!availability.available) {
        toast.error(availability.message);
        return;
      }
      
      setSelectedDate(date);
      toast.success(t('reserve.toastSelectDateSuccess'));
      
    } catch (error) {
      console.error('❌ Availability check failed:', error);
      const errorCode = (error as { code?: string })?.code;
      if (errorCode === 'permission-denied') {
        setAvailabilityError(t('reserve.toastSignInAvailability'));
        toast.error(t('reserve.toastSignInAvailability'));
      } else {
        toast.error(t('reserve.toastCheckAvailabilityFailed'));
      }
    } finally {
      setCheckingAvailability(false);
    }
  };

  // Validate phone number
  const validatePhoneNumber = (phone: string): boolean => {
    // Remove all non-digit characters
    const digitsOnly = phone.replace(/\D/g, '');
    
    // Check length (8-15 digits for international format)
    if (digitsOnly.length < 8 || digitsOnly.length > 15) {
      return false;
    }
    
    return true;
  };

  // Handle phone number change with validation
  const handlePhoneChange = (value: string) => {
    setPhoneNumber(value);
    
    // Clear error when user starts typing
    if (phoneError && value.length > 0) {
      setPhoneError(null);
    }
    
    // Validate on blur or when length is sufficient
    if (value.length >= 8) {
      const digitsOnly = value.replace(/\D/g, '');
      if (digitsOnly.length < 8) {
        setPhoneError(t('reserve.phoneValidMin'));
      } else if (digitsOnly.length > 15) {
        setPhoneError(t('reserve.phoneValidMax'));
      } else {
        setPhoneError(null);
      }
    }
  };

  // Calculate price for single day
  const calculateDayPrice = () => {
    if (!camp || !selectedDate) return { basePrice: 0, serviceFee: 0, tax: 0, total: 0, kind: 'standard' as NightlyRateKind };
    
    // Base price for the selected date — applies weekend/holiday peak pricing
    const { rate: basePrice, kind } = getNightlyRateForDate(camp, selectedDate);
    
    // Service fee (10%)
    const serviceFee = basePrice * 0.10;
    
    return {
      basePrice,
      serviceFee,
      tax: 0,
      total: basePrice + serviceFee,
      kind
    };
  };

  const priceBreakdown = calculateDayPrice();

  const getTotalTents = () => {
    if (!camp?.tentConfiguration) return 0;
    return camp.tentConfiguration.large + camp.tentConfiguration.small + camp.tentConfiguration.entertainment;
  };

  // Convert 12-hour time format to 24-hour for storage
  const convertTo24Hour = (time12h: string): string => {
    const [time, modifier] = time12h.split(' ');
    const [hoursStr, minutes] = time.split(':');
    let hours = hoursStr;
    
    if (hours === '12') {
      hours = '00';
    }
    
    if (modifier === 'PM') {
      hours = String(parseInt(hours, 10) + 12);
    }
    
    return `${hours}:${minutes}`;
  };

  const handleContinueToPayment = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log('=== CONTINUE TO PAYMENT (DAILY BOOKING) ===');
    console.log('Camp:', camp);

    if (!user) {
      toast.error(t('reserve.toastSignInRequired'));
      navigate(`/signin?returnTo=${encodeURIComponent(`/reserve?camp=${campId}`)}`, { replace: true });
      return;
    }

    if (!camp) {
      toast.error(t('reserve.toastCampMissing'));
      return;
    }

    // Validation
    if (!selectedDate) {
      toast.error(t('reserve.toastSelectDate'));
      return;
    }

    if (guests < 1) {
      toast.error(t('reserve.toastMinGuest'));
      return;
    }

    if (camp.maxGuests && guests > camp.maxGuests) {
      toast.error(t('reserve.toastMaxGuests', { max: camp.maxGuests }));
      return;
    }

    // Phone checks are skipped when the profile already has a usable number.
    if (!hasProfilePhone) {
      if (!phoneNumber) {
        toast.error(t('reserve.toastPhoneRequired'));
        return;
      }

      // Validate phone number before submission
      if (!validatePhoneNumber(phoneNumber)) {
        const digitsOnly = phoneNumber.replace(/\D/g, '');
        if (digitsOnly.length < 8) {
          setPhoneError(t('reserve.phoneValidMin'));
          toast.error(t('reserve.phoneValidFormat'));
        } else {
          setPhoneError(t('reserve.phoneValidMax'));
          toast.error(t('reserve.phoneValidMax'));
        }
        return;
      }

      // One-time save to the profile so future bookings never ask again.
      // Best-effort: a failure here must not block the booking.
      if (user) {
        updateUserProfile(user.uid, { phone: phoneNumber.trim() }).catch(() => {});
      }
    }

    const bookingDateStr = format(selectedDate, 'yyyy-MM-dd');

    // Prevent multiple bookings by same user on the same date (non-cancelled)
    try {
      const hasBookingSameDay = await hasUserBookingOnDate(user.uid, bookingDateStr);
      if (hasBookingSameDay) {
        toast.error(t('reserve.toastDuplicateBooking'));
        return;
      }
    } catch (error) {
      console.error('❌ Error checking existing bookings for user:', error);
      toast.error(t('reserve.toastExistingBookingError'));
      return;
    }

    // Double-check availability before creating booking
    try {
      const availability = await checkAvailability(camp.id, selectedDate);
      if (!availability.available) {
        toast.error(availability.message);
        return;
      }
    } catch (error) {
      console.error('❌ Final availability check failed:', error);
      toast.error(t('reserve.toastAvailabilityVerifyFailed'));
      return;
    }

    try {
      if (submitting) return;
      setSubmitting(true);
      showLoading(t('loading.creating'));
      
      // Create booking for single day with custom check-in/check-out times
      const nextDay = addDays(selectedDate, 1);
      const nextDayStr = format(nextDay, 'yyyy-MM-dd');

      // Convert times to 24-hour format for storage
      const checkIn24 = convertTo24Hour(checkInTime);
      const checkOut24 = convertTo24Hour(checkOutTime);

      console.log('=== CREATING DAILY BOOKING ===');
      console.log('Check-in time:', checkInTime, '(24h:', checkIn24 + ')');
      console.log('Check-out time:', checkOutTime, '(24h:', checkOut24 + ')');
      
      // FIXED: Match the actual database structure - only include fields with values
      // Remove all undefined values to prevent Firestore errors
      const onlineExpiresAt = Date.now() + 30 * 60 * 1000;
      const bookingData: Record<string, string | number | boolean | object> = {
        // Camp information (matching database structure)
        campId: camp.id,
        campTitle: camp.title,
        campLocation: camp.location,
        campPhoto: camp.photo,
        campPrice: priceBreakdown.basePrice,
        
        // User information
        userId: user.uid,
        userName: userData?.displayName || user.email || 'Guest',
        userEmail: user.email || '',
        
        // Host information
        hostId: camp.hostId,
        hostName: camp.hostName || 'Host',
        hostEmail: camp.hostEmail || '',
        
        // Booking dates and times (matching database format)
        checkIn: `${bookingDateStr} ${checkIn24}`,
        checkOut: `${nextDayStr} ${checkOut24}`,
        checkInDate: bookingDateStr,
        checkOutDate: bookingDateStr, // Same day for daily booking
        
        // Guest and pricing (matching database format)
        guests,
        totalPrice: priceBreakdown.total,
        serviceFee: priceBreakdown.serviceFee,
        taxes: priceBreakdown.tax,
        currency: 'BHD',
        
        // Status (matching database format)
        status: (camp?.instantBook && paymentMethod === 'cash_on_arrival') ? 'confirmed' as const : 'pending' as const, // Instant Book cash bookings confirm immediately
        paymentStatus: 'pending' as const,
        paymentMethod,
        // Expire online-payment bookings after 30 min so unpaid dates are
        // eventually released back to the availability pool.
        ...(paymentMethod !== 'cash_on_arrival'
          ? { expiresAt: onlineExpiresAt }
          : {}),
        
        // Refund policy (matching database format)
        refundPolicy: camp.refundPolicy || 'moderate',
        
        // Tent selection
        tentSelection: {
          large: 0,
          small: 0,
          entertainment: 0
        },
        
        // Price breakdown
        priceBreakdown: {
          basePrice: priceBreakdown.basePrice,
          largeTentPrice: 0,
          smallTentPrice: 0,
          entertainmentTentPrice: 0,
          serviceFee: priceBreakdown.serviceFee,
          tax: priceBreakdown.tax,
          total: priceBreakdown.total
        },
        
        // Camp images
        campImages: camp.photo ? [camp.photo] : [],
      };

      // Only add optional fields if they have values (not empty strings)
      const effectivePhone = hasProfilePhone ? profilePhone : phoneNumber;
      if (effectivePhone) {
        bookingData.userPhone = effectivePhone;
      }
      
      if (specialRequests && specialRequests.trim()) {
        bookingData.specialRequests = specialRequests.trim();
      }

      // Persist the guest's expected arrival time (the form always collected
      // it, but it was never saved before)
      if (arrivalTime) {
        bookingData.arrivalTime = arrivalTime;
      }

      console.log('✅ Complete booking data prepared:', bookingData);

      // Create booking atomically — claims a per-camp/date lock so a
      // concurrent booking for the same date fails cleanly
      const newBookingId = await createBookingWithLock(bookingData, camp.id, bookingDateStr);
      
      // Send email notifications
      try {
        console.log('📧 Sending booking confirmation emails...');
        
        // Recipients and email HTML are derived server-side from the booking
        // record; the client only references the booking it just created.
        const { sendBookingConfirmationToGuest, sendBookingNotificationToHost } = await import('@/lib/emailService');

        await sendBookingConfirmationToGuest({ bookingId: newBookingId });
        console.log('✅ Booking confirmation sent to guest');

        await sendBookingNotificationToHost({ bookingId: newBookingId });
        console.log('✅ Booking notification sent to host');
      } catch (emailError) {
        console.error('❌ Failed to send booking emails:', emailError);
        // Don't block booking creation if emails fail
      }

      console.log('✅ Booking created successfully with ID:', newBookingId);
      setBookingId(newBookingId);
      setBookingExpiresAt(paymentMethod !== 'cash_on_arrival' ? onlineExpiresAt : null);
      setShowPayment(true);
      // Truthful post-reservation message: online bookings are held pending
      // payment (not "created successfully"); cash bookings are requested.
      toast.success(
        paymentMethod !== 'cash_on_arrival'
          ? t('reserve.toastHeldPending')
          : t('reserve.toastCashRequested'),
      );
      
      // Reload availability to reflect the new booking
      await loadAvailability(camp.id);
      
      // Scroll to payment section
      setTimeout(() => {
        document.getElementById('payment-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      
    } catch (error) {
      console.error('❌ Error creating booking:', error);
      if (error instanceof DateUnavailableError) {
        // Someone else booked this date first — don't send the user to payment
        toast.error(t('reserve.toastDateJustBooked'));
        setSelectedDate(null);
        await loadAvailability(camp.id);
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        toast.error(t('reserve.toastCreateFailed', { error: errorMessage }));
      }
    } finally {
      setSubmitting(false);
      hideLoading();
    }
  };

  const handleBack = () => {
    if (showPayment) {
      setShowPayment(false);
      return;
    }
    
    const originalFrom = location.state?.originalFrom || location.state?.from;
    
    if (originalFrom) {
      navigate(originalFrom, { replace: true });
    } else if (camp) {
      navigate(`/camp/${camp.id}`, { replace: true });
    } else {
      navigate('/', { replace: true });
    }
  };

  if (loading || loadingCamp) {
    // Loading is handled by CustomLoading component via useLoading hook
    return null;
  }

  if (!camp) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-50" />
        <Card className="bg-card/60 backdrop-blur-md border border-border/50 p-8 text-center shadow-[0_8px_30px_rgba(0,0,0,0.5)] max-w-md w-full relative z-10">
          <h2 className="text-2xl font-bold text-foreground mb-4 font-sans tracking-normal">{t('reserve.campNotFound')}</h2>
          <Button
            onClick={() => navigate('/')}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-[0_0_15px_rgba(212,175,55,0.2)] w-full"
          >
            {t('reserve.backToSearch')}
          </Button>
        </Card>
      </div>
    );
  }

  if (blockedStatus && blockedStatus !== 'active') {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-50" />
        <Card className="bg-card/60 backdrop-blur-md border border-border/50 p-8 text-center shadow-[0_8px_30px_rgba(0,0,0,0.5)] max-w-xl relative z-10">
          <h2 className="text-2xl font-bold text-foreground mb-3 font-sans tracking-normal">{t('reserve.bookingUnavailable')}</h2>
          <p className="text-muted-foreground font-light mb-6">
            {t('reserve.bookingUnavailableDesc', { status: blockedStatus.replace('-', ' ') })}
          </p>
          <div className="flex gap-4 justify-center">
            <Button
              onClick={() => navigate('/host')}
              variant="outline"
              className="border border-border/80 bg-background/50 text-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/50"
            >
              {t('reserve.backToHost')}
            </Button>
            <Button
              onClick={() => navigate(`/camp/${camp.id}`)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-[0_0_15px_rgba(212,175,55,0.2)]"
            >
              {t('reserve.viewListing')}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const totalTents = getTotalTents();

  return (
    <div className="min-h-screen bg-background p-4 relative" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 pointer-events-none"></div>
      <div className="max-w-6xl mx-auto pt-6 sm:pt-8 pb-20 relative z-10">
        <Button
          onClick={handleBack}
          variant="ghost"
          className="mb-4 sm:mb-6 text-muted-foreground hover:text-foreground hover:bg-secondary font-medium"
        >
          <ArrowLeft className={`w-4 h-4 ${isRTL ? 'ml-2 rotate-180' : 'mr-2'}`} />
          {t('reserve.back')}
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-3 font-sans tracking-normal">
            {showPayment ? t('reserve.reserveCreated') : t('reserve.completeTitle')}
          </h1>
          <p className="text-muted-foreground font-light">
            {showPayment ? '' : `${t('reserve.completeTitle')} (${checkInTime} - ${checkOutTime} ${t('common.nextDay')})`}
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {!showPayment ? (
              <Card className="bg-card/60 backdrop-blur-md border border-border/50 p-8 shadow-lg rounded-2xl">
                <form onSubmit={handleContinueToPayment} className="space-y-8">
                  {/* Date Selection with New Calendar */}
                  <div id="booking-calendar-section">
                    {loadingAvailability ? (
                      <div className="flex items-center justify-center py-12">
                        <CampfireLoader size="md" />
                        <p className={`${isRTL ? 'mr-4' : 'ml-4'} text-muted-foreground font-light`}>{t('messages.loadingAvailability')}</p>
                      </div>
                    ) : availabilityError ? (
                      <div className="p-5 bg-red-500/10 border border-red-500/20 rounded-2xl text-sm text-red-400">
                        <p className="font-semibold mb-2">{t('messages.availabilityError')}</p>
                        <p className="font-light">{availabilityError}</p>
                        <Button
                          type="button"
                          variant="outline"
                          className="mt-4 border-red-500/30 text-red-400 hover:bg-red-500/20"
                          onClick={() => campId && loadAvailability(campId)}
                        >
                          {t('messages.retryAvailability')}
                        </Button>
                      </div>
                    ) : (
                      <BookingCalendar
                        campId={camp.id}
                        bookedDates={bookedDates}
                        blockedDates={blockedDates}
                        selectedDate={selectedDate}
                        onDateSelect={handleDateSelect}
                        minDate={new Date()}
                        checkInTime={checkInTime}
                        checkOutTime={checkOutTime}
                        disabled={checkingAvailability}
                        camp={camp}
                      />
                    )}
                    
                    {checkingAvailability && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-4 font-light">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        {t('reserve.checkingAvailabilityShort')}
                      </div>
                    )}
                  </div>

                  {/* Arrival Time */}
                  <div className="space-y-3">
                    <Label htmlFor="arrivalTime" className="flex items-center gap-2 text-foreground font-semibold font-sans tracking-normal text-sm">
                      <Clock className="w-4 h-4 text-primary" />
                      {t('reserve.arrivalTime')}
                    </Label>
                    <Input
                      id="arrivalTime"
                      type="time"
                      value={arrivalTime}
                      onChange={(e) => setArrivalTime(e.target.value)}
                      className="border-border/80 focus:border-primary text-foreground bg-background/50 h-12"
                    />
                    <p className="text-xs text-muted-foreground font-light">
                      {t('reserve.checkinHint', { time: checkInTime })}
                    </p>
                  </div>

                  {/* Guests */}
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2 font-sans tracking-normal">
                      <Users className="w-5 h-5 text-primary" />
                      {t('reserve.guests')}
                    </h3>
                    {camp.maxGuests && (
                      <p className="text-sm text-muted-foreground font-light mb-4">
                        {t('reserve.guestsHint', { max: camp.maxGuests })}
                      </p>
                    )}
                    <div className="flex items-center gap-3 max-w-sm">
                      <Button
                        type="button"
                        onClick={() => setGuests(Math.max(1, guests - 1))}
                        variant="outline"
                        className="w-12 h-12 border border-border/80 text-foreground bg-background/50 hover:bg-primary/10 hover:text-primary hover:border-primary/50 text-xl font-light rounded-2xl"
                      >
                        -
                      </Button>
                      <div className="flex-1">
                        <Input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={guests}
                          onChange={(e) => {
                            const numeric = e.target.value.replace(/\D/g, '');
                            const val = numeric ? parseInt(numeric, 10) : 0;
                            if (!val) {
                              setGuests(1);
                              return;
                            }
                            if (camp.maxGuests && val > camp.maxGuests) {
                              setGuests(camp.maxGuests);
                              return;
                            }
                            setGuests(val);
                          }}
                          onBlur={() => {
                            if (guests < 1) setGuests(1);
                            if (camp.maxGuests && guests > camp.maxGuests) setGuests(camp.maxGuests);
                          }}
                          className="h-12 text-center text-xl font-bold border border-border/80 focus:border-primary no-spin bg-background/50 rounded-2xl font-sans"
                        />
                      </div>
                      <Button
                        type="button"
                        onClick={() => setGuests(camp.maxGuests ? Math.min(camp.maxGuests, guests + 1) : guests + 1)}
                        variant="outline"
                        className="w-12 h-12 border border-border/80 text-foreground bg-background/50 hover:bg-primary/10 hover:text-primary hover:border-primary/50 text-xl font-light rounded-2xl"
                      >
                        +
                      </Button>
                    </div>
                  </div>

                  {/* Contact Information — only asked when the profile has no phone yet */}
                  {!hasProfilePhone && (
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2 font-sans tracking-normal">
                      <Phone className="w-5 h-5 text-primary" />
                      {t('reserve.contactInfo')}
                    </h3>
                    <div className="space-y-3">
                      <Label htmlFor="phone" className="text-foreground font-semibold font-sans tracking-normal text-sm">
                        {t('reserve.phone')} <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+973 XXXX XXXX"
                        value={phoneNumber}
                        onChange={(e) => handlePhoneChange(e.target.value)}
                        onBlur={() => {
                          if (phoneNumber && !validatePhoneNumber(phoneNumber)) {
                            const digitsOnly = phoneNumber.replace(/\D/g, '');
                            if (digitsOnly.length < 8) {
                              setPhoneError(t('reserve.phoneValidMin'));
                            } else if (digitsOnly.length > 15) {
                              setPhoneError(t('reserve.phoneValidMax'));
                            }
                          }
                        }}
                        required
                        className={`border-border/80 focus:border-primary text-foreground placeholder:text-muted-foreground bg-background/50 h-12 ${
                          phoneError ? 'border-red-500 focus:border-red-500' : ''
                        }`}
                      />
                      {phoneError && (
                        <p className="text-xs text-red-500 font-medium flex items-center gap-1 mt-2">
                          <AlertCircle className="w-3 h-3" />
                          {phoneError}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground font-light mt-2">
                        {t('reserve.phoneHelper')}
                      </p>
                    </div>
                  </div>
                  )}

                  {/* Special Requests */}
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2 font-sans tracking-normal">
                      <MessageSquare className="w-5 h-5 text-primary" />
                      {t('reserve.specialRequests')}
                    </h3>
                    <Textarea
                      placeholder={t('reserve.specialRequestsPlaceholder')}
                      value={specialRequests}
                      onChange={(e) => setSpecialRequests(e.target.value)}
                      rows={4}
                      className="border-border/80 focus:border-primary resize-none text-foreground placeholder:text-muted-foreground bg-background/50"
                    />
                  </div>

                  {/* Payment Method - FIXED CONTRAST */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-foreground font-sans tracking-normal">{t('reserve.paymentMethod')}</h3>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('online')}
                        className={`w-full rounded-2xl border p-5 text-${isRTL ? 'right' : 'left'} transition-all ${
                          paymentMethod === 'online'
                            ? 'border-primary bg-primary/10 shadow-[0_0_15px_rgba(212,175,55,0.1)]'
                            : 'border-border/80 hover:border-primary/50 bg-background/50'
                        }`}
                      >
                        <p className="font-bold text-foreground text-base mb-1 font-sans tracking-wide">{t('reserve.payOnline')}</p>
                        <p className="text-sm text-muted-foreground font-light">{t('reserve.payOnlineDesc')}</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('cash_on_arrival')}
                        className={`w-full rounded-2xl border p-5 text-${isRTL ? 'right' : 'left'} transition-all ${
                          paymentMethod === 'cash_on_arrival'
                            ? 'border-primary bg-primary/10 shadow-[0_0_15px_rgba(212,175,55,0.1)]'
                            : 'border-border/80 hover:border-primary/50 bg-background/50'
                        }`}
                      >
                        <p className="font-bold text-foreground text-base mb-1 font-sans tracking-wide">{t('reserve.cashOnArrival')}</p>
                        <p className="text-sm text-muted-foreground font-light">{t('reserve.cashOnArrivalDesc')}</p>
                      </button>
                    </div>
                  </div>

                  {/* Concise cancellation-policy summary directly above the CTA */}
                  <div className={`p-4 bg-background/50 border border-border/80 rounded-2xl text-${isRTL ? 'right' : 'left'} mt-4`}>
                    <p className="text-sm text-muted-foreground font-light">
                      {t('reserve.policyAbove', { policy: t(policySummaryKey) })}
                    </p>
                  </div>

                  <Button
                    type="submit"
                    disabled={!selectedDate || loadingAvailability || !!availabilityError || checkingAvailability || submitting || !!phoneError}
                    className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:shadow-[0_0_30px_rgba(212,175,55,0.5)] transition-all font-sans tracking-wide rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                  >
                    {checkingAvailability ? t('reserve.checkingAvailability') : submitting ? t('reserve.creatingReservation') : t('reserve.createReservation')}
                  </Button>
                </form>
              </Card>
            ) : (
              <Card id="payment-section" className="bg-card/60 backdrop-blur-md border border-border/50 p-8 shadow-[0_8px_30px_rgba(0,0,0,0.5)] rounded-2xl">
                <div className="text-center space-y-8">
                  <div className="w-24 h-24 bg-primary/10 rounded-full mx-auto flex items-center justify-center border border-primary/20">
                    <AlertCircle className="w-12 h-12 text-primary" />
                  </div>
                  
                  <div>
                    <h3 className="text-3xl font-bold text-foreground mb-3 font-sans tracking-normal">
                      {paymentMethod === 'cash_on_arrival'
                        ? t('reserve.cashConfirmTitle')
                        : t('reserve.heldTitle')}
                    </h3>
                    <p className="text-muted-foreground font-light text-lg">
                      {paymentMethod === 'cash_on_arrival'
                        ? t('reserve.cashConfirmDesc')
                        : t('reserve.heldDesc')}
                    </p>
                    {paymentMethod !== 'cash_on_arrival' && bookingExpiresAt && (
                      <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/30 rounded-full">
                        <Clock className="w-4 h-4 text-primary" />
                        <span className="text-sm font-bold text-foreground" dir="ltr">
                          {countdownMs > 0
                            ? t('reserve.expiresIn', { mins: countdownMins, secs: String(countdownSecs).padStart(2, '0') })
                            : t('reserve.expiresNow')}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className={`space-y-4 text-${isRTL ? 'right' : 'left'} bg-background/50 p-6 rounded-2xl border border-border/80`}>
                    <p className="text-sm font-bold text-foreground mb-4 font-sans tracking-wider uppercase">{t('reserve.bookingDetailsHeading')}</p>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground font-light uppercase tracking-widest">{t('reserve.bookingId')}</span>
                        <span className="text-sm font-semibold text-foreground font-mono" dir="ltr">{bookingId}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground font-light uppercase tracking-widest">{t('reserve.statusLabel')}</span>
                        <div className="flex gap-2 items-center">
                          <Badge variant="secondary" className="bg-primary/10 text-foreground border border-primary/30 font-semibold shadow-sm">
                            {t('reserve.pendingStatus')}
                          </Badge>
                          <Badge variant="secondary" className="bg-secondary text-foreground border border-border/80 font-semibold shadow-sm">
                            {paymentMethod === 'cash_on_arrival' ? t('reserve.methodCash') : t('reserve.methodOnline')}
                          </Badge>
                        </div>
                      </div>
                      {selectedDate && (
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground font-light uppercase tracking-widest">{t('reserve.dateLabel')}</span>
                          <span className="text-sm font-semibold text-foreground">
                            {selectedDate.toLocaleDateString(i18n.language === 'ar' ? 'ar-BH' : 'en-US', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground font-light uppercase tracking-widest">{t('reserve.checkInLabel')}</span>
                        <span className="text-sm font-semibold text-foreground">{checkInTime}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground font-light uppercase tracking-widest">{t('reserve.checkOutLabel')}</span>
                        <span className="text-sm font-semibold text-foreground">{checkOutTime} <span className="text-muted-foreground font-light text-xs">({t('common.nextDay')})</span></span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground font-light uppercase tracking-widest">{t('reserve.guestsLabelPayment')}</span>
                        <span className="text-sm font-semibold text-foreground">{guests}</span>
                      </div>
                      <div className="flex justify-between items-center pt-4 border-t border-border/50">
                        <span className="text-sm font-bold text-foreground font-sans tracking-wide">{t('reserve.totalAmountLabel')}</span>
                        <span className="text-xl font-bold text-foreground font-sans tracking-tight">
                          {priceBreakdown.total.toFixed(3)} {t('common.currency')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {paymentError && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-sm text-red-400 font-medium">
                      {paymentError}
                    </div>
                  )}

                  {paymentMethod !== 'cash_on_arrival' ? (
                    <>
                      {/* Single checkout action for held online bookings */}
                      <Button
                        onClick={handlePayNow}
                        disabled={paying || countdownMs <= 0}
                        className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:shadow-[0_0_30px_rgba(212,175,55,0.5)] transition-all font-sans tracking-wide rounded-2xl disabled:opacity-50"
                      >
                        {paying ? t('reserve.payNowButton') : t('reserve.payNowCta')}
                      </Button>

                      <div className={`p-5 bg-primary/10 rounded-2xl border border-primary/20 text-${isRTL ? 'right' : 'left'} space-y-2`}>
                        <p className="text-sm font-semibold text-foreground font-sans tracking-normal">
                          📱 {t('reserve.whatsNext')}
                        </p>
                        <p className="text-sm text-muted-foreground font-light">
                          {t('reserve.methodsSupported')}
                        </p>
                      </div>
                    </>
                  ) : (
                    /* Cash bookings: pay-on-arrival next steps, never an online CTA */
                    <div className={`p-5 bg-primary/10 rounded-2xl border border-primary/20 text-${isRTL ? 'right' : 'left'} space-y-2`}>
                      <p className="text-sm font-semibold text-foreground font-sans tracking-normal">
                        {t('reserve.cashNextSteps')}
                      </p>
                      <ul className="text-sm text-muted-foreground font-light space-y-1 list-disc list-inside">
                        <li>{t('reserve.cashStep1')}</li>
                        <li>{t('reserve.cashStep2')}</li>
                        <li>{t('reserve.cashStep3')}</li>
                      </ul>
                    </div>
                  )}

                  <div className="flex gap-4">
                    <Button
                      onClick={() => navigate('/bookings')}
                      className="flex-1 h-12 bg-secondary hover:bg-primary/10 text-foreground border border-border/80 hover:border-primary/50 font-semibold rounded-2xl"
                    >
                      {t('reserve.viewBookings')}
                    </Button>
                    <Button
                      onClick={() => navigate('/')}
                      variant="outline"
                      className="flex-1 h-12 border border-border/80 text-foreground bg-background/50 hover:bg-primary/10 hover:border-primary/50 font-semibold rounded-2xl"
                    >
                      {t('reserve.backHome')}
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              {/* Camp Info */}
                  <Card className="bg-card/60 backdrop-blur-md border border-border/50 overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.5)] rounded-2xl">
                <div className="relative h-48">
                  <img
                    src={camp.photo}
                    alt={camp.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent opacity-80" />
                </div>
                <div className="p-6 relative">
                  <h3 className="font-semibold text-xl text-foreground mb-2 font-sans tracking-wide">{camp.title}</h3>
                  <p className="text-sm text-muted-foreground font-light mb-4">{camp.location}</p>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    {camp.maxGuests && (
                      <Badge variant="secondary" className="bg-primary/10 text-foreground border border-primary/20 font-semibold">
                        <Users className={`w-3 h-3 ${isRTL ? 'ml-1.5' : 'mr-1.5'}`} />
                        {t('reserve.upToGuests', { max: camp.maxGuests })}
                      </Badge>
                    )}
                    {totalTents > 0 && (
                      <Badge variant="secondary" className="bg-primary/10 text-foreground border border-primary/20 font-semibold">
                        <Tent className={`w-3 h-3 ${isRTL ? 'ml-1.5' : 'mr-1.5'}`} />
                        {t('reserve.tentsLabel', { count: totalTents })}
                      </Badge>
                    )}
                  </div>
                  
                  <RefundPolicyBadge 
                    policy={(camp.refundPolicy === 'refundable' || camp.refundPolicy === 'non-refundable' ? camp.refundPolicy : 'refundable') as 'refundable' | 'non-refundable'}
                    showTooltip={true}
                  />
                </div>
              </Card>

              {/* Price Summary */}
              {selectedDate && (
                <Card className="bg-card/60 backdrop-blur-md border border-border/50 p-6 shadow-[0_8px_30px_rgba(0,0,0,0.5)] rounded-2xl">
                  <h3 className="font-semibold text-lg text-foreground mb-4 font-sans tracking-normal">{t('reserve.priceBreakdownTitle')}</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-sm">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-muted-foreground font-light uppercase tracking-widest">{t('reserve.pricePerDay', { price: priceBreakdown.basePrice.toFixed(3) })}</span>
                        {priceBreakdown.kind !== 'standard' && (
                          <span className="text-[11px] font-semibold text-primary uppercase tracking-wide">
                            {priceBreakdown.kind === 'holiday' ? t('reserve.holidayRateLabel') : t('reserve.weekendRateLabel')}
                          </span>
                        )}
                      </div>
                      <span className="text-foreground font-semibold">{priceBreakdown.basePrice.toFixed(3)} {t('common.currency')}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-xs text-muted-foreground font-light uppercase tracking-widest">{t('reserve.serviceFeeLabel')}</span>
                      <span className="text-foreground font-semibold">{priceBreakdown.serviceFee.toFixed(3)} {t('common.currency')}</span>
                    </div>
                    <div className="border-t border-border/50 pt-4">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-foreground font-sans tracking-wide">{t('reserve.totalLabel')}</span>
                        <span className="font-bold text-2xl text-foreground font-sans tracking-tight">
                          {priceBreakdown.total.toFixed(3)} {t('common.currency')}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
