# Cancellation Policy & Refund Management System Design

## Implementation Approach

We will implement a comprehensive cancellation and refund management system for the Sahra camping platform with the following components:

1. **Cancellation Policy Framework** - Three policy types (Flexible, Moderate, Strict) that hosts can assign to their camps
2. **Refund Calculator** - Automated calculation based on policy type and cancellation timing
3. **Cancellation Workflow** - Complete user flow from initiation to confirmation
4. **Refund Processing** - Integration with Stripe for automated refunds
5. **Admin Management** - Dashboard for monitoring and managing cancellations
6. **Notification System** - Email notifications for all parties

### Technology Stack

- **Frontend**: React with TypeScript, Shadcn UI components
- **Backend**: Firebase Firestore for data storage
- **Payment**: Stripe API for refund processing
- **Notifications**: Resend for email notifications

## Cancellation Policy Types

### Policy Definitions

```typescript
// src/lib/types/cancellation.ts
export enum CancellationPolicyType {
  FLEXIBLE = 'flexible',
  MODERATE = 'moderate',
  STRICT = 'strict',
}

export interface CancellationPolicy {
  type: CancellationPolicyType;
  name: string;
  description: string;
  rules: CancellationRule[];
}

export interface CancellationRule {
  hoursBeforeCheckIn: number;
  refundPercentage: number;
  description: string;
}

export const CANCELLATION_POLICIES: Record<CancellationPolicyType, CancellationPolicy> = {
  [CancellationPolicyType.FLEXIBLE]: {
    type: CancellationPolicyType.FLEXIBLE,
    name: 'Flexible',
    description: 'Full refund if cancelled 24 hours before check-in',
    rules: [
      {
        hoursBeforeCheckIn: 24,
        refundPercentage: 100,
        description: 'Full refund if cancelled at least 24 hours before check-in',
      },
      {
        hoursBeforeCheckIn: 0,
        refundPercentage: 0,
        description: 'No refund if cancelled less than 24 hours before check-in',
      },
    ],
  },
  [CancellationPolicyType.MODERATE]: {
    type: CancellationPolicyType.MODERATE,
    name: 'Moderate',
    description: '50% refund if cancelled 48 hours before check-in',
    rules: [
      {
        hoursBeforeCheckIn: 48,
        refundPercentage: 50,
        description: '50% refund if cancelled at least 48 hours before check-in',
      },
      {
        hoursBeforeCheckIn: 0,
        refundPercentage: 0,
        description: 'No refund if cancelled less than 48 hours before check-in',
      },
    ],
  },
  [CancellationPolicyType.STRICT]: {
    type: CancellationPolicyType.STRICT,
    name: 'Strict',
    description: '50% refund if cancelled 7 days before check-in',
    rules: [
      {
        hoursBeforeCheckIn: 168, // 7 days
        refundPercentage: 50,
        description: '50% refund if cancelled at least 7 days before check-in',
      },
      {
        hoursBeforeCheckIn: 0,
        refundPercentage: 0,
        description: 'No refund if cancelled less than 7 days before check-in',
      },
    ],
  },
};
```

## Refund Calculation Logic

### Refund Calculator Service

