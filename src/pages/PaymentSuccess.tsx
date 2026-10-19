import { CampfireLoader } from '@/components/CampfireLoader';
/**
 * Payment Success Page
 * Displays booking confirmation after successful payment.
 * The server settles the booking via Tap webhook; this page polls the
 * verify endpoint until it sees a confirmed charge (no direct Firestore writes).
 */

import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Calendar, Users, MapPin, CreditCard, AlertTriangle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { getDepartureDate } from '@/lib/bookingDates';
import type { Booking } from '@/lib/firestore';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { config } from '@/lib/config';
import { useTranslation } from 'react-i18next';

const POLL_INTERVAL_MS = 2_000;
const POLL_MAX_MS = 30_000;

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const dateLocale = isRTL ? ar : undefined;
  const bookingId = searchParams.get('bookingId');
  const tapId = searchParams.get('tap_id');
  const authStatus = (searchParams.get('auth_status') || '').toUpperCase();
  const paymentStatusParam = (searchParams.get('status') || '').toUpperCase();
  const authCode = authStatus || 'UNKNOWN';
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmed, setConfirmed] = useState(false);
  const [pollTimedOut, setPollTimedOut] = useState(false);
  // Redirect arrived without the identifiers needed for server verification —
  // we cannot claim success, so show an explicit unverified state instead.
  const [missingIds, setMissingIds] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollElapsed = useRef(0);

  const isPaymentStatusSuccess = ['CAPTURED', 'PAID', 'AUTHORIZED'].includes(paymentStatusParam);
  const isPaymentStatusFailure = ['FAILED', 'DECLINED', 'CANCELLED', 'VOID', 'REVERSED', 'REFUNDED'].includes(paymentStatusParam);

  const authMap: Record<string, { label: string; isSuccess: boolean; message: string }> = {
    Y: { label: t('payment.auth.Y'), isSuccess: true, message: t('payment.messages.Y') },
    N: { label: t('payment.auth.N'), isSuccess: false, message: t('payment.messages.N') },
    U: { label: t('payment.auth.U'), isSuccess: false, message: t('payment.messages.U') },
    R: { label: t('payment.auth.R'), isSuccess: false, message: t('payment.messages.R') },
    E: { label: t('payment.auth.E'), isSuccess: false, message: t('payment.messages.E') },
    AI: { label: t('payment.auth.AI'), isSuccess: false, message: t('payment.messages.AI') },
    C: { label: t('payment.auth.C'), isSuccess: false, message: t('payment.messages.C') },
    UNKNOWN: { label: t('payment.auth.UNKNOWN'), isSuccess: false, message: t('payment.messages.UNKNOWN') },
  };

  const authInfo =
    authMap[authCode] ||
    (isPaymentStatusSuccess
      ? { label: paymentStatusParam || 'CAPTURED', isSuccess: true, message: t('payment.messages.completed') }
      : { label: authCode, isSuccess: false, message: t('payment.messages.failed') });

  // If Tap redirected here with a failure status, send the user to the failure page with context
  useEffect(() => {
    if (isPaymentStatusFailure || (!authInfo.isSuccess && paymentStatusParam && !isPaymentStatusSuccess)) {
      const params = new URLSearchParams();
      if (bookingId) params.set('bookingId', bookingId);
      if (paymentStatusParam) params.set('status', paymentStatusParam);
      params.set('error', authInfo.message || t('payment.messages.failed'));
      navigate(`/payment/failed?${params.toString()}`, { replace: true });
    }
  }, [bookingId, authInfo.isSuccess, authInfo.message, isPaymentStatusFailure, paymentStatusParam, navigate, isPaymentStatusSuccess]);

  // Load booking details, then poll verify endpoint until webhook confirms
  useEffect(() => {
    const run = async () => {
      if (!bookingId) {
        setMissingIds(true);
        setLoading(false);
        return;
      }

      // Load booking details for display (read-only, no writes)
      try {
        const bookingRef = doc(db, 'bookings', bookingId);
        const bookingSnap = await getDoc(bookingRef);
        if (bookingSnap.exists()) {
          setBooking({ id: bookingSnap.id, ...bookingSnap.data() } as Booking);
        }
      } catch (err) {
        console.error('Error fetching booking:', err);
      }

      // No tap_id means we cannot verify with the server — never show success.
      if (!tapId) {
        setMissingIds(true);
        setLoading(false);
        return;
      }

      // Poll the server-side verify endpoint using the Firebase auth singleton
      // so there is no null-user window after a full-page Tap redirect.
      const poll = async () => {
        try {
          const headers: Record<string, string> = {};
          const currentUser = auth?.currentUser;
          if (currentUser) {
            const token = await currentUser.getIdToken();
            headers['Authorization'] = `Bearer ${token}`;
          }
          const res = await fetch(
            `/api/payments/verify?tap_id=${encodeURIComponent(tapId)}&bookingId=${encodeURIComponent(bookingId)}`,
            { headers },
          );
          const data = await res.json();
          if (res.ok && data.success && data.verified) {
            clearInterval(pollRef.current!);
            setConfirmed(true);
            setLoading(false);
          }
        } catch {
          // network error — keep polling
        }

        pollElapsed.current += POLL_INTERVAL_MS;
        if (pollElapsed.current >= POLL_MAX_MS) {
          clearInterval(pollRef.current!);
          setPollTimedOut(true);
          setLoading(false);
        }
      };

      pollRef.current = setInterval(poll, POLL_INTERVAL_MS);
      await poll(); // first tick immediately
    };

    run();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [bookingId, tapId]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <CampfireLoader size="lg" className="mx-auto mb-4" />
        <p className="text-muted-foreground font-medium">{t('payment.confirming', 'Confirming your payment…')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Card className="p-8 md:p-12 text-center space-y-8 shadow-xl border-border/80">
          <div className="flex justify-center">
            {/* Success visuals only after the server verified the charge */}
            {confirmed ? (
              <div className="rounded-full bg-green-100 p-4">
                <CheckCircle className="h-16 w-16 text-green-600" />
              </div>
            ) : (
              <div className="rounded-full bg-amber-100 p-4">
                <AlertTriangle className="h-16 w-16 text-amber-600" />
              </div>
            )}
          </div>
          
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              {confirmed
                ? t('payment.successTitle')
                : missingIds
                  ? t('payment.unverifiedTitle')
                  : t('payment.pendingTitle')}
            </h1>
            <p className="text-lg text-gray-700">
              {confirmed
                ? t('payment.successDesc')
                : missingIds
                  ? t('payment.unverifiedDesc')
                  : t('payment.pendingDesc')}
            </p>
          </div>

          {/* Auth status banner */}
          <div
            className={`p-4 rounded-lg border ${
              authInfo.isSuccess
                ? 'bg-green-50 border-green-200 text-green-900'
                : 'bg-secondary border-border text-primary'
            }`}
          >
            <div className="flex items-center gap-2 font-semibold">
              {authInfo.isSuccess ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-[#FF8C42]" />
              )}
              <span>{authInfo.label}</span>
            </div>
            <p className="text-sm mt-1">{authInfo.message}</p>
          </div>

          {booking && (
            <div className="bg-secondary/30 p-6 md:p-8 rounded-xl text-left space-y-6 border-2 border-border/80">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="h-5 w-5 text-primary" />
                <h2 className="font-bold text-xl text-gray-900">{booking.campTitle}</h2>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-600 font-medium">{t('payment.checkIn')}</p>
                      <p className="font-semibold text-gray-900">
                        {format(new Date(booking.checkInDate), 'dd MMM yyyy', { locale: dateLocale })}
                      </p>
                      <p className="text-sm text-gray-600">{booking.checkIn}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-600 font-medium">{t('payment.checkOut')}</p>
                      <p className="font-semibold text-gray-900">
                        {format(getDepartureDate(booking), 'dd MMM yyyy', { locale: dateLocale })}
                      </p>
                      <p className="text-sm text-gray-600">{booking.checkOut}</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Users className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-600 font-medium">{t('payment.guests')}</p>
                      <p className="font-semibold text-gray-900">{t('campDetails.accommodates', { count: booking.guests })}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <CreditCard className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-600 font-medium">{t('payment.totalPaid')}</p>
                      <p className="font-bold text-xl text-primary">
                        {booking.totalPrice?.toFixed(3)} BHD
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t-2 border-border/80">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 font-medium">{t('payment.bookingId')}</span>
                <span className="font-mono text-sm font-semibold text-gray-900">{booking.id}</span>
                </div>
              </div>
            </div>
          )}

          {/* What's Next — shown when payment confirmed */}
          {confirmed && (
            <div className={`bg-primary/5 border-2 border-primary/20 rounded-xl p-6 text-${isRTL ? 'right' : 'left'}`}>
              <div className={`flex items-center gap-3 mb-3`}>
                <Info className="w-6 h-6 text-primary flex-shrink-0" />
                <h3 className="text-lg font-bold text-gray-900">{t('payment.whatsNext')}</h3>
              </div>
              <p className="text-gray-700 leading-relaxed font-medium">
                {t('payment.whatsNextDesc')}
              </p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button 
              onClick={() => navigate('/bookings')} 
              className="bg-primary hover:bg-primary/90 text-primary-foreground lantern-halo font-semibold"
              size="lg"
            >
              {t('payment.viewBookings')}
            </Button>
            <Button 
              onClick={() => navigate('/')} 
              variant="outline"
              className="border-2 border-border/80 hover:bg-secondary font-semibold"
              size="lg"
            >
              {t('payment.backHome')}
            </Button>
          </div>

          <p className="text-sm text-gray-600 pt-4">
            {t('payment.contact')} <a href={`mailto:${config.supportEmail}`} className="text-primary hover:underline font-semibold">{config.supportEmail}</a>
          </p>
        </Card>
      </div>
    </div>
  );
}
