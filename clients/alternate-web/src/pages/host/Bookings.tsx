import { CampfireLoader } from '@/components/CampfireLoader';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Calendar, Users, CreditCard, ArrowLeft, Banknote, MessageCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getBookingsByHost, Booking } from '@/lib/firestore';
import { MessagingDialog } from '@/components/MessagingDialog';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export default function HostBookings() {
  const { user, userData, loading } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [messagingBooking, setMessagingBooking] = useState<Booking | null>(null);
  const { t, i18n } = useTranslation();

  useEffect(() => {
    if (loading) return;

    if (!user || !userData) {
      toast.error(t('hostBookings.signInRequired'));
      navigate('/signin');
      return;
    }

    if (!userData.isHost) {
      toast.error(t('hostBookings.hostRequired'));
      navigate('/profile');
      return;
    }

    loadBookings();
  }, [user, userData, loading]);

  const loadBookings = async () => {
    if (!user) return;
    try {
      setLoadingBookings(true);
      const data = await getBookingsByHost(user.uid);
      setBookings(data);
    } catch (error) {
      console.error('Failed to load host bookings:', error);
      toast.error(t('hostBookings.loadFailed'));
    } finally {
      setLoadingBookings(false);
    }
  };

  const formatDisplayDate = (dateString: string) => {
    const date = new Date(dateString);
    const locale = i18n.language === 'ar' ? 'ar-BH' : 'en-US';
    return date.toLocaleDateString(locale, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
  };

  const statusBadge = (status?: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-green-500/10 text-green-400 border-green-500/20">{t('status.confirmed', 'Confirmed')}</Badge>;
      case 'pending':
        return <Badge className="bg-secondary text-primary border-border">{t('status.pending', 'Pending')}</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-500/10 text-red-400 border-red-500/20">{t('status.cancelled', 'Cancelled')}</Badge>;
      default:
        return <Badge variant="secondary">{t('status.na', 'N/A')}</Badge>;
    }
  };

  if (loading || loadingBookings) {
    return (
      <div className="min-h-screen bg-gradient-to-b desert-gradient flex items-center justify-center p-4">
        <CampfireLoader size="md" className="mx-auto my-4" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b desert-gradient p-4">
      <div className="max-w-6xl mx-auto pt-8 pb-20 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-2">
            <button
              onClick={() => navigate('/host')}
              className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('host.back')}
            </button>
            <div>
              <h1 className="text-3xl font-bold font-display text-foreground">{t('host.bookingsTitle')}</h1>
              <p className="text-muted-foreground font-medium">
                {t('host.bookingsCount', { count: bookings.length })}
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={loadBookings} className="border-border">
            {t('host.refresh')}
          </Button>
        </div>

        {bookings.length === 0 ? (
          <Card className="p-8 glass-card border-border text-center shadow-lg">
            <p className="text-lg font-semibold text-foreground mb-2">{t('host.noBookings')}</p>
            <p className="text-muted-foreground">{t('host.noBookingsHint')}</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <Card key={booking.id} className="p-5 glass-card border-border shadow-sm hover:shadow-lg transition">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-semibold text-foreground">{booking.campTitle}</h3>
                      {statusBadge(booking.status)}
                      {booking.paymentMethod === 'cash_on_arrival' && (!booking.paymentStatus || booking.paymentStatus === 'pending') && booking.status !== 'cancelled' && (
                        <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20">
                          <Banknote className="w-3.5 h-3.5 mr-1" />
                          {t('reserve.cashDueBadge', 'Payment due at check-in')}
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4 text-primary" /> {booking.campLocation}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4 text-primary" /> {formatDisplayDate(booking.checkInDate)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4 text-primary" /> {t('hostBookings.guestCount', { count: booking.guests })}
                      </span>
                    </div>
                  </div>
                  <div className="text-right space-y-2">
                    <div className="flex items-center justify-end gap-1 text-muted-foreground">
                      <CreditCard className="w-4 h-4 text-primary" />
                      <span className="font-semibold">{t(`status.${booking.paymentStatus || 'pending'}`, booking.paymentStatus || 'pending')}</span>
                    </div>
                    <div className="text-2xl font-bold text-primary">
                      {(booking.totalPrice || 0).toFixed(3)} BHD
                    </div>
                    <button
                      onClick={() => setMessagingBooking(booking)}
                      className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-xl bg-primary/10 text-primary font-semibold hover:bg-primary/20 transition text-sm"
                    >
                      <MessageCircle className="w-4 h-4" />
                      {t('messaging.messageGuest', 'Message Guest')}
                    </button>
                  </div>
                </div>
                <div className="mt-3 text-sm text-muted-foreground">
                  <span className="font-semibold">{t('hostBookings.bookingId')}:</span>{' '}
                  <span className="font-mono" dir="ltr">{booking.id}</span>
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
          guestId={(messagingBooking as any).userId || ''}
          hostId={user?.uid || ''}
          currentUserId={user?.uid || ''}
          currentUserRole="host"
        />
      )}
    </div>
  );
}