```typescript
// src/lib/services/refund-calculator.ts
export interface RefundCalculation {
  originalAmount: number;
  refundPercentage: number;
  refundAmount: number;
  serviceFeeRefund: number;
  totalRefund: number;
  hoursUntilCheckIn: number;
  policyType: CancellationPolicyType;
  appliedRule: CancellationRule;
}

export class RefundCalculator {
  /**
   * Calculate refund amount based on cancellation policy and timing
   */
  static calculateRefund(
    booking: Booking,
    camp: Camp,
    cancellationDate: Date = new Date()
  ): RefundCalculation {
    const checkInDate = new Date(booking.checkInDate);
    const hoursUntilCheckIn = this.getHoursUntilCheckIn(cancellationDate, checkInDate);
    
    // Get the camp's cancellation policy
    const policy = CANCELLATION_POLICIES[camp.cancellationPolicy || CancellationPolicyType.FLEXIBLE];
    
    // Find applicable rule based on timing
    const appliedRule = this.findApplicableRule(policy.rules, hoursUntilCheckIn);
    
    // Calculate refund amounts
    const originalAmount = booking.totalAmount;
    const serviceFee = booking.serviceFee || originalAmount * 0.1;
    const baseAmount = originalAmount - serviceFee;
    
    const refundPercentage = appliedRule.refundPercentage;
    const refundAmount = (baseAmount * refundPercentage) / 100;
    
    // Service fee is fully refundable if cancelled more than 24 hours before check-in
    const serviceFeeRefund = hoursUntilCheckIn >= 24 ? serviceFee : 0;
    
    const totalRefund = refundAmount + serviceFeeRefund;
    
    return {
      originalAmount,
      refundPercentage,
      refundAmount,
      serviceFeeRefund,
      totalRefund,
      hoursUntilCheckIn,
      policyType: policy.type,
      appliedRule,
    };
  }

  /**
   * Get hours between cancellation and check-in
   */
  private static getHoursUntilCheckIn(cancellationDate: Date, checkInDate: Date): number {
    const diffMs = checkInDate.getTime() - cancellationDate.getTime();
    return Math.max(0, diffMs / (1000 * 60 * 60));
  }

  /**
   * Find the applicable cancellation rule based on timing
   */
  private static findApplicableRule(
    rules: CancellationRule[],
    hoursUntilCheckIn: number
  ): CancellationRule {
    // Sort rules by hours in descending order
    const sortedRules = [...rules].sort((a, b) => b.hoursBeforeCheckIn - a.hoursBeforeCheckIn);
    
    // Find the first rule that applies
    for (const rule of sortedRules) {
      if (hoursUntilCheckIn >= rule.hoursBeforeCheckIn) {
        return rule;
      }
    }
    
    // Default to the most restrictive rule (0% refund)
    return sortedRules[sortedRules.length - 1];
  }

  /**
   * Format refund calculation for display
   */
  static formatRefundSummary(calculation: RefundCalculation): string {
    const { refundPercentage, totalRefund, hoursUntilCheckIn } = calculation;
    
    if (refundPercentage === 0) {
      return `No refund available (cancelling ${Math.floor(hoursUntilCheckIn)} hours before check-in)`;
    }
    
    return `${refundPercentage}% refund (BHD ${totalRefund.toFixed(3)}) - cancelling ${Math.floor(hoursUntilCheckIn)} hours before check-in`;
  }
}
```

## Database Schema

### Firestore Collections

#### 1. Camps Collection (Updated)

```typescript
// Add cancellation policy to existing camp schema
interface Camp {
  // ... existing fields
  cancellationPolicy: CancellationPolicyType; // NEW FIELD
  cancellationPolicyDescription?: string; // NEW FIELD
}
```

#### 2. Cancellations Collection

```typescript
// src/lib/types/cancellation.ts
export interface Cancellation {
  id: string;
  bookingId: string;
  campId: string;
  userId: string; // Guest who cancelled
  hostId: string;
  
  // Cancellation details
  cancelledAt: Date;
  cancellationReason?: string;
  cancellationNote?: string;
  
  // Financial details
  originalAmount: number;
  refundPercentage: number;
  refundAmount: number;
  serviceFeeRefund: number;
  totalRefund: number;
  
  // Policy information
  policyType: CancellationPolicyType;
  hoursBeforeCheckIn: number;
  appliedRule: CancellationRule;
  
  // Status tracking
  status: 'pending' | 'approved' | 'refunded' | 'rejected';
  refundStatus: 'not_applicable' | 'pending' | 'processing' | 'completed' | 'failed';
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  processedBy?: string; // Admin ID if manually processed
}
```

#### 3. Refunds Collection

```typescript
// src/lib/types/refund.ts
export interface Refund {
  id: string;
  cancellationId: string;
  bookingId: string;
  userId: string;
  
  // Refund details
  amount: number;
  currency: string;
  
  // Payment information
  paymentIntentId: string;
  refundId: string; // Stripe refund ID
  paymentMethod: string;
  
  // Status tracking
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'cancelled';
  failureReason?: string;
  
  // Timing
  initiatedAt: Date;
  processedAt?: Date;
  completedAt?: Date;
  expectedArrival?: Date; // 5-7 business days
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}
```

#### 4. Bookings Collection (Updated)

