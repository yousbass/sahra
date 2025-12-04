import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Loader2, Calendar, Users, DollarSign, AlertTriangle } from 'lucide-react';
import { calculateHostCancellationRefund, calculateHostPenalty } from '@/lib/refundCalculator';
import { cancelBookingAsHost } from '@/lib/firestore';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface BookingWithCamp {
  id: string;
  campId: string;
  campName: string;
  campLocation: string;
  checkInDate: string;
  checkOutDate: string;
  numberOfGuests: number;
  totalPrice: number;
  status: string;
  userId: string;
  userEmail: string;
  userName?: string;
}

interface HostCancellationDialogProps {
  booking: BookingWithCamp;
  hostId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCancellationComplete: () => void;
}

const CANCELLATION_REASONS = [
  'maintenance',
  'emergencyRepairs',
  'personalEmergency',
  'doubleBooking',
  'unavailable',
  'weather',
  'other'
] as const;

export function HostCancellationDialog({
  booking,
  hostId,
  open,
  onOpenChange,
  onCancellationComplete,
}: HostCancellationDialogProps) {
  const { t, i18n } = useTranslation();
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState('');
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');

  // Calculate guest refund (100% for host cancellations)
  const guestRefund = calculateHostCancellationRefund(booking.totalPrice);
  
  // Calculate host penalty
  const penalty = calculateHostPenalty(
    booking.totalPrice,
    new Date(booking.checkInDate),
    new Date()
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(i18n.language === 'ar' ? 'ar' : 'en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleCancel = async () => {
    const finalReason = selectedReason === 'other' ? customReason : selectedReason;
    
    if (!finalReason.trim()) {
      toast.error(t('hostCancellation.toastNeedReason'));
      return;
    }

    try {
      setCancelling(true);
      
      console.log('=== Starting host cancellation process ===');
      console.log('Booking ID:', booking.id);
      console.log('Host ID:', hostId);
      console.log('Reason:', finalReason);
      console.log('Guest refund:', guestRefund);
      console.log('Host penalty:', penalty);

      await cancelBookingAsHost(booking.id, finalReason, hostId);

      console.log('✅ Host cancellation successful');
      
      toast.success(t('hostCancellation.toastSuccess'), {
        description: penalty.penaltyAmount > 0
          ? t('hostCancellation.toastSuccessDescPenalty', { penalty: penalty.penaltyPercentage, amount: penalty.penaltyAmount.toFixed(2) })
          : t('hostCancellation.toastSuccessDescNoPenalty')
      });

      onCancellationComplete();
      onOpenChange(false);
    } catch (error) {
      console.error('❌ Host cancellation failed:', error);
      toast.error(t('hostCancellation.toastFail'), {
        description: error instanceof Error ? error.message : t('hostCancellation.toastFailDesc')
      });
    } finally {
      setCancelling(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900">{t('hostCancellation.title')}</DialogTitle>
          <DialogDescription className="text-gray-600">
            {t('hostCancellation.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Booking Details */}
          <div className="bg-sand-50 border-2 border-sand-300 rounded-lg p-4">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-terracotta-600" />
              {t('hostCancellation.bookingDetails')}
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-700 font-medium">{t('hostCancellation.guest')}</span>
                <span className="text-gray-900 font-bold">{booking.userName || t('hostCancellation.guest')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700 font-medium">{t('hostCancellation.camp')}</span>
                <span className="text-gray-900 font-bold">{booking.campName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700 font-medium">{t('hostCancellation.checkIn')}</span>
                <span className="text-gray-900 font-bold">{formatDate(booking.checkInDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700 font-medium">{t('hostCancellation.checkOut')}</span>
                <span className="text-gray-900 font-bold">{formatDate(booking.checkOutDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700 font-medium">{t('hostCancellation.guests')}</span>
                <span className="text-gray-900 font-bold">{booking.numberOfGuests}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-sand-300">
                <span className="text-gray-900 font-bold">{t('hostCancellation.bookingAmount')}</span>
                <span className="text-terracotta-600 font-bold text-lg">{booking.totalPrice.toFixed(2)} BD</span>
              </div>
            </div>
          </div>

          {/* Guest Refund Information */}
          <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4">
            <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              {t('hostCancellation.guestRefund')}
            </h3>
            <p className="text-sm text-gray-700 mb-3">
              {t('hostCancellation.guestRefundDesc')}
            </p>
            <div className="flex justify-between items-center">
              <span className="text-gray-900 font-bold">{t('hostCancellation.refundAmount')}</span>
              <span className="text-green-600 font-bold text-xl">{guestRefund.refundAmount.toFixed(2)} BD</span>
            </div>
          </div>

          {/* Host Penalty */}
          <div className={`border-2 rounded-lg p-4 ${
            penalty.penaltyAmount > 0 
              ? 'bg-red-50 border-red-300' 
              : 'bg-blue-50 border-blue-300'
          }`}>
            <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
              <AlertTriangle className={`w-5 h-5 ${
                penalty.penaltyAmount > 0 ? 'text-red-600' : 'text-blue-600'
              }`} />
              {t('hostCancellation.hostPenalty')}
            </h3>
            <p className="text-sm text-gray-700 mb-3">
              {penalty.message}
            </p>
            {penalty.penaltyAmount > 0 ? (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700 font-medium">{t('hostCancellation.penaltyRate')}</span>
                  <span className="text-gray-900 font-bold">{penalty.penaltyPercentage}%</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-red-300">
                  <span className="text-gray-900 font-bold">{t('hostCancellation.penaltyAmount')}</span>
                  <span className="text-red-600 font-bold text-xl">{penalty.penaltyAmount.toFixed(2)} BD</span>
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  {t('hostCancellation.penaltyNote')}
                </p>
              </div>
            ) : (
              <p className="text-blue-700 font-semibold">
                {t('hostCancellation.noPenalty')}
              </p>
            )}
          </div>

          {/* Warning */}
          <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-gray-900 mb-1">{t('hostCancellation.importantNotice')}</p>
                <p className="text-sm text-gray-700">
                  {t('hostCancellation.importantDesc')}
                </p>
              </div>
            </div>
          </div>

          {/* Cancellation Reason */}
          <div className="space-y-3">
            <Label htmlFor="reason" className="text-gray-900 font-semibold">
              {t('hostCancellation.reasonLabel')} <span className="text-red-500">*</span>
            </Label>
            <Select value={selectedReason} onValueChange={setSelectedReason}>
              <SelectTrigger className="border-sand-300 focus:border-terracotta-500">
                <SelectValue placeholder={t('hostCancellation.reasonPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {CANCELLATION_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>{t(`hostCancellation.reasons.${r}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {selectedReason === 'other' && (
              <Textarea
                id="custom-reason"
                placeholder={t('hostCancellation.otherReasonPlaceholder')}
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                rows={3}
                className="border-sand-300 focus:border-terracotta-500 resize-none"
              />
            )}
            
            <p className="text-xs text-gray-600">
              {t('hostCancellation.reasonHint')}
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={cancelling}
            className="border-2 border-sand-300 text-gray-900 hover:bg-sand-50 font-semibold"
          >
            {t('hostCancellation.keepBooking')}
          </Button>
          <Button
            type="button"
            onClick={handleCancel}
            disabled={cancelling || !selectedReason || (selectedReason === 'other' && !customReason.trim())}
            className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold"
          >
            {cancelling ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('hostCancellation.cancelling')}
              </>
            ) : (
              t('hostCancellation.confirmCancellation')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
