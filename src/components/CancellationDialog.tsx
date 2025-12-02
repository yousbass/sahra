import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertCircle, Loader2, Calendar, Users, DollarSign, ShieldCheck } from 'lucide-react';
import { calculateRefund } from '@/lib/refundCalculator';
import type { CancellationPolicy } from '@/lib/refundCalculator';
import { cancelBooking } from '@/lib/firestore';
import { toast } from 'sonner';

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
  cancellationPolicy?: CancellationPolicy;
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

  // Calculate refund
  const policy = booking.cancellationPolicy || 'moderate';
  const refundCalculation = calculateRefund(
    booking.totalPrice,
    new Date(booking.checkInDate),
    new Date(),
    policy
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getPolicyName = (policy: CancellationPolicy) => {
    switch (policy) {
      case 'flexible':
        return 'Flexible';
      case 'moderate':
        return 'Moderate';
      case 'strict':
        return 'Strict';
      default:
        return 'Moderate';
    }
  };

  const getPolicyColor = (policy: CancellationPolicy) => {
    switch (policy) {
      case 'flexible':
        return 'text-green-600';
      case 'moderate':
        return 'text-blue-600';
      case 'strict':
        return 'text-orange-600';
      default:
        return 'text-blue-600';
    }
  };

  const getRefundMessage = () => {
    if (refundCalculation.refundPercentage === 100) {
      return "You'll receive a full refund because you're cancelling within the allowed timeframe.";
    } else if (refundCalculation.refundPercentage === 50) {
      return "You'll receive a 50% refund based on the cancellation policy and timing.";
    } else {
      return "Unfortunately, you're not eligible for a refund due to the cancellation policy and timing.";
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
      
      toast.success('Booking cancelled successfully', {
        description: refundCalculation.refundAmount > 0 
          ? `A refund of ${refundCalculation.refundAmount.toFixed(2)} BD will be processed.`
          : 'No refund is applicable for this cancellation.'
      });

      onCancellationComplete();
      onOpenChange(false);
    } catch (error) {
      console.error('❌ Cancellation failed:', error);
      toast.error('Failed to cancel booking', {
        description: error instanceof Error ? error.message : 'Please try again later'
      });
    } finally {
      setCancelling(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900">Cancel Booking</DialogTitle>
          <DialogDescription className="text-gray-600">
            Review the cancellation details and refund information before confirming
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Booking Details */}
          <div className="bg-sand-50 border-2 border-sand-300 rounded-lg p-4">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-terracotta-600" />
              Booking Details
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-700 font-medium">Camp:</span>
                <span className="text-gray-900 font-bold">{booking.campName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700 font-medium">Location:</span>
                <span className="text-gray-900 font-bold">{booking.campLocation}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700 font-medium">Check-in:</span>
                <span className="text-gray-900 font-bold">{formatDate(booking.checkInDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700 font-medium">Check-out:</span>
                <span className="text-gray-900 font-bold">{formatDate(booking.checkOutDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700 font-medium">Guests:</span>
                <span className="text-gray-900 font-bold">{booking.numberOfGuests}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-sand-300">
                <span className="text-gray-900 font-bold">Total Paid:</span>
                <span className="text-terracotta-600 font-bold text-lg">{booking.totalPrice.toFixed(2)} BD</span>
              </div>
            </div>
          </div>

          {/* Cancellation Policy */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
            <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
              Cancellation Policy
            </h3>
            <p className="text-sm text-gray-700 mb-2">
              This booking has a <span className={`font-bold ${getPolicyColor(policy)}`}>{getPolicyName(policy)}</span> cancellation policy.
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
              Refund Breakdown
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-700 font-medium">Original Amount:</span>
                <span className="text-gray-900 font-bold">{booking.totalPrice.toFixed(2)} BD</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700 font-medium">Service Fee (non-refundable):</span>
                <span className="text-gray-900 font-bold">-{refundCalculation.serviceFee.toFixed(2)} BD</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700 font-medium">Refund Percentage:</span>
                <span className="text-gray-900 font-bold">{refundCalculation.refundPercentage}%</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-300">
                <span className="text-gray-900 font-bold text-base">You'll Receive:</span>
                <span className={`font-bold text-xl ${
                  refundCalculation.refundAmount > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {refundCalculation.refundAmount.toFixed(2)} BD
                </span>
              </div>
            </div>
            {refundCalculation.refundAmount > 0 && (
              <p className="text-xs text-gray-600 mt-3">
                💡 Refunds are processed within 5-10 business days to your original payment method.
              </p>
            )}
          </div>

          {/* Warning */}
          <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-gray-900 mb-1">Important Notice</p>
                <p className="text-sm text-gray-700">
                  This action cannot be undone. Once you confirm the cancellation, your booking will be cancelled immediately and you will receive a confirmation email.
                </p>
              </div>
            </div>
          </div>

          {/* Cancellation Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-gray-900 font-semibold">
              Reason for Cancellation (Optional)
            </Label>
            <Textarea
              id="reason"
              placeholder="Let us know why you're cancelling (optional)..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="border-sand-300 focus:border-terracotta-500 resize-none"
            />
            <p className="text-xs text-gray-600">
              Your feedback helps us improve our service
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
            Keep Booking
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
                Cancelling...
              </>
            ) : (
              'Confirm Cancellation'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}