```typescript
// Add cancellation-related fields to existing booking schema
interface Booking {
  // ... existing fields
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'refunded'; // UPDATED
  cancellationId?: string; // NEW FIELD
  cancelledAt?: Date; // NEW FIELD
  refundAmount?: number; // NEW FIELD
}
```

## Complete Cancellation Workflow

### User Interface Flow

```typescript
// src/pages/Bookings.tsx - Enhanced with cancellation
export function BookingsPage() {
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancellationPreview, setCancellationPreview] = useState<RefundCalculation | null>(null);

  const handleCancelClick = async (booking: Booking) => {
    // Fetch camp details to get cancellation policy
    const campDoc = await getDoc(doc(db, 'camps', booking.campId));
    const camp = campDoc.data() as Camp;
    
    // Calculate refund preview
    const preview = RefundCalculator.calculateRefund(booking, camp);
    setCancellationPreview(preview);
    
    setSelectedBooking(booking);
    setShowCancelDialog(true);
  };

  return (
    <div>
      {/* Booking list */}
      {bookings.map(booking => (
        <BookingCard
          key={booking.id}
          booking={booking}
          onCancel={() => handleCancelClick(booking)}
        />
      ))}

      {/* Cancellation confirmation dialog */}
      <CancellationDialog
        open={showCancelDialog}
        booking={selectedBooking}
        refundCalculation={cancellationPreview}
        onConfirm={handleCancellationConfirm}
        onClose={() => setShowCancelDialog(false)}
      />
    </div>
  );
}
```

### Cancellation Dialog Component

```typescript
// src/components/CancellationDialog.tsx
interface CancellationDialogProps {
  open: boolean;
  booking: Booking | null;
  refundCalculation: RefundCalculation | null;
  onConfirm: (reason?: string, note?: string) => Promise<void>;
  onClose: () => void;
}

export function CancellationDialog({
  open,
  booking,
  refundCalculation,
  onConfirm,
  onClose,
}: CancellationDialogProps) {
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      await onConfirm(reason, note);
      onClose();
    } catch (error) {
      console.error('Cancellation failed:', error);
      // Show error message
    } finally {
      setIsProcessing(false);
    }
  };

  if (!booking || !refundCalculation) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Cancel Booking</DialogTitle>
          <DialogDescription>
            Review the cancellation details and refund amount
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Booking Summary */}
          <div className="rounded-lg border p-4">
            <h3 className="font-semibold mb-2">Booking Details</h3>
            <div className="space-y-1 text-sm">
              <p>Camp: {booking.campName}</p>
              <p>Check-in: {formatDate(booking.checkInDate)}</p>
              <p>Check-out: {formatDate(booking.checkOutDate)}</p>
              <p>Total Paid: BHD {booking.totalAmount.toFixed(3)}</p>
            </div>
          </div>

          {/* Refund Calculation */}
          <div className="rounded-lg border p-4 bg-yellow-50">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              Refund Breakdown
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Cancellation Policy:</span>
                <span className="font-medium">
                  {CANCELLATION_POLICIES[refundCalculation.policyType].name}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Time until check-in:</span>
                <span className="font-medium">
                  {Math.floor(refundCalculation.hoursUntilCheckIn)} hours
                </span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span>Base amount:</span>
                <span>BHD {(refundCalculation.originalAmount - (booking.serviceFee || 0)).toFixed(3)}</span>
              </div>
              <div className="flex justify-between">
                <span>Refund percentage:</span>
                <span>{refundCalculation.refundPercentage}%</span>
              </div>
              <div className="flex justify-between">
                <span>Base refund:</span>
                <span>BHD {refundCalculation.refundAmount.toFixed(3)}</span>
              </div>
              <div className="flex justify-between">
                <span>Service fee refund:</span>
                <span>BHD {refundCalculation.serviceFeeRefund.toFixed(3)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-base font-semibold">
                <span>Total Refund:</span>
                <span className="text-green-600">
                  BHD {refundCalculation.totalRefund.toFixed(3)}
                </span>
              </div>
            </div>
          </div>

          {/* Cancellation Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for cancellation (optional)</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger id="reason">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="change_of_plans">Change of plans</SelectItem>
                <SelectItem value="weather">Weather concerns</SelectItem>
                <SelectItem value="emergency">Emergency</SelectItem>
                <SelectItem value="found_alternative">Found alternative</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Additional notes (optional)</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Any additional information..."
              rows={3}
            />
          </div>

          {/* Warning Message */}
          {refundCalculation.refundPercentage === 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No Refund Available</AlertTitle>
              <AlertDescription>
                According to the {CANCELLATION_POLICIES[refundCalculation.policyType].name} cancellation policy,
                you are not eligible for a refund when cancelling less than{' '}
                {refundCalculation.appliedRule.hoursBeforeCheckIn} hours before check-in.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            Keep Booking
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
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
```

