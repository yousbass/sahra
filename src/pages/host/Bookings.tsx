import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, MapPin, Calendar, Users, CreditCard, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getBookingsByHost, Booking } from '@/lib/firestore';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export default function HostBookings() {
  const { user, userData, loading } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const { t } = useTranslation();

  useEffect(() => {
    if (loading) return;

    if (!user || !userData) {
      toast.error('Please sign in to view your bookings');
      navigate('/signin');
      return;
    }

    if (!userData.isHost) {
      toast.error('Only hosts can view host bookings');
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
      toast.error('Could not load bookings');
    } finally {
      setLoadingBookings(false);
    }
  };

  const formatDisplayDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'EEE, MMM d, yyyy');
  };

  const statusBadge = (status?: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-green-100 text-green-800 border-green-200">{t('status.confirmed', 'Confirmed')}</Badge>;
      case 'pending':
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200">{t('status.pending', 'Pending')}</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800 border-red-200">{t('status.cancelled', 'Cancelled')}</Badge>;
      default:
        return <Badge variant="secondary">{t('status.na', 'N/A')}</Badge>;
    }
  };

  if (loading || loadingBookings) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sand-50 via-sand-100 to-sand-200 flex items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-terracotta-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sand-50 via-sand-100 to-sand-200 p-4">
      <div className="max-w-6xl mx-auto pt-8 pb-20 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-2">
            <button
              onClick={() => navigate('/host')}
              className="flex items-center gap-2 text-sm font-semibold text-terracotta-700 hover:text-terracotta-800"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('host.back')}
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{t('host.bookingsTitle')}</h1>
              <p className="text-gray-700 font-medium">
                {t('host.bookingsCount', { count: bookings.length })}
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={loadBookings} className="border-sand-300">
            {t('host.refresh')}
          </Button>
        </div>

        {bookings.length === 0 ? (
          <Card className="p-8 bg-white/95 backdrop-blur-sm border-sand-300 text-center shadow-lg">
            <p className="text-lg font-semibold text-gray-900 mb-2">{t('host.noBookings')}</p>
            <p className="text-gray-700">{t('host.noBookingsHint')}</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <Card key={booking.id} className="p-5 bg-white/95 backdrop-blur-sm border-sand-300 shadow-sm hover:shadow-lg transition">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-semibold text-gray-900">{booking.campTitle}</h3>
                      {statusBadge(booking.status)}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-700">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4 text-terracotta-600" /> {booking.campLocation}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4 text-terracotta-600" /> {formatDisplayDate(booking.checkInDate)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4 text-terracotta-600" /> {booking.guests} guest{booking.guests === 1 ? '' : 's'}
                      </span>
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="flex items-center justify-end gap-1 text-gray-700">
                      <CreditCard className="w-4 h-4 text-terracotta-600" />
                      <span className="font-semibold">{booking.paymentStatus || 'pending'}</span>
                    </div>
                    <div className="text-2xl font-bold text-terracotta-600">
                      {(booking.totalPrice || 0).toFixed(3)} BD
                    </div>
                  </div>
                </div>
                <div className="mt-3 text-sm text-gray-700">
                  <span className="font-semibold">Booking ID:</span>{' '}
                  <span className="font-mono">{booking.id}</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
