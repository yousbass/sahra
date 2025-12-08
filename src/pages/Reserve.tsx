import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Clock, Users, Phone, MessageSquare, ArrowLeft, Loader2, Tent, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getCampById, createBooking, hasUserBookingOnDate } from '@/lib/firestore';
import { format, addDays } from 'date-fns';
import { toast } from 'sonner';
import { BookingCalendar } from '@/components/BookingCalendar';
import { RefundPolicyBadge } from '@/components/RefundPolicyBadge';
import { getBookedDates } from '@/lib/availability';
import { getBlockedDates, getBlockedDatesList } from '@/lib/dateBlocking';
import { checkAvailability } from '@/lib/availability';
import { LegacyCamp, normalizeCampToLegacy } from '@/lib/dataCompatibility';
import { createPaymentSession } from '@/lib/payments';
import { useTranslation } from 'react-i18next';
import { useLoading } from '@/contexts/LoadingContext';

export default function Reserve() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, userData, loading } = useAuth();
  const campId = searchParams.get('camp');
  const { showLoading, hideLoading } = useLoading();

  const [camp, setCamp] = useState<LegacyCamp | null>(null);
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
  const [specialRequests, setSpecialRequests] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'cash_on_arrival'>('online');
  
  // Payment states
  const [showPayment, setShowPayment] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [blockedStatus, setBlockedStatus] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { t } = useTranslation();

  // Get check-in and check-out times with defaults
  const checkInTime = camp?.checkInTime || '08:00 AM';
  const checkOutTime = camp?.checkOutTime || '03:00 AM';

  useEffect(() => {
    console.log('=== RESERVE PAGE (DAILY BOOKING WITH AVAILABILITY) ===');
    console.log('Auth loading:', loading);
    console.log('User:', user);
    console.log('User data:', userData);
    console.log('Camp ID from URL:', campId);
    
    // Wait for auth to finish loading before checking
    if (loading) return;

    if (!user || !userData) {
      toast.error(t('reserve.toastSignInRequired'));
      navigate('/signin');
      return;
    }

    if (campId) {
      loadCamp(campId);
      loadAvailability(campId);
    } else {
      console.log('❌ No camp ID provided in URL');
      setLoadingCamp(false);
    }
  }, [campId, user, userData, loading, navigate]);

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
      setCamp(mergedCamp);
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
        `${window.location.origin}/payment-success?bookingId=${bookingId}`;

      const session = await createPaymentSession({
        amount: priceBreakdown.total,
        currency: 'BHD',
        bookingId,
        customer: {
          name: userData?.displayName || user?.email || 'Guest',
          email: user?.email || undefined,
          phone: phoneNumber || undefined,
        },
        redirectUrl,
      });

      if (!session.success || !session.paymentUrl) {
        setPaymentError(session.error || 'Could not start payment');
        toast.error(session.error || 'Could not start payment');
        return;
      }

      window.location.href = session.paymentUrl;
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
      const errorCode = (error as { code?: string })?.code;
      if (errorCode === 'permission-denied') {
        setAvailabilityError(t('reserve.toastSignInAvailability'));
        toast.error(t('reserve.toastSignInAvailability'));
      } else {
        toast.error(t('messages.availabilityError'));
      }
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

  // Calculate price for single day
  const calculateDayPrice = () => {
    if (!camp || !selectedDate) return { basePrice: 0, serviceFee: 0, tax: 0, total: 0 };
    
    // Base price per day (flat, not per guest)
    const basePrice = camp.price;
    
    // Service fee (10%)
    const serviceFee = basePrice * 0.10;
    
    return {
      basePrice,
      serviceFee,
      tax: 0,
      total: basePrice + serviceFee
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
    console.log('User:', user);
    console.log('Camp:', camp);

    if (!user) {
      toast.error(t('reserve.toastSignInRequired'));
      navigate('/signin');
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

    if (!phoneNumber) {
      toast.error(t('reserve.toastPhoneRequired'));
      return;
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
      const bookingData: Record<string, string | number | boolean | object> = {
        // Camp information (matching database structure)
        campId: camp.id,
        campTitle: camp.title,
        campLocation: camp.location,
        campPhoto: camp.photo,
        campPrice: camp.price,
        
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
        status: paymentMethod === 'cash_on_arrival' ? ('confirmed' as const) : ('pending' as const),
        paymentStatus: 'pending' as const,
        paymentMethod,
        
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
      if (phoneNumber) {
        bookingData.userPhone = phoneNumber;
      }
      
      if (specialRequests && specialRequests.trim()) {
        bookingData.specialRequests = specialRequests.trim();
      }

      console.log('✅ Complete booking data prepared:', bookingData);

      // Call createBooking with only 1 parameter
      const newBookingId = await createBooking(bookingData);
      
      // Send email notifications
      try {
        console.log('📧 Sending booking confirmation emails...');
        
        // Dynamic import email service
        const { sendBookingConfirmationToGuest, sendBookingNotificationToHost } = await import('@/lib/emailService');
        const { getDoc, doc } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase');

        const supportEmail = import.meta.env.VITE_SUPPORT_EMAIL || 'support@mukhymat.com';
        const fallbackHostEmail = camp.hostEmail || supportEmail;

        // Prepare booking data for emails
        const emailBookingData = {
          bookingId: newBookingId,
          campName: camp.title,
          campLocation: camp.location,
          checkInDate: bookingDateStr,
          checkOutDate: bookingDateStr,
          numberOfGuests: guests,
          totalAmount: priceBreakdown.total,
          guestName: userData?.displayName || user.email || 'Guest',
          hostName: camp.hostName || 'Host',
          cancellationPolicy: 'moderate' as const
        };
        
        // Send confirmation to guest
        if (user.email) {
          await sendBookingConfirmationToGuest(
            emailBookingData,
            user.email,
            '' // hostEmail parameter
          );
          console.log('✅ Booking confirmation sent to guest');
        }
        
        // Get host email and send notification
        let hostEmail = fallbackHostEmail;
        try {
          const hostDoc = await getDoc(doc(db, 'users', camp.hostId));
          hostEmail = hostDoc.data()?.email || fallbackHostEmail;
        } catch (hostFetchError) {
          console.warn('⚠️ Could not fetch host email, using fallback:', hostFetchError);
        }
        
        if (hostEmail && user.email) {
          await sendBookingNotificationToHost(
            emailBookingData,
            hostEmail,
            user.email
          );
          console.log('✅ Booking notification sent to host');
        } else {
          console.warn('⚠️ Host email missing; booking notification skipped');
        }
      } catch (emailError) {
        console.error('❌ Failed to send booking emails:', emailError);
        // Don't block booking creation if emails fail
      }

      console.log('✅ Booking created successfully with ID:', newBookingId);
      setBookingId(newBookingId);
      setShowPayment(true);
      toast.success(t('reserve.toastReservationCreated'));
      
      // Reload availability to reflect the new booking
      await loadAvailability(camp.id);
      
      // Scroll to payment section
      setTimeout(() => {
        document.getElementById('payment-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      
    } catch (error) {
      console.error('❌ Error creating booking:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(t('reserve.toastCreateFailed', { error: errorMessage }));
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
      <div className="min-h-screen bg-gradient-to-b from-orange-50 via-orange-100 to-orange-200 p-4 flex items-center justify-center">
        <Card className="bg-white/95 backdrop-blur-sm border-orange-300 p-8 text-center shadow-xl">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('reserve.campNotFound')}</h2>
          <Button
            onClick={() => navigate('/')}
            className="bg-gradient-to-r from-#8B5A3C to-#6B4423 hover:from-#6B4423 hover:to-#5A3820 text-white font-semibold"
          >
            {t('reserve.backToSearch')}
          </Button>
        </Card>
      </div>
    );
  }

  if (blockedStatus && blockedStatus !== 'active') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-50 via-orange-100 to-orange-200 p-4 flex items-center justify-center">
        <Card className="bg-white/95 backdrop-blur-sm border-orange-300 p-8 text-center shadow-xl max-w-xl">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">{t('reserve.bookingUnavailable')}</h2>
          <p className="text-gray-700 font-medium mb-6">
            {t('reserve.bookingUnavailableDesc', { status: blockedStatus.replace('-', ' ') })}
          </p>
          <div className="flex gap-3 justify-center">
            <Button
              onClick={() => navigate('/host')}
              variant="outline"
              className="border-2 border-orange-300 text-gray-900 hover:bg-orange-50 font-semibold"
            >
              {t('reserve.backToHost')}
            </Button>
            <Button
              onClick={() => navigate(`/camp/${camp.id}`)}
              className="bg-gradient-to-r from-#8B5A3C to-#6B4423 hover:from-#6B4423 hover:to-#5A3820 text-white font-semibold"
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
    <div className="min-h-screen bg-gradient-to-b from-orange-50 via-orange-100 to-orange-200 p-4">
      <div className="max-w-6xl mx-auto pt-6 sm:pt-8 pb-20">
        <Button
          onClick={handleBack}
          variant="ghost"
          className="mb-4 sm:mb-6 text-gray-900 hover:text-gray-950 hover:bg-orange-100 font-medium"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('reserve.back')}
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            {showPayment ? t('reserve.reserveCreated') : t('reserve.completeTitle')}
          </h1>
          <p className="text-gray-700 font-medium">
            {showPayment ? '' : `${t('reserve.completeTitle')} (${checkInTime} - ${checkOutTime} next day)`}
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {!showPayment ? (
              <Card className="bg-white/95 backdrop-blur-sm border-orange-300 p-6 shadow-xl">
                <form onSubmit={handleContinueToPayment} className="space-y-6">
                  {/* Date Selection with New Calendar */}
                  <div id="booking-calendar-section">
                    {loadingAvailability ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 text-#6B4423 animate-spin" />
                        <p className="ml-4 text-gray-600">{t('messages.loadingAvailability')}</p>
                      </div>
                    ) : availabilityError ? (
                      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                        <p className="font-semibold mb-1">{t('messages.availabilityError')}</p>
                        <p>{availabilityError}</p>
                        <Button
                          type="button"
                          variant="outline"
                          className="mt-3 border-red-300 text-red-700 hover:bg-red-100"
                          onClick={() => navigate('/signin')}
                        >
                          {t('messages.signInAgain')}
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
                      />
                    )}
                    
                    {checkingAvailability && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 mt-4">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {t('reserve.checkingAvailabilityShort')}
                      </div>
                    )}
                  </div>

                  {/* Arrival Time */}
                  <div className="space-y-2">
                    <Label htmlFor="arrivalTime" className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-#6B4423" />
                      {t('reserve.arrivalTime')}
                    </Label>
                    <Input
                      id="arrivalTime"
                      type="time"
                      value={arrivalTime}
                      onChange={(e) => setArrivalTime(e.target.value)}
                      className="border-orange-300 focus:border-#8B5A3C text-gray-900"
                    />
                    <p className="text-xs text-gray-600 font-medium">
                      {t('reserve.checkinHint', { time: checkInTime })}
                    </p>
                  </div>

                  {/* Guests */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Users className="w-5 h-5 text-#6B4423" />
                      {t('reserve.guests')}
                    </h3>
                    {camp.maxGuests && (
                      <p className="text-sm text-gray-700 font-medium mb-3">
                        {t('reserve.guestsHint', { max: camp.maxGuests })}
                      </p>
                    )}
                    <div className="flex items-center gap-3">
                      <Button
                        type="button"
                        onClick={() => setGuests(Math.max(1, guests - 1))}
                        variant="outline"
                        className="w-12 h-12 border-2 border-orange-300 text-gray-900 hover:bg-orange-50 font-semibold"
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
                          className="h-12 text-center text-xl font-semibold border-2 border-orange-300 focus:border-#8B5A3C no-spin"
                        />
                        <p className="text-sm text-gray-700 mt-1 text-center font-medium">
                          {t('reserve.guestsLabelShort')}
                        </p>
                      </div>
                      <Button
                        type="button"
                        onClick={() => setGuests(camp.maxGuests ? Math.min(camp.maxGuests, guests + 1) : guests + 1)}
                        variant="outline"
                        className="w-12 h-12 border-2 border-orange-300 text-gray-900 hover:bg-orange-50 font-semibold"
                      >
                        +
                      </Button>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Phone className="w-5 h-5 text-#6B4423" />
                      {t('reserve.contactInfo')}
                    </h3>
                    <div className="space-y-2">
                      <Label htmlFor="phone">{t('reserve.phone')}</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+973 XXXX XXXX"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        required
                        className="border-orange-300 focus:border-#8B5A3C text-gray-900 placeholder:text-gray-400"
                      />
                    </div>
                  </div>

                  {/* Special Requests */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-#6B4423" />
                      {t('reserve.specialRequests')}
                    </h3>
                    <Textarea
                      placeholder={t('reserve.specialRequestsPlaceholder')}
                      value={specialRequests}
                      onChange={(e) => setSpecialRequests(e.target.value)}
                      rows={4}
                      className="border-orange-300 focus:border-#8B5A3C resize-none text-gray-900 placeholder:text-gray-400"
                    />
                  </div>

                  {/* Payment Method */}
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-gray-900">{t('reserve.paymentMethod')}</h3>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('online')}
                        className={`w-full rounded-xl border-2 p-4 text-left transition ${
                          paymentMethod === 'online'
                            ? 'border-#8B5A3C bg-orange-50 shadow-md'
                            : 'border-orange-300 hover:border-orange-300 bg-white'
                        }`}
                      >
                        <p className="font-semibold text-gray-900">{t('reserve.payOnline')}</p>
                        <p className="text-sm text-gray-700">{t('reserve.payOnlineDesc')}</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('cash_on_arrival')}
                        className={`w-full rounded-xl border-2 p-4 text-left transition ${
                          paymentMethod === 'cash_on_arrival'
                            ? 'border-#8B5A3C bg-orange-50 shadow-md'
                            : 'border-orange-300 hover:border-orange-300 bg-white'
                        }`}
                      >
                        <p className="font-semibold text-gray-900">{t('reserve.cashOnArrival')}</p>
                        <p className="text-sm text-gray-700">{t('reserve.cashOnArrivalDesc')}</p>
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={!selectedDate || checkingAvailability || submitting}
                    className="w-full h-14 bg-gradient-to-r from-#8B5A3C to-#6B4423 hover:from-#6B4423 hover:to-#5A3820 text-white font-semibold text-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {checkingAvailability ? t('reserve.checkingAvailability') : submitting ? t('reserve.creatingReservation') : t('reserve.createReservation')}
                  </Button>
                </form>
              </Card>
            ) : (
              <Card id="payment-section" className="bg-white/95 backdrop-blur-sm border-orange-300 p-6 shadow-xl">
                <div className="text-center space-y-6">
                  <div className="w-20 h-20 bg-amber-100 rounded-full mx-auto flex items-center justify-center">
                    <AlertCircle className="w-10 h-10 text-[#FF8C42]" />
                  </div>
                  
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{t('reserve.paymentSuccessTitle')}</h3>
                    <p className="text-gray-700 font-medium">
                      {paymentMethod === 'cash_on_arrival'
                        ? t('reserve.paymentInstructionCash')
                        : t('reserve.paymentInstructionOnline')}
                    </p>
                  </div>

                  <div className="space-y-3 text-left bg-orange-50 p-6 rounded-lg border-2 border-orange-200">
                    <p className="text-sm font-bold text-gray-900 mb-3">{t('reserve.bookingDetailsHeading')}</p>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-700">{t('reserve.bookingId')}</span>
                        <span className="text-sm font-semibold text-gray-900">{bookingId}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-700">{t('reserve.statusLabel')}</span>
                        <div className="flex gap-2 items-center">
                          <Badge variant="secondary" className="bg-amber-100 text-amber-900 border border-orange-300">
                            {t('reserve.pendingStatus')}
                          </Badge>
                          <Badge variant="secondary" className="bg-orange-100 text-gray-900 border border-orange-300">
                            {paymentMethod === 'cash_on_arrival' ? t('reserve.methodCash') : t('reserve.methodOnline')}
                          </Badge>
                        </div>
                      </div>
                      {selectedDate && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-700">{t('reserve.dateLabel')}</span>
                          <span className="text-sm font-semibold text-gray-900">
                            {format(selectedDate, 'EEEE, MMM dd, yyyy')}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-700">{t('reserve.checkInLabel')}</span>
                        <span className="text-sm font-semibold text-gray-900">{checkInTime}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-700">{t('reserve.checkOutLabel')}</span>
                        <span className="text-sm font-semibold text-gray-900">{checkOutTime} (next day)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-700">{t('reserve.guestsLabelPayment')}</span>
                        <span className="text-sm font-semibold text-gray-900">{guests}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-orange-300">
                        <span className="text-sm font-bold text-gray-900">{t('reserve.totalAmountLabel')}</span>
                        <span className="text-lg font-bold text-#6B4423">
                          {priceBreakdown.total.toFixed(3)} BD
                        </span>
                      </div>
                    </div>
                  </div>

                  {paymentError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                      {paymentError}
                    </div>
                  )}

                  <Button
                    onClick={handlePayNow}
                    disabled={paying}
                    className="w-full h-12 bg-#6B4423 hover:bg-#5A3820 text-white font-semibold shadow-lg disabled:opacity-50"
                  >
                    {paying ? t('reserve.payNowButton') : t('reserve.payNowButton')}
                  </Button>

                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 text-left space-y-1">
                    <p className="text-sm font-semibold text-blue-900">
                      📱 {paymentMethod === 'cash_on_arrival' ? t('reserve.bringCash') : t('reserve.whatsNext')}
                    </p>
                    <p className="text-sm text-blue-800">
                      {paymentMethod === 'cash_on_arrival'
                        ? t('reserve.payAnytime')
                        : t('reserve.methodsSupported')}
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={() => navigate('/bookings')}
                      className="flex-1 bg-gradient-to-r from-#8B5A3C to-#6B4423 hover:from-#6B4423 hover:to-#5A3820 text-white font-semibold"
                    >
                      {t('reserve.viewBookings')}
                    </Button>
                    <Button
                      onClick={() => navigate('/')}
                      variant="outline"
                      className="flex-1 border-2 border-orange-300 text-gray-900 hover:bg-orange-50 font-semibold"
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
            <div className="sticky top-4 space-y-4">
              {/* Camp Info */}
                  <Card className="bg-white/95 backdrop-blur-sm border-orange-300 overflow-hidden shadow-xl">
                <img
                  src={camp.photo}
                  alt={camp.title}
                  className="w-full h-40 object-cover"
                  onError={(e) => {
                    e.currentTarget.src = 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800';
                  }}
                />
                <div className="p-4">
                  <h3 className="font-semibold text-lg text-gray-900 mb-1">{camp.title}</h3>
                  <p className="text-sm text-gray-700 font-medium mb-3">{camp.location}</p>
                  
                  <div className="flex flex-wrap gap-2 mb-3">
                    {camp.maxGuests && (
                      <Badge variant="secondary" className="bg-orange-100 text-gray-900 border border-orange-300 font-semibold">
                        <Users className="w-3 h-3 mr-1" />
                        {t('reserve.upToGuests', { max: camp.maxGuests })}
                      </Badge>
                    )}
                    {totalTents > 0 && (
                      <Badge variant="secondary" className="bg-terracotta-100 text-terracotta-900 border border-orange-300 font-semibold">
                        <Tent className="w-3 h-3 mr-1" />
                        {t('reserve.tentsLabel', { count: totalTents })}
                      </Badge>
                    )}
                  </div>
                  
                  <RefundPolicyBadge 
                    policy={camp.refundPolicy || 'refundable'} 
                    showTooltip={true}
                  />
                </div>
              </Card>

              {/* Price Summary */}
              {selectedDate && (
                <Card className="bg-white/95 backdrop-blur-sm border-orange-300 p-6 shadow-xl">
                  <h3 className="font-semibold text-lg text-gray-900 mb-4">{t('reserve.priceBreakdownTitle')}</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-700"> {t('reserve.pricePerDay', { price: camp.price.toFixed(3) })}</span>
                      <span className="text-gray-900 font-semibold">{priceBreakdown.basePrice.toFixed(3)} BD</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-700">{t('reserve.serviceFeeLabel')}</span>
                      <span className="text-gray-900 font-semibold">{priceBreakdown.serviceFee.toFixed(3)} BD</span>
                    </div>
                    <div className="border-t border-orange-300 pt-3">
                      <div className="flex justify-between">
                        <span className="font-bold text-gray-900">{t('reserve.totalLabel')}</span>
                        <span className="font-bold text-xl text-#6B4423">
                          {priceBreakdown.total.toFixed(3)} BD
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