### Cancellation Service

```typescript
// src/lib/services/cancellation-service.ts
import { RefundCalculator } from './refund-calculator';
import { RefundService } from './refund-service';
import { EmailNotificationService } from '../email/notification-service';

export class CancellationService {
  private refundService = new RefundService();
  private emailService = new EmailNotificationService();

  /**
   * Process a booking cancellation
   */
  async cancelBooking(
    bookingId: string,
    userId: string,
    reason?: string,
    note?: string
  ): Promise<Cancellation> {
    try {
      // 1. Fetch booking and camp details
      const bookingDoc = await getDoc(doc(db, 'bookings', bookingId));
      if (!bookingDoc.exists()) {
        throw new Error('Booking not found');
      }

      const booking = { id: bookingDoc.id, ...bookingDoc.data() } as Booking;

      // Verify user owns this booking
      if (booking.userId !== userId) {
        throw new Error('Unauthorized: You can only cancel your own bookings');
      }

      // Check if already cancelled
      if (booking.status === 'cancelled') {
        throw new Error('Booking is already cancelled');
      }

      // Check if check-in has passed
      const checkInDate = new Date(booking.checkInDate);
      if (checkInDate < new Date()) {
        throw new Error('Cannot cancel a booking after check-in date has passed');
      }

      const campDoc = await getDoc(doc(db, 'camps', booking.campId));
      const camp = { id: campDoc.id, ...campDoc.data() } as Camp;

      // 2. Calculate refund
      const refundCalculation = RefundCalculator.calculateRefund(booking, camp);

      // 3. Create cancellation record
      const cancellationData: Omit<Cancellation, 'id'> = {
        bookingId,
        campId: booking.campId,
        userId,
        hostId: camp.hostId,
        cancelledAt: new Date(),
        cancellationReason: reason,
        cancellationNote: note,
        originalAmount: refundCalculation.originalAmount,
        refundPercentage: refundCalculation.refundPercentage,
        refundAmount: refundCalculation.refundAmount,
        serviceFeeRefund: refundCalculation.serviceFeeRefund,
        totalRefund: refundCalculation.totalRefund,
        policyType: refundCalculation.policyType,
        hoursBeforeCheckIn: refundCalculation.hoursUntilCheckIn,
        appliedRule: refundCalculation.appliedRule,
        status: 'approved',
        refundStatus: refundCalculation.totalRefund > 0 ? 'pending' : 'not_applicable',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const cancellationRef = await addDoc(
        collection(db, 'cancellations'),
        cancellationData
      );

      const cancellation = {
        id: cancellationRef.id,
        ...cancellationData,
      } as Cancellation;

      // 4. Update booking status
      await updateDoc(doc(db, 'bookings', bookingId), {
        status: 'cancelled',
        cancellationId: cancellationRef.id,
        cancelledAt: new Date(),
        refundAmount: refundCalculation.totalRefund,
        updatedAt: new Date(),
      });

      // 5. Process refund if applicable
      if (refundCalculation.totalRefund > 0) {
        await this.refundService.processRefund(
          cancellationRef.id,
          bookingId,
          refundCalculation.totalRefund,
          booking.paymentIntentId
        );
      }

      // 6. Send notifications
      await this.emailService.sendCancellationNotification(
        booking,
        camp,
        cancellation
      );

      return cancellation;
    } catch (error) {
      console.error('Cancellation failed:', error);
      throw error;
    }
  }

  /**
   * Get cancellation details
   */
  async getCancellation(cancellationId: string): Promise<Cancellation | null> {
    const cancellationDoc = await getDoc(doc(db, 'cancellations', cancellationId));
    
    if (!cancellationDoc.exists()) {
      return null;
    }

    return {
      id: cancellationDoc.id,
      ...cancellationDoc.data(),
    } as Cancellation;
  }

  /**
   * Get all cancellations for a user
   */
  async getUserCancellations(userId: string): Promise<Cancellation[]> {
    const q = query(
      collection(db, 'cancellations'),
      where('userId', '==', userId),
      orderBy('cancelledAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Cancellation[];
  }

  /**
   * Get all cancellations for a host
   */
  async getHostCancellations(hostId: string): Promise<Cancellation[]> {
    const q = query(
      collection(db, 'cancellations'),
      where('hostId', '==', hostId),
      orderBy('cancelledAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Cancellation[];
  }
}
```

