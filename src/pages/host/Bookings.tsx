import { CampfireLoader } from '@/components/CampfireLoader';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  MapPin, Calendar, Users, CreditCard, ArrowLeft, Banknote,
  ChevronRight, X, Mail, CheckCircle, XCircle, MessageCircle,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getBookingsByHost, cancelBookingAsHost, Booking } from '@/lib/firestore';
import { getDepartureDateStr } from '@/lib/bookingDates';
import { MessagingDialog } from '@/components/MessagingDialog';
import { auth, db } from '@/lib/firebase';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export default function HostBookings() {
  const { user, userData, loading } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [messagingBooking, setMessagingBooking] = useState<Booking | null>(null);
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

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
    if (!dateString) return '—';
    try {
      // Parse YYYY-MM-DD safely to avoid TZ shift
      const [y, m, d] = dateString.slice(0, 10).split('-').map(Number);
      const date = new Date(y, m - 1, d);
      return format(date, 'EEE, MMM d, yyyy');
    } catch {
      return dateString;
    }
  };

  const handleAccept = async (booking: Booking) => {
    try {
      setActionLoading(`accept-${booking.id}`);
      // Accept through the authenticated server endpoint so ownership,
      // booking state, and availability conflicts are re-checked inside one
      // server transaction (never a direct client-side status write).
      const idToken = await auth?.currentUser?.getIdToken();
      if (!idToken) throw new Error('Not signed in');
      const res = await fetch(`/api/bookings/${booking.id}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error || 'Request failed');
      }
      toast.success(t('host.bookings.acceptSuccess', 'Booking accepted'));
      setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, status: 'confirmed' } : b));
      if (selectedBooking?.id === booking.id) {
        setSelectedBooking(prev => prev ? { ...prev, status: 'confirmed' } : null);
      }
    } catch (err) {
      console.error('Accept failed:', err);
      toast.error(t('host.bookings.acceptFail', 'Could not accept booking'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async (booking: Booking) => {
    try {
      setActionLoading(`decline-${booking.id}`);
      // Cancel through the authenticated server endpoint so refund policy,
      // Tap refunds, refund records, and availability release are all
      // enforced server-side (never a direct client-side cancellation write).
      await cancelBookingAsHost(booking.id, 'Declined by host', user?.uid || '');
      toast.success(t('host.bookings.declineSuccess', 'Booking declined'));
      setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, status: 'cancelled' } : b));
      if (selectedBooking?.id === booking.id) {
        setSelectedBooking(prev => prev ? { ...prev, status: 'cancelled' } : null);
      }
    } catch (err) {
      console.error('Decline failed:', err);
      toast.error(t('host.bookings.declineFail', 'Could not decline booking'));
    } finally {
      setActionLoading(null);
    }
  };

  const statusBadge = (status?: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-green-100 text-green-800 border-green-200">{t('status.confirmed', 'Confirmed')}</Badge>;
      case 'pending':
        return <Badge className="bg-secondary text-primary border-border">{t('status.pending', 'Pending')}</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800 border-red-200">{t('status.cancelled', 'Cancelled')}</Badge>;
      case 'completed':
        return <Badge className="bg-gray-100 text-gray-700 border-gray-200">{t('status.completed', 'Completed')}</Badge>;
      default:
        return <Badge variant="secondary">{t('status.na', 'N/A')}</Badge>;
    }
  };

  const isCashPending = (b: Booking) =>
    b.paymentMethod === 'cash_on_arrival' && b.status === 'pending';

  const isCashCollectable = (b: Booking) =>
    b.paymentMethod === 'cash_on_arrival' &&
    b.status === 'confirmed' &&
    (!b.paymentStatus || b.paymentStatus === 'pending');

  const handleCollectCash = async (booking: Booking) => {
    try {
      setActionLoading(`collect-${booking.id}`);
      const idToken = await auth?.currentUser?.getIdToken();
      if (!idToken) throw new Error('Not signed in');
      const res = await fetch(`/api/bookings/${booking.id}/collect-cash`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error || 'Request failed');
      }
      toast.success(t('host.bookings.collectCashSuccess', 'Cash payment recorded'));
      setBookings(prev =>
        prev.map(b =>
          b.id === booking.id
            ? { ...b, paymentStatus: 'cash_collected', collectedAt: new Date().toISOString() }
            : b
        )
      );
      if (selectedBooking?.id === booking.id) {
        setSelectedBooking(prev =>
          prev ? { ...prev, paymentStatus: 'cash_collected', collectedAt: new Date().toISOString() } : null
        );
      }
    } catch (err) {
      console.error('Collect cash failed:', err);
      toast.error(t('host.bookings.collectCashFail', 'Could not record payment'));
    } finally {
      setActionLoading(null);
    }
  };

  const tabs: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: t('host.bookings.tabAll', 'All') },
    { key: 'pending', label: t('host.bookings.tabPending', 'Pending') },
    { key: 'confirmed', label: t('host.bookings.tabConfirmed', 'Confirmed') },
    { key: 'completed', label: t('host.bookings.tabCompleted', 'Completed') },
    { key: 'cancelled', label: t('host.bookings.tabCancelled', 'Cancelled') },
  ];

  const filtered = statusFilter === 'all'
    ? bookings
    : bookings.filter(b => b.status === statusFilter);

  const paymentMethodLabel = (method?: string) => {
    if (method === 'cash_on_arrival') return t('host.bookings.paymentCash', 'Cash on arrival');
    if (method === 'card' || method === 'apple_pay' || method === 'google_pay') return t('host.bookings.paymentOnline', 'Online');
    return '—';
  };

  if (loading || loadingBookings) {
    return (
      <div className="min-h-screen bg-gradient-to-b desert-bg flex items-center justify-center p-4">
        <CampfireLoader size="md" className="mx-auto my-4" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b desert-bg p-4">
      <div className="max-w-6xl mx-auto pt-8 pb-20 space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-2">
            <button
              onClick={() => navigate('/host')}
              className={`flex items-center gap-2 text-sm font-semibold text-primary-foreground hover:text-primary ${isRTL ? 'flex-row-reverse' : ''}`}
            >
              <ArrowLeft className="w-4 h-4" />
              {t('host.back')}
            </button>
            <div className={isRTL ? 'text-right' : ''}>
              <h1 className="text-3xl font-bold text-gray-900">{t('host.bookingsTitle')}</h1>
              <p className="text-gray-700 font-medium">
                {t('host.bookingsCount', { count: filtered.length })}
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={loadBookings} className="border-border/80">
            {t('host.refresh')}
          </Button>
        </div>

        {/* Status filter tabs */}
        <div className="flex flex-wrap gap-2">
          {tabs.map(tab => {
            const count = tab.key === 'all' ? bookings.length : bookings.filter(b => b.status === tab.key).length;
            return (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors border ${
                  statusFilter === tab.key
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-gray-700 border-border hover:border-primary/60'
                }`}
              >
                {tab.label}
                <span className={`ml-1.5 text-xs rounded-full px-1.5 py-0.5 ${
                  statusFilter === tab.key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Booking list */}
        {filtered.length === 0 ? (
          <Card className="p-8 bg-white/95 backdrop-blur-sm border-border/80 text-center shadow-lg">
            <p className="text-lg font-semibold text-gray-900 mb-2">{t('host.noBookings')}</p>
            <p className="text-gray-700">{t('host.noBookingsHint')}</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {filtered.map((booking) => (
              <Card
                key={booking.id}
                onClick={() => setSelectedBooking(booking)}
                className="p-5 bg-white/95 backdrop-blur-sm border-border/80 shadow-sm hover:shadow-lg transition cursor-pointer"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className={`flex items-center gap-2 flex-wrap ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <h3 className="text-xl font-semibold text-gray-900">{booking.campTitle}</h3>
                      {statusBadge(booking.status)}
                      {booking.paymentMethod === 'cash_on_arrival' && (!booking.paymentStatus || booking.paymentStatus === 'pending') && booking.status !== 'cancelled' && (
                        <Badge className="bg-amber-50 text-amber-800 border-amber-200">
                          <Banknote className="w-3.5 h-3.5 mr-1" />
                          {t('reserve.cashDueBadge', 'Payment due at check-in')}
                        </Badge>
                      )}
                    </div>
                    <div className={`flex flex-wrap items-center gap-4 text-sm text-gray-700 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4 text-primary" /> {booking.campLocation}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4 text-primary" />
                        {formatDisplayDate(booking.checkInDate)}
                        {` → ${formatDisplayDate(getDepartureDateStr(booking))}`}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4 text-primary" /> {booking.guests} {t('host.bookings.guestsUnit', 'guests')}
                      </span>
                    </div>
                  </div>
                  <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className={`${isRTL ? 'text-left' : 'text-right'} space-y-1`}>
                      <div className={`flex items-center ${isRTL ? 'justify-start' : 'justify-end'} gap-1 text-gray-700`}>
                        <CreditCard className="w-4 h-4 text-primary" />
                        <span className="font-semibold text-sm">{booking.paymentStatus || 'pending'}</span>
                      </div>
                      <div className="text-2xl font-bold text-primary">
                        {(booking.totalPrice || 0).toFixed(3)} BD
                      </div>
                    </div>
                    {/* Accept/Decline for pending cash bookings */}
                    {isCashPending(booking) && (
                      <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white gap-1"
                          disabled={!!actionLoading}
                          onClick={() => handleAccept(booking)}
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          {actionLoading === `accept-${booking.id}`
                            ? t('host.bookings.accepting', 'Accepting…')
                            : t('host.bookings.accept', 'Accept')}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="gap-1"
                          disabled={!!actionLoading}
                          onClick={() => handleDecline(booking)}
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          {actionLoading === `decline-${booking.id}`
                            ? t('host.bookings.declining', 'Declining…')
                            : t('host.bookings.decline', 'Decline')}
                        </Button>
                      </div>
                    )}
                    {/* Collect cash for accepted cash bookings */}
                    {isCashCollectable(booking) && (
                      <div onClick={e => e.stopPropagation()}>
                        <Button
                          size="sm"
                          className="bg-amber-600 hover:bg-amber-700 text-white gap-1"
                          disabled={!!actionLoading}
                          onClick={() => handleCollectCash(booking)}
                        >
                          <Banknote className="w-3.5 h-3.5" />
                          {actionLoading === `collect-${booking.id}`
                            ? t('host.bookings.collectingCash', 'Saving…')
                            : t('host.bookings.collectCash', 'Mark as Paid')}
                        </Button>
                      </div>
                    )}
                    <ChevronRight className={`w-5 h-5 text-gray-400 shrink-0 ${isRTL ? 'rotate-180' : ''}`} />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Booking Detail Sheet */}
      {selectedBooking && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setSelectedBooking(null)}
        >
          <div
            className={`w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto ${isRTL ? 'text-right' : ''}`}
            onClick={e => e.stopPropagation()}
          >
            {/* Detail header */}
            <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-white z-10">
              <h2 className="text-lg font-bold text-gray-900">{t('host.bookings.detailTitle', 'Booking Details')}</h2>
              <button
                onClick={() => setSelectedBooking(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Camp & status */}
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">{selectedBooking.campTitle}</h3>
                <div className="flex items-center gap-2 flex-wrap">
                  {statusBadge(selectedBooking.status)}
                  {selectedBooking.paymentMethod === 'cash_on_arrival' && (
                    <Badge className="bg-amber-50 text-amber-800 border-amber-200">
                      <Banknote className="w-3.5 h-3.5 mr-1" />
                      {t('host.bookings.paymentCash', 'Cash on arrival')}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Dates */}
              <div className="space-y-2 text-sm">
                <DetailRow
                  label={t('host.bookings.checkIn', 'Check-in')}
                  value={formatDisplayDate(selectedBooking.checkInDate)}
                  isRTL={isRTL}
                />
                <DetailRow
                  label={t('host.bookings.checkOut', 'Check-out')}
                  value={formatDisplayDate(getDepartureDateStr(selectedBooking))}
                  isRTL={isRTL}
                />
                <DetailRow
                  label={t('host.bookings.guestsLabel', 'Guests')}
                  value={String(selectedBooking.guests)}
                  isRTL={isRTL}
                />
              </div>

              {/* Guest info */}
              <div className="rounded-xl bg-gray-50 p-4 space-y-2 text-sm">
                <p className="font-semibold text-gray-800">{t('host.bookings.guestSection', 'Guest')}</p>
                <DetailRow label={t('host.bookings.guestName', 'Name')} value={selectedBooking.userName || '—'} isRTL={isRTL} />
                <DetailRow label={t('host.bookings.guestEmail', 'Email')} value={selectedBooking.userEmail || '—'} isRTL={isRTL} />
                {selectedBooking.userPhone && (
                  <DetailRow label={t('host.bookings.guestPhone', 'Phone')} value={selectedBooking.userPhone} isRTL={isRTL} />
                )}
              </div>

              {/* Booking notes */}
              {selectedBooking.specialRequests && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm">
                  <p className="font-semibold text-amber-800 mb-1">{t('host.bookings.bookingNotes', 'Guest notes')}</p>
                  <p className="text-amber-900">{selectedBooking.specialRequests}</p>
                </div>
              )}

              {/* Payment breakdown */}
              <div className="rounded-xl bg-gray-50 p-4 space-y-2 text-sm">
                <p className="font-semibold text-gray-800">{t('host.bookings.paymentSection', 'Payment')}</p>
                <DetailRow label={t('host.bookings.paymentStatus', 'Status')} value={selectedBooking.paymentStatus || 'pending'} isRTL={isRTL} />
                <DetailRow label={t('host.bookings.paymentMethod', 'Method')} value={paymentMethodLabel(selectedBooking.paymentMethod)} isRTL={isRTL} />
                {selectedBooking.priceBreakdown && (
                  <>
                    <DetailRow
                      label={t('host.bookings.basePrice', 'Base price')}
                      value={`${(selectedBooking.priceBreakdown.basePrice || 0).toFixed(3)} BD`}
                      isRTL={isRTL}
                    />
                    <DetailRow
                      label={t('host.bookings.platformFee', 'Platform fee')}
                      value={`${(selectedBooking.priceBreakdown.serviceFee || 0).toFixed(3)} BD`}
                      isRTL={isRTL}
                    />
                  </>
                )}
                <div className={`flex items-center justify-between font-bold text-base pt-1 border-t border-gray-200 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <span className="text-gray-900">{t('host.bookings.total', 'Total')}</span>
                  <span className="text-primary">{(selectedBooking.totalPrice || 0).toFixed(3)} BD</span>
                </div>
              </div>

              <div className="text-xs text-gray-500">
                {t('host.bookings.bookingId', 'Booking ID')}: <span className="font-mono">{selectedBooking.id}</span>
              </div>

              {/* Actions */}
              <div className="space-y-3 pt-1">
                {/* Message Guest */}
                <button
                  onClick={() => { setMessagingBooking(selectedBooking); setSelectedBooking(null); }}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-primary/10 text-primary font-semibold hover:bg-primary/20 transition text-sm"
                >
                  <MessageCircle className="w-4 h-4" />
                  {t('messaging.messageGuest', 'Message Guest')}
                </button>

                {/* Contact guest */}
                {selectedBooking.userEmail && (
                  <a
                    href={`mailto:${selectedBooking.userEmail}?subject=${encodeURIComponent(
                      `Your booking at ${selectedBooking.campTitle}`
                    )}`}
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-primary/10 text-primary font-semibold hover:bg-primary/20 transition text-sm"
                  >
                    <Mail className="w-4 h-4" />
                    {t('host.bookings.contactGuest', 'Contact guest')}
                  </a>
                )}

                {/* Accept / Decline for pending cash bookings */}
                {isCashPending(selectedBooking) && (
                  <div className="flex gap-3">
                    <Button
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white gap-1"
                      disabled={!!actionLoading}
                      onClick={() => handleAccept(selectedBooking)}
                    >
                      <CheckCircle className="w-4 h-4" />
                      {actionLoading === `accept-${selectedBooking.id}`
                        ? t('host.bookings.accepting', 'Accepting…')
                        : t('host.bookings.accept', 'Accept')}
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1 gap-1"
                      disabled={!!actionLoading}
                      onClick={() => handleDecline(selectedBooking)}
                    >
                      <XCircle className="w-4 h-4" />
                      {actionLoading === `decline-${selectedBooking.id}`
                        ? t('host.bookings.declining', 'Declining…')
                        : t('host.bookings.decline', 'Decline')}
                    </Button>
                  </div>
                )}
                {/* Collect cash for accepted cash bookings */}
                {isCashCollectable(selectedBooking) && (
                  <Button
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white gap-2"
                    disabled={!!actionLoading}
                    onClick={() => handleCollectCash(selectedBooking)}
                  >
                    <Banknote className="w-4 h-4" />
                    {actionLoading === `collect-${selectedBooking.id}`
                      ? t('host.bookings.collectingCash', 'Saving…')
                      : t('host.bookings.collectCash', 'Mark as Paid')}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Messaging Dialog — opens when host clicks "Message Guest" */}
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

function DetailRow({ label, value, isRTL }: { label: string; value: string; isRTL: boolean }) {
  return (
    <div className={`flex items-start justify-between gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
      <span className="text-gray-500 shrink-0">{label}</span>
      <span className="font-medium text-gray-900 text-right">{value}</span>
    </div>
  );
}

type StatusFilter = 'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled';
