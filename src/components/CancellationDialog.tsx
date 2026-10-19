import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertCircle, Loader2, Calendar, Users, DollarSign, ShieldCheck, Phone } from 'lucide-react';
import { config } from '@/lib/config';
import { calculateRefund, normalizeCancellationPolicy } from '@/lib/refundCalculator';
import type { CancellationPolicy } from '@/lib/refundCalculator';
import { cancelBooking } from '@/lib/firestore';
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
  cancellationPolicy?: string | CancellationPolicy;
}

interface CancellationDialogProps {
  booking: BookingWithCamp;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCancellationComplete: () => void;
}

export function CancellationDialog({
  booking,
  open,
  onOpenChange,
  onCancellationComplete,
}: CancellationDialogProps) {
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState('');
  const { t, i18n } = useTranslation();

  // Normalise the stored policy — Firestore may hold a legacy string tier
  // ('flexible' | 'moderate' | 'strict') or a full CancellationPolicy object.
  const rawPolicy: string | CancellationPolicy = booking.cancellationPolicy ?? 'moderate';
  const normalizedPolicy = normalizeCancellationPolicy(rawPolicy);
  const refundCalculation = calculateRefund(
    booking.totalPrice,
    new Date(booking.checkInDate),
    new Date(),
    normalizedPolicy
  );

  const formatDate = (dateString: string) => {
    const locale = i18n.language === 'ar' ? 'ar-BH' : 'en-US';
    return new Date(dateString).toLocaleDateString(locale, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getPolicyName = (p: string | CancellationPolicy) => {
    const tier = typeof p === 'string' ? p : p.type;
    if (tier === 'flexible' || tier === 'full_refundable') return t('cancellationDialog.policy.flexible');
    if (tier === 'strict') return t('cancellationDialog.policy.strict');
    return t('cancellationDialog.policy.moderate');
  };

  const getPolicyColor = (p: string | CancellationPolicy) => {
    const tier = typeof p === 'string' ? p : p.type;
    if (tier === 'flexible' || tier === 'full_refundable') return 'text-green-600';
    if (tier === 'strict') return 'text-primary';
    return 'text-blue-600';
  };

  const getRefundMessage = () => {
    if (refundCalculation.refundPercentage === 100) {
      return t('cancellationDialog.refundFull');
    } else if (refundCalculation.refundPercentage === 50) {
      return t('cancellationDialog.refundHalf');
    } else {
      return t('cancellationDialog.refundNone');
    }
  };

  const handleCancel = async () => {
    try {
      setCancelling(true);
      
      console.log('=== Starting cancellation process ===');
      console.log('Booking ID:', booking.id);
      console.log('Refund calculation:', refundCalculation);

      await cancelBooking(booking.id, reason);

      console.log('✅ Cancellation successful');
      
      toast.success(t('cancellationDialog.successTitle'), {
        description: refundCalculation.refundAmount > 0 
          ? t('cancellationDialog.successRefund', { amount: refundCalculation.refundAmount.toFixed(2) })
          : t('cancellationDialog.successNoRefund')
      });

      onCancellationComplete();
      onOpenChange(false);
    } catch (error) {
      console.error('❌ Cancellation failed:', error);
      toast.error(t('cancellationDialog.errorTitle'), {
        description: error instanceof Error ? error.message : t('cancellationDialog.errorDefault')
      });
    } finally {
      setCancelling(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900">{t('cancellationDialog.title')}</DialogTitle>
          <DialogDescription className="text-gray-600">
            {t('cancellationDialog.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Booking Details */}
          <div className="bg-secondary/50 border-2 border-border/80 rounded-lg p-4">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              {t('cancellationDialog.bookingDetails')}
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-700 font-medium">{t('cancellationDialog.camp')}:</span>
                <span className="text-gray-900 font-bold">{booking.campName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700 font-medium">{t('cancellationDialog.location')}:</span>
                <span className="text-gray-900 font-bold">{booking.campLocation}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700 font-medium">{t('cancellationDialog.checkIn')}:</span>
                <span className="text-gray-900 font-bold">{formatDate(booking.checkInDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700 font-medium">{t('cancellationDialog.checkOut')}:</span>
                <span className="text-gray-900 font-bold">{formatDate(booking.checkOutDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700 font-medium">{t('cancellationDialog.guests')}:</span>
                <span className="text-gray-900 font-bold">{booking.numberOfGuests}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-border/80">
                <span className="text-gray-900 font-bold">{t('cancellationDialog.totalPaid')}:</span>
                <span className="text-primary font-bold text-lg">{booking.totalPrice.toFixed(2)} BD</span>
              </div>
            </div>
          </div>

          {/* Cancellation Policy */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
            <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
              {t('cancellationDialog.cancellationPolicy')}
            </h3>
            <p className="text-sm text-gray-700 mb-2">
              {t('cancellationDialog.policyStatementPre')}{' '}
              <span className={`font-bold ${getPolicyColor(rawPolicy)}`}>{getPolicyName(rawPolicy)}</span>{' '}
              {t('cancellationDialog.policyStatementPost')}
            </p>
            <p className="text-sm text-gray-700">
              {getRefundMessage()}
            </p>
          </div>

          {/* Refund Calculation */}
          <div className={`border-2 rounded-lg p-4 ${
            refundCalculation.refundAmount > 0 
              ? 'bg-green-50 border-green-300' 
              : 'bg-red-50 border-red-300'
          }`}>
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <DollarSign className={`w-5 h-5 ${
                refundCalculation.refundAmount > 0 ? 'text-green-600' : 'text-red-600'
              }`} />
              {t('cancellationDialog.refundBreakdown')}
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-700 font-medium">{t('cancellationDialog.originalAmount')}:</span>
                <span className="text-gray-900 font-bold">{booking.totalPrice.toFixed(2)} BD</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700 font-medium">{t('cancellationDialog.serviceFee')}:</span>
                <span className="text-gray-900 font-bold">-{refundCalculation.serviceFee.toFixed(2)} BD</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700 font-medium">{t('cancellationDialog.refundPercentage')}:</span>
                <span className="text-gray-900 font-bold">{refundCalculation.refundPercentage}%</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-300">
                <span className="text-gray-900 font-bold text-base">{t('cancellationDialog.youllReceive')}:</span>
                <span className={`font-bold text-xl ${
                  refundCalculation.refundAmount > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {refundCalculation.refundAmount.toFixed(2)} BD
                </span>
              </div>
            </div>
            {refundCalculation.refundAmount > 0 && (
              <p className="text-xs text-gray-600 mt-3">
                {t('cancellationDialog.refundTimeline')}
              </p>
            )}
          </div>

          {/* Warning */}
          <div className="bg-secondary/50 border-2 border-border/80 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[#FF8C42] mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-gray-900 mb-1">{t('cancellationDialog.importantNotice')}</p>
                <p className="text-sm text-gray-700">
                  {t('cancellationDialog.cannotUndo')}
                </p>
              </div>
            </div>
          </div>

          {/* Support contact */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 border border-border/50">
            <Phone className="w-4 h-4 text-primary shrink-0" />
            <p className="text-xs text-gray-700">
              {t('cancellationDialog.needHelp')}{' '}
              <a href={`tel:${config.supportPhone}`} className="font-semibold text-primary hover:underline">{config.supportPhone}</a>
              {' · '}
              <a href={`mailto:${config.supportEmail}`} className="font-semibold text-primary hover:underline">{config.supportEmail}</a>
            </p>
          </div>

          {/* Cancellation Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-gray-900 font-semibold">
              {t('cancellationDialog.reasonLabel')}
            </Label>
            <Textarea
              id="reason"
              placeholder={t('cancellationDialog.reasonPlaceholder')}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="border-border/80 focus:border-primary resize-none"
            />
            <p className="text-xs text-gray-600">
              {t('cancellationDialog.feedbackHelp')}
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={cancelling}
            className="border-2 border-border/80 text-gray-900 hover:bg-secondary/50 font-semibold"
          >
            {t('cancellationDialog.keepBooking')}
          </Button>
          <Button
            type="button"
            onClick={handleCancel}
            disabled={cancelling}
            className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold"
          >
            {cancelling ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('cancellationDialog.cancelling')}
              </>
            ) : (
              t('cancellationDialog.confirmCancellation')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