### Refund Processing Service

```typescript
// src/lib/services/refund-service.ts
import { loadStripe } from '@stripe/stripe-js';

export class RefundService {
  /**
   * Process a refund through Stripe
   */
  async processRefund(
    cancellationId: string,
    bookingId: string,
    amount: number,
    paymentIntentId: string
  ): Promise<Refund> {
    try {
      // 1. Create refund record
      const refundData: Omit<Refund, 'id'> = {
        cancellationId,
        bookingId,
        userId: '', // Will be filled from booking
        amount,
        currency: 'BHD',
        paymentIntentId,
        refundId: '', // Will be filled after Stripe call
        paymentMethod: 'card',
        status: 'pending',
        initiatedAt: new Date(),
        expectedArrival: this.calculateExpectedArrival(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const refundRef = await addDoc(collection(db, 'refunds'), refundData);

      // 2. Update cancellation with refund status
      await updateDoc(doc(db, 'cancellations', cancellationId), {
        refundStatus: 'processing',
        updatedAt: new Date(),
      });

      // 3. Call Stripe API to process refund
      // Note: This should be done via a secure backend endpoint
      // For now, we'll simulate the call
      const stripeRefund = await this.callStripeRefund(paymentIntentId, amount);

      // 4. Update refund record with Stripe response
      await updateDoc(doc(db, 'refunds', refundRef.id), {
        refundId: stripeRefund.id,
        status: 'processing',
        processedAt: new Date(),
        updatedAt: new Date(),
      });

      // 5. Update cancellation status
      await updateDoc(doc(db, 'cancellations', cancellationId), {
        refundStatus: 'processing',
        updatedAt: new Date(),
      });

      const refund = {
        id: refundRef.id,
        ...refundData,
        refundId: stripeRefund.id,
        status: 'processing' as const,
      };

      return refund;
    } catch (error) {
      console.error('Refund processing failed:', error);

      // Update refund status to failed
      await updateDoc(doc(db, 'cancellations', cancellationId), {
        refundStatus: 'failed',
        updatedAt: new Date(),
      });

      throw error;
    }
  }

  /**
   * Call Stripe API to process refund
   * Note: This should be implemented as a secure backend function
   */
  private async callStripeRefund(
    paymentIntentId: string,
    amount: number
  ): Promise<{ id: string; status: string }> {
    // This is a placeholder - implement actual Stripe API call via backend
    // Example using Stripe Node.js SDK (backend):
    // const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    // const refund = await stripe.refunds.create({
    //   payment_intent: paymentIntentId,
    //   amount: Math.round(amount * 1000), // Convert BHD to fils
    // });
    // return refund;

    // For now, return mock data
    return {
      id: `re_${Date.now()}`,
      status: 'succeeded',
    };
  }

  /**
   * Calculate expected refund arrival date (5-7 business days)
   */
  private calculateExpectedArrival(): Date {
    const date = new Date();
    date.setDate(date.getDate() + 7); // 7 days from now
    return date;
  }

  /**
   * Handle Stripe webhook for refund status updates
   */
  async handleRefundWebhook(event: any) {
    const { type, data } = event;

    if (type === 'charge.refunded') {
      const refundId = data.object.refunds.data[0].id;
      
      // Find refund record
      const refundsRef = collection(db, 'refunds');
      const q = query(refundsRef, where('refundId', '==', refundId));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const refundDoc = snapshot.docs[0];
        const refund = refundDoc.data() as Refund;

        // Update refund status
        await updateDoc(doc(db, 'refunds', refundDoc.id), {
          status: 'succeeded',
          completedAt: new Date(),
          updatedAt: new Date(),
        });

        // Update cancellation status
        await updateDoc(doc(db, 'cancellations', refund.cancellationId), {
          refundStatus: 'completed',
          updatedAt: new Date(),
        });

        // Update booking status
        await updateDoc(doc(db, 'bookings', refund.bookingId), {
          status: 'refunded',
          updatedAt: new Date(),
        });

        // Send refund confirmation email
        const emailService = new EmailNotificationService();
        const bookingDoc = await getDoc(doc(db, 'bookings', refund.bookingId));
        const booking = bookingDoc.data() as Booking;
        
        await emailService.sendRefundConfirmation(booking, refund);
      }
    }
  }
}
```

