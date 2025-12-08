/**
 * Payment Success Page
 * Displays booking confirmation after successful payment
 */

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Loader2, Calendar, Users, MapPin, CreditCard, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Booking } from '@/lib/firestore';
import { format } from 'date-fns';
import { config } from '@/lib/config';
import { updateBooking } from '@/lib/firestore';
import { useTranslation } from 'react-i18next';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const bookingId = searchParams.get('bookingId');
  const authStatus = (searchParams.get('auth_status') || '').toUpperCase();
  const paymentStatusParam = (searchParams.get('status') || '').toUpperCase();
  const authCode = authStatus || 'UNKNOWN';
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);

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
      navigate(`/payment-failed?${params.toString()}`, { replace: true });
    }
  }, [bookingId, authInfo.isSuccess, authInfo.message, isPaymentStatusFailure, paymentStatusParam, navigate, isPaymentStatusSuccess]);

  useEffect(() => {
    const fetchBooking = async () => {
      if (!bookingId) {
        setLoading(false);
        return;
      }

      try {
        const bookingRef = doc(db, 'bookings', bookingId);
        const bookingSnap = await getDoc(bookingRef);
        
        if (bookingSnap.exists()) {
          const data = { id: bookingSnap.id, ...bookingSnap.data() } as Booking;
          setBooking(data);

          // Update status based on auth result
          if (authInfo.isSuccess) {
            if (data.status !== 'confirmed' || data.paymentStatus !== 'paid') {
              await updateBooking(bookingId, {
                status: 'confirmed',
                paymentStatus: 'paid',
                authStatus: authStatus || paymentStatusParam || 'Y',
              });
              setBooking({
                ...data,
                status: 'confirmed',
                paymentStatus: 'paid',
                authStatus: authStatus || paymentStatusParam || 'Y',
              });
            }
          } else {
            await updateBooking(bookingId, {
              paymentStatus: 'failed',
              status: 'pending',
              authStatus: authStatus || paymentStatusParam || 'N',
              failureReason: authInfo.message,
            });
            setBooking({
              ...data,
              paymentStatus: 'failed',
              status: 'pending',
              authStatus: authStatus || paymentStatusParam || 'N',
              failureReason: authInfo.message,
            });
          }
        }
      } catch (error) {
        console.error('Error fetching/updating booking:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [bookingId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-orange-50">
        <Loader2 className="h-12 w-12 animate-spin text-#6B4423" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Card className="p-8 md:p-12 text-center space-y-8 shadow-xl border-orange-300">
          <div className="flex justify-center">
            <div className="rounded-full bg-green-100 p-4">
              <CheckCircle className="h-16 w-16 text-green-600" />
            </div>
          </div>
          
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              {authInfo.isSuccess ? t('payment.successTitle') : t('payment.pendingTitle')}
            </h1>
            <p className="text-lg text-gray-700">
              {authInfo.isSuccess
                ? t('payment.successDesc')
                : t('payment.pendingDesc')}
            </p>
          </div>

          {/* Auth status banner */}
          <div
            className={`p-4 rounded-lg border ${
              authInfo.isSuccess
                ? 'bg-green-50 border-green-200 text-green-900'
                : 'bg-orange-50 border-orange-200 text-amber-900'
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
            <div className="bg-gradient-to-br from-orange-50 to-orange-50 p-6 md:p-8 rounded-xl text-left space-y-6 border-2 border-orange-300">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="h-5 w-5 text-#6B4423" />
                <h2 className="font-bold text-xl text-gray-900">{booking.campTitle}</h2>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-#6B4423 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-600 font-medium">{t('payment.checkIn')}</p>
                      <p className="font-semibold text-gray-900">
                        {format(new Date(booking.checkInDate), 'MMM dd, yyyy')}
                      </p>
                      <p className="text-sm text-gray-600">{booking.checkIn}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-#6B4423 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-600 font-medium">{t('payment.checkOut')}</p>
                      <p className="font-semibold text-gray-900">
                        {format(new Date(booking.checkOutDate), 'MMM dd, yyyy')}
                      </p>
                      <p className="text-sm text-gray-600">{booking.checkOut}</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Users className="h-5 w-5 text-#6B4423 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-600 font-medium">{t('payment.guests')}</p>
                      <p className="font-semibold text-gray-900">{t('campDetails.accommodates', { count: booking.guests })}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <CreditCard className="h-5 w-5 text-#6B4423 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-600 font-medium">{t('payment.totalPaid')}</p>
                      <p className="font-bold text-xl text-#6B4423">
                        {booking.totalPrice?.toFixed(3)} BD
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t-2 border-orange-300">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 font-medium">{t('payment.bookingId')}</span>
                <span className="font-mono text-sm font-semibold text-gray-900">{booking.id}</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button 
              onClick={() => navigate('/bookings')} 
              className="bg-gradient-to-r from-#8B5A3C to-#6B4423 hover:from-#6B4423 hover:to-#5A3820 text-white font-semibold"
              size="lg"
            >
              {t('payment.viewBookings')}
            </Button>
            <Button 
              onClick={() => navigate('/')} 
              variant="outline"
              className="border-2 border-orange-300 hover:bg-orange-50 font-semibold"
              size="lg"
            >
              {t('payment.backHome')}
            </Button>
          </div>

          <p className="text-sm text-gray-600 pt-4">
            {t('payment.contact')} <a href={`mailto:${config.supportEmail}`} className="text-#6B4423 hover:underline font-semibold">{config.supportEmail}</a>
          </p>
        </Card>
      </div>
    </div>
  );
}