## Admin Management Interface

### Admin Cancellations Page

```typescript
// src/pages/admin/Cancellations.tsx
export function AdminCancellationsPage() {
  const [cancellations, setCancellations] = useState<Cancellation[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'refunded'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCancellations = async () => {
      const cancellationsRef = collection(db, 'cancellations');
      const q = filter === 'all'
        ? query(cancellationsRef, orderBy('cancelledAt', 'desc'))
        : query(
            cancellationsRef,
            where('refundStatus', '==', filter),
            orderBy('cancelledAt', 'desc')
          );

      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Cancellation[];

      setCancellations(data);
      setLoading(false);
    };

    fetchCancellations();
  }, [filter]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Cancellations</h1>
        
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Cancellations</SelectItem>
            <SelectItem value="pending">Pending Refunds</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total Cancellations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{cancellations.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Pending Refunds</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {cancellations.filter(c => c.refundStatus === 'pending').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Total Refunded</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              BHD {cancellations
                .filter(c => c.refundStatus === 'completed')
                .reduce((sum, c) => sum + c.totalRefund, 0)
                .toFixed(3)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cancellations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Cancellation Records</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Booking ID</TableHead>
                <TableHead>Guest</TableHead>
                <TableHead>Camp</TableHead>
                <TableHead>Cancelled</TableHead>
                <TableHead>Policy</TableHead>
                <TableHead>Refund</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cancellations.map(cancellation => (
                <CancellationRow
                  key={cancellation.id}
                  cancellation={cancellation}
                />
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
```

## Integration with Payment System

### Stripe Refund Integration

```typescript
// Backend function (Firebase Cloud Function or API endpoint)
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export async function processStripeRefund(
  paymentIntentId: string,
  amount: number,
  reason: string = 'requested_by_customer'
): Promise<Stripe.Refund> {
  try {
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: Math.round(amount * 1000), // Convert BHD to fils
      reason,
      metadata: {
        refund_type: 'cancellation',
        timestamp: new Date().toISOString(),
      },
    });

    return refund;
  } catch (error) {
    console.error('Stripe refund failed:', error);
    throw error;
  }
}

// Webhook handler for refund events
export async function handleStripeRefundWebhook(event: Stripe.Event) {
  switch (event.type) {
    case 'charge.refunded':
      const charge = event.data.object as Stripe.Charge;
      await handleRefundSuccess(charge);
      break;

    case 'charge.refund.updated':
      const refund = event.data.object as Stripe.Refund;
      await handleRefundUpdate(refund);
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }
}
```

## Edge Cases and Error Handling

### Edge Case Scenarios

1. **Cancellation after check-in**
   - Prevent cancellation if check-in date has passed
   - Show error message to user

2. **Double cancellation**
   - Check booking status before processing
   - Prevent duplicate cancellation records

3. **Refund processing failure**
   - Retry logic with exponential backoff
   - Manual admin intervention option
   - Notify user of delay

4. **Partial refunds**
   - Handle cases where only service fee is refunded
   - Clear communication to user

5. **Host cancellation**
   - Different flow for host-initiated cancellations
   - Full refund to guest regardless of policy
   - Penalty for host (future feature)

### Error Handling Implementation

```typescript
// src/lib/services/error-handler.ts
export class CancellationError extends Error {
  constructor(
    message: string,
    public code: string,
    public userMessage: string
  ) {
    super(message);
    this.name = 'CancellationError';
  }
}

export function handleCancellationError(error: any): CancellationError {
  if (error instanceof CancellationError) {
    return error;
  }

  // Map common errors to user-friendly messages
  if (error.message?.includes('not found')) {
    return new CancellationError(
      error.message,
      'BOOKING_NOT_FOUND',
      'This booking could not be found. Please refresh and try again.'
    );
  }

  if (error.message?.includes('Unauthorized')) {
    return new CancellationError(
      error.message,
      'UNAUTHORIZED',
      'You are not authorized to cancel this booking.'
    );
  }

  if (error.message?.includes('already cancelled')) {
    return new CancellationError(
      error.message,
      'ALREADY_CANCELLED',
      'This booking has already been cancelled.'
    );
  }

  if (error.message?.includes('after check-in')) {
    return new CancellationError(
      error.message,
      'PAST_CHECKIN',
      'Bookings cannot be cancelled after the check-in date has passed.'
    );
  }

  // Default error
  return new CancellationError(
    error.message,
    'UNKNOWN_ERROR',
    'An unexpected error occurred. Please try again or contact support.'
  );
}
```

## Testing Strategy

### Unit Tests

```typescript
// src/lib/services/__tests__/refund-calculator.test.ts
describe('RefundCalculator', () => {
  describe('Flexible Policy', () => {
    it('should give 100% refund when cancelled 24+ hours before', () => {
      const booking = createMockBooking({ totalAmount: 100 });
      const camp = createMockCamp({ cancellationPolicy: 'flexible' });
      
      const result = RefundCalculator.calculateRefund(booking, camp);
      
      expect(result.refundPercentage).toBe(100);
    });

    it('should give 0% refund when cancelled less than 24 hours before', () => {
      // Test implementation
    });
  });

  describe('Moderate Policy', () => {
    it('should give 50% refund when cancelled 48+ hours before', () => {
      // Test implementation
    });
  });

  describe('Strict Policy', () => {
    it('should give 50% refund when cancelled 7+ days before', () => {
      // Test implementation
    });
  });
});
```

### Integration Tests

```typescript
// src/lib/services/__tests__/cancellation-service.test.ts
describe('CancellationService', () => {
  it('should process full cancellation workflow', async () => {
    // 1. Create test booking
    // 2. Cancel booking
    // 3. Verify cancellation record created
    // 4. Verify refund processed
    // 5. Verify emails sent
    // 6. Verify booking status updated
  });

  it('should handle refund failures gracefully', async () => {
    // Test error handling
  });
});
```

## Security Considerations

1. **Authorization**
   - Users can only cancel their own bookings
   - Verify ownership before processing
   - Admin override capability

2. **Data Validation**
   - Validate all input data
   - Prevent manipulation of refund amounts
   - Sanitize user-provided reasons/notes

3. **Audit Trail**
   - Log all cancellation actions
   - Track who initiated cancellation
   - Record timestamps for compliance

4. **Payment Security**
   - Never expose Stripe secret keys
   - Use backend functions for refund processing
   - Validate webhook signatures

## Performance Optimization

1. **Caching**
   - Cache cancellation policies
   - Pre-calculate refund amounts

2. **Async Processing**
   - Process refunds asynchronously
   - Don't block user interface

3. **Batch Operations**
   - Batch email notifications
   - Optimize Firestore queries

## Deployment Checklist

- [ ] Add cancellationPolicy field to all existing camps (migration)
- [ ] Create Firestore indexes for cancellations and refunds collections
- [ ] Set up Stripe webhook endpoint for refund events
- [ ] Deploy backend refund processing function
- [ ] Test all cancellation policy types
- [ ] Test refund processing with test payments
- [ ] Verify email notifications are sent correctly
- [ ] Set up admin dashboard for monitoring
- [ ] Create documentation for hosts about cancellation policies
- [ ] Train support team on handling cancellation issues

## Future Enhancements

1. **Host Cancellation Flow** - Allow hosts to cancel with penalties
2. **Cancellation Insurance** - Optional insurance for guests
3. **Flexible Rescheduling** - Allow date changes instead of cancellation
4. **Automated Reminders** - Remind guests of cancellation deadlines
5. **Analytics Dashboard** - Track cancellation rates and patterns
6. **Dispute Resolution** - Handle cancellation disputes
7. **Partial Cancellations** - Cancel some guests from a multi-guest booking
8. **Cancellation Credits** - Offer credits instead of refunds