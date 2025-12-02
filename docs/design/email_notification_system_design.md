# Email Notification System Design

## Implementation Approach

We will implement a comprehensive email notification system for the Sahra camping platform using **Resend** as the email service provider. Resend is chosen for its:
- Modern developer experience with React Email support
- Reliable delivery infrastructure
- Generous free tier (100 emails/day)
- Simple API integration
- Built-in email template system with React components

### Key Components

1. **Email Service Layer** - Centralized service for sending emails
2. **Email Templates** - React-based email templates using `@react-email/components`
3. **Notification Triggers** - Event-based system integrated with booking workflow
4. **Delivery Tracking** - Monitor email delivery status
5. **Error Handling** - Retry logic and failure notifications

## Email Service Provider: Resend

### Setup Requirements

```bash
npm install resend @react-email/components
```

### Configuration

```typescript
// src/lib/email/resend-client.ts
import { Resend } from 'resend';

export const resend = new Resend(process.env.VITE_RESEND_API_KEY);

export const EMAIL_CONFIG = {
  from: 'Sahra Camping <noreply@sahra.camp>',
  replyTo: 'support@sahra.camp',
};
```

## Email Templates Structure

### Template Components

All email templates will be built using React Email components for consistent, responsive design:

```typescript
// src/lib/email/templates/BaseEmailTemplate.tsx
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Img,
  Text,
  Button,
  Hr,
} from '@react-email/components';

interface BaseEmailProps {
  previewText: string;
  children: React.ReactNode;
}

export const BaseEmailTemplate = ({ previewText, children }: BaseEmailProps) => (
  <Html>
    <Head />
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Img
            src="https://sahra.camp/logo.png"
            width="150"
            height="50"
            alt="Sahra Camping"
          />
        </Section>
        {children}
        <Hr style={hr} />
        <Section style={footer}>
          <Text style={footerText}>
            © 2025 Sahra Camping. All rights reserved.
          </Text>
          <Text style={footerText}>
            Sakhir, Bahrain
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);
```

### Email Template Types

#### 1. Booking Confirmation (Guest)

**Trigger:** Immediately after successful booking creation  
**File:** `src/lib/email/templates/BookingConfirmationGuest.tsx`

**Content:**
- Booking reference number
- Camp name and location
- Check-in date and time
- Check-out date and time
- Number of guests
- Total amount paid
- Cancellation policy
- Host contact information
- "View Booking" button linking to booking details page
- Map link to camp location

#### 2. Booking Confirmation (Host)

**Trigger:** Immediately after successful booking creation  
**File:** `src/lib/email/templates/BookingConfirmationHost.tsx`

**Content:**
- New booking notification
- Guest name and contact
- Booking reference number
- Check-in/check-out dates and times
- Number of guests
- Total earnings (after platform fee)
- "View Booking" button linking to admin dashboard
- Guest special requests (if any)

#### 3. Cancellation Notification (Guest)

**Trigger:** After guest cancels a booking  
**File:** `src/lib/email/templates/CancellationNotificationGuest.tsx`

**Content:**
- Cancellation confirmation
- Booking reference number
- Camp name
- Original booking dates
- Cancellation date and time
- Refund amount (if applicable)
- Refund processing timeline (5-7 business days)
- "View Cancellation Details" button

#### 4. Cancellation Notification (Host)

**Trigger:** After guest cancels a booking  
**File:** `src/lib/email/templates/CancellationNotificationHost.tsx`

**Content:**
- Cancellation alert
- Guest name
- Booking reference number
- Camp name
- Original booking dates
- Cancellation reason (if provided)
- "View Details" button

#### 5. Refund Confirmation (Guest)

**Trigger:** After refund is processed successfully  
**File:** `src/lib/email/templates/RefundConfirmation.tsx`

**Content:**
- Refund confirmation
- Booking reference number
- Refund amount
- Payment method (original payment method)
- Processing timeline
- Transaction ID
- "View Transaction" button

#### 6. Review Reminder (Guest)

**Trigger:** 24 hours after check-out date  
**File:** `src/lib/email/templates/ReviewReminder.tsx`

**Content:**
- Thank you message
- Camp name and dates stayed
- "Leave a Review" button
- Star rating quick action
- Mention impact of reviews on community

## Notification Triggers and Timing

### Event-Based Trigger System

```typescript
// src/lib/email/notification-service.ts
export enum EmailTriggerEvent {
  BOOKING_CREATED = 'booking_created',
  BOOKING_CANCELLED = 'booking_cancelled',
  REFUND_PROCESSED = 'refund_processed',
  CHECKOUT_COMPLETED = 'checkout_completed',
}

interface NotificationTrigger {
  event: EmailTriggerEvent;
  delay?: number; // milliseconds
  recipients: ('guest' | 'host')[];
  templateName: string;
}

const NOTIFICATION_TRIGGERS: NotificationTrigger[] = [
  {
    event: EmailTriggerEvent.BOOKING_CREATED,
    delay: 0,
    recipients: ['guest', 'host'],
    templateName: 'booking_confirmation',
  },
  {
    event: EmailTriggerEvent.BOOKING_CANCELLED,
    delay: 0,
    recipients: ['guest', 'host'],
    templateName: 'cancellation_notification',
  },
  {
    event: EmailTriggerEvent.REFUND_PROCESSED,
    delay: 0,
    recipients: ['guest'],
    templateName: 'refund_confirmation',
  },
  {
    event: EmailTriggerEvent.CHECKOUT_COMPLETED,
    delay: 86400000, // 24 hours
    recipients: ['guest'],
    templateName: 'review_reminder',
  },
];
```

### Trigger Implementation

```typescript
// src/lib/email/notification-service.ts
import { resend, EMAIL_CONFIG } from './resend-client';
import { renderEmailTemplate } from './template-renderer';

export class EmailNotificationService {
  async sendBookingConfirmation(booking: Booking, camp: Camp) {
    const guestEmail = await this.renderAndSend({
      to: booking.guestEmail,
      subject: `Booking Confirmed - ${camp.name}`,
      template: 'BookingConfirmationGuest',
      data: { booking, camp },
    });

    const hostEmail = await this.renderAndSend({
      to: camp.hostEmail,
      subject: `New Booking - ${camp.name}`,
      template: 'BookingConfirmationHost',
      data: { booking, camp },
    });

    return { guestEmail, hostEmail };
  }

  async sendCancellationNotification(
    booking: Booking,
    camp: Camp,
    cancellation: Cancellation
  ) {
    const guestEmail = await this.renderAndSend({
      to: booking.guestEmail,
      subject: `Booking Cancelled - ${camp.name}`,
      template: 'CancellationNotificationGuest',
      data: { booking, camp, cancellation },
    });

    const hostEmail = await this.renderAndSend({
      to: camp.hostEmail,
      subject: `Booking Cancelled - ${camp.name}`,
      template: 'CancellationNotificationHost',
      data: { booking, camp, cancellation },
    });

    return { guestEmail, hostEmail };
  }

  async sendRefundConfirmation(
    booking: Booking,
    refund: Refund
  ) {
    return await this.renderAndSend({
      to: booking.guestEmail,
      subject: `Refund Processed - Booking #${booking.id}`,
      template: 'RefundConfirmation',
      data: { booking, refund },
    });
  }

  async sendReviewReminder(booking: Booking, camp: Camp) {
    return await this.renderAndSend({
      to: booking.guestEmail,
      subject: `How was your stay at ${camp.name}?`,
      template: 'ReviewReminder',
      data: { booking, camp },
    });
  }

  private async renderAndSend({
    to,
    subject,
    template,
    data,
  }: {
    to: string;
    subject: string;
    template: string;
    data: any;
  }) {
    try {
      const html = await renderEmailTemplate(template, data);
      
      const result = await resend.emails.send({
        from: EMAIL_CONFIG.from,
        to,
        subject,
        html,
        replyTo: EMAIL_CONFIG.replyTo,
      });

      await this.logEmailDelivery({
        emailId: result.id,
        to,
        subject,
        template,
        status: 'sent',
        sentAt: new Date(),
      });

      return result;
    } catch (error) {
      await this.handleEmailError(error, { to, subject, template });
      throw error;
    }
  }

  private async logEmailDelivery(log: EmailLog) {
    // Store in Firestore for tracking
    await addDoc(collection(db, 'email_logs'), log);
  }

  private async handleEmailError(error: any, context: any) {
    console.error('Email sending failed:', error, context);
    // Log to Firestore for admin monitoring
    await addDoc(collection(db, 'email_errors'), {
      error: error.message,
      context,
      timestamp: new Date(),
    });
  }
}
```

## Error Handling and Retry Logic

### Retry Strategy

```typescript
// src/lib/email/retry-handler.ts
export class EmailRetryHandler {
  private maxRetries = 3;
  private retryDelays = [1000, 5000, 15000]; // 1s, 5s, 15s

  async sendWithRetry(
    sendFn: () => Promise<any>,
    context: string
  ): Promise<any> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        return await sendFn();
      } catch (error) {
        lastError = error as Error;
        console.warn(
          `Email send attempt ${attempt + 1} failed for ${context}:`,
          error
        );

        if (attempt < this.maxRetries - 1) {
          await this.delay(this.retryDelays[attempt]);
        }
      }
    }

    // All retries failed
    throw new Error(
      `Failed to send email after ${this.maxRetries} attempts: ${lastError?.message}`
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
```

### Error Types and Handling

```typescript
export enum EmailErrorType {
  INVALID_RECIPIENT = 'invalid_recipient',
  RATE_LIMIT = 'rate_limit',
  TEMPLATE_ERROR = 'template_error',
  NETWORK_ERROR = 'network_error',
  UNKNOWN = 'unknown',
}

export function classifyEmailError(error: any): EmailErrorType {
  if (error.message?.includes('invalid email')) {
    return EmailErrorType.INVALID_RECIPIENT;
  }
  if (error.statusCode === 429) {
    return EmailErrorType.RATE_LIMIT;
  }
  if (error.message?.includes('template')) {
    return EmailErrorType.TEMPLATE_ERROR;
  }
  if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
    return EmailErrorType.NETWORK_ERROR;
  }
  return EmailErrorType.UNKNOWN;
}
```

## Email Delivery Tracking

### Firestore Schema for Email Logs

```typescript
interface EmailLog {
  id: string;
  emailId: string; // Resend email ID
  to: string;
  subject: string;
  template: string;
  status: 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed';
  sentAt: Date;
  deliveredAt?: Date;
  openedAt?: Date;
  clickedAt?: Date;
  error?: string;
  retryCount: number;
  metadata: {
    bookingId?: string;
    userId?: string;
    campId?: string;
  };
}
```

### Webhook Handler for Delivery Events

```typescript
// src/lib/email/webhook-handler.ts
export async function handleResendWebhook(event: any) {
  const { type, data } = event;

  switch (type) {
    case 'email.delivered':
      await updateEmailLog(data.email_id, {
        status: 'delivered',
        deliveredAt: new Date(data.created_at),
      });
      break;

    case 'email.opened':
      await updateEmailLog(data.email_id, {
        status: 'opened',
        openedAt: new Date(data.created_at),
      });
      break;

    case 'email.clicked':
      await updateEmailLog(data.email_id, {
        status: 'clicked',
        clickedAt: new Date(data.created_at),
      });
      break;

    case 'email.bounced':
      await updateEmailLog(data.email_id, {
        status: 'bounced',
        error: data.bounce_type,
      });
      break;

    case 'email.complained':
      // Handle spam complaints
      await handleSpamComplaint(data);
      break;
  }
}

async function updateEmailLog(emailId: string, updates: Partial<EmailLog>) {
  const logsRef = collection(db, 'email_logs');
  const q = query(logsRef, where('emailId', '==', emailId));
  const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    const docRef = doc(db, 'email_logs', snapshot.docs[0].id);
    await updateDoc(docRef, updates);
  }
}
```

## Integration Points with Booking System

### 1. Booking Creation Flow

```typescript
// src/pages/Reserve.tsx - After successful booking
const handleBookingComplete = async (bookingData: Booking) => {
  try {
    // 1. Create booking in Firestore
    const bookingRef = await addDoc(collection(db, 'bookings'), bookingData);
    
    // 2. Trigger email notifications
    const emailService = new EmailNotificationService();
    await emailService.sendBookingConfirmation(bookingData, camp);
    
    // 3. Schedule review reminder (24 hours after checkout)
    await scheduleReviewReminder(bookingRef.id, bookingData.checkOutDate);
    
    // 4. Navigate to confirmation page
    navigate(`/booking-confirmation/${bookingRef.id}`);
  } catch (error) {
    console.error('Booking completion failed:', error);
    // Show error to user
  }
};
```

### 2. Cancellation Flow

```typescript
// src/pages/Bookings.tsx - After cancellation
const handleCancellation = async (
  bookingId: string,
  cancellationData: Cancellation
) => {
  try {
    // 1. Create cancellation record
    await addDoc(collection(db, 'cancellations'), cancellationData);
    
    // 2. Update booking status
    await updateDoc(doc(db, 'bookings', bookingId), {
      status: 'cancelled',
      cancelledAt: new Date(),
    });
    
    // 3. Send cancellation notifications
    const emailService = new EmailNotificationService();
    await emailService.sendCancellationNotification(
      booking,
      camp,
      cancellationData
    );
    
    // 4. Process refund if applicable
    if (cancellationData.refundAmount > 0) {
      await processRefund(bookingId, cancellationData.refundAmount);
    }
  } catch (error) {
    console.error('Cancellation failed:', error);
  }
};
```

### 3. Refund Processing Flow

```typescript
// src/lib/payment/refund-service.ts
export async function processRefund(bookingId: string, amount: number) {
  try {
    // 1. Process refund through payment gateway
    const refund = await stripe.refunds.create({
      payment_intent: booking.paymentIntentId,
      amount: Math.round(amount * 100), // Convert to cents
    });
    
    // 2. Create refund record
    const refundRecord = await addDoc(collection(db, 'refunds'), {
      bookingId,
      amount,
      status: 'processed',
      processedAt: new Date(),
      transactionId: refund.id,
    });
    
    // 3. Send refund confirmation email
    const emailService = new EmailNotificationService();
    await emailService.sendRefundConfirmation(booking, refundRecord);
    
    return refundRecord;
  } catch (error) {
    console.error('Refund processing failed:', error);
    throw error;
  }
}
```

## Scheduled Email Jobs

### Review Reminder Scheduler

```typescript
// src/lib/email/scheduler.ts
export async function scheduleReviewReminder(
  bookingId: string,
  checkOutDate: Date
) {
  const reminderDate = new Date(checkOutDate);
  reminderDate.setHours(reminderDate.getHours() + 24);

  await addDoc(collection(db, 'scheduled_emails'), {
    type: 'review_reminder',
    bookingId,
    scheduledFor: reminderDate,
    status: 'pending',
    createdAt: new Date(),
  });
}

// Background job to process scheduled emails
export async function processScheduledEmails() {
  const now = new Date();
  const scheduledRef = collection(db, 'scheduled_emails');
  const q = query(
    scheduledRef,
    where('status', '==', 'pending'),
    where('scheduledFor', '<=', now)
  );

  const snapshot = await getDocs(q);
  const emailService = new EmailNotificationService();

  for (const docSnap of snapshot.docs) {
    const scheduled = docSnap.data();
    
    try {
      if (scheduled.type === 'review_reminder') {
        const booking = await getDoc(doc(db, 'bookings', scheduled.bookingId));
        const camp = await getDoc(doc(db, 'camps', booking.data().campId));
        
        await emailService.sendReviewReminder(
          booking.data() as Booking,
          camp.data() as Camp
        );
      }

      await updateDoc(doc(db, 'scheduled_emails', docSnap.id), {
        status: 'sent',
        sentAt: new Date(),
      });
    } catch (error) {
      await updateDoc(doc(db, 'scheduled_emails', docSnap.id), {
        status: 'failed',
        error: error.message,
        failedAt: new Date(),
      });
    }
  }
}
```

## Admin Dashboard Integration

### Email Monitoring Component

```typescript
// src/pages/admin/EmailLogs.tsx
export function EmailLogsPage() {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [filter, setFilter] = useState<'all' | 'sent' | 'failed'>('all');

  useEffect(() => {
    const logsRef = collection(db, 'email_logs');
    const q = filter === 'all' 
      ? query(logsRef, orderBy('sentAt', 'desc'), limit(100))
      : query(
          logsRef,
          where('status', '==', filter),
          orderBy('sentAt', 'desc'),
          limit(100)
        );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const emailLogs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as EmailLog[];
      setLogs(emailLogs);
    });

    return unsubscribe;
  }, [filter]);

  return (
    <div>
      <h1>Email Delivery Logs</h1>
      {/* Display logs with filtering and search */}
    </div>
  );
}
```

## Security Considerations

1. **API Key Protection**
   - Store Resend API key in environment variables
   - Never expose in client-side code
   - Use server-side functions for sending emails

2. **Email Validation**
   - Validate all email addresses before sending
   - Sanitize user-provided content in emails
   - Prevent email injection attacks

3. **Rate Limiting**
   - Implement rate limits per user
   - Monitor for abuse patterns
   - Use Resend's built-in rate limiting

4. **Privacy**
   - Don't include sensitive information in email logs
   - Comply with GDPR for email data retention
   - Provide unsubscribe options where applicable

## Performance Optimization

1. **Async Processing**
   - Send emails asynchronously to avoid blocking user actions
   - Use background jobs for scheduled emails

2. **Template Caching**
   - Cache rendered email templates
   - Pre-compile templates during build

3. **Batch Operations**
   - Batch multiple emails when possible
   - Use Resend's batch API for bulk sends

## Testing Strategy

### Unit Tests

```typescript
// src/lib/email/__tests__/notification-service.test.ts
describe('EmailNotificationService', () => {
  it('should send booking confirmation emails', async () => {
    const service = new EmailNotificationService();
    const result = await service.sendBookingConfirmation(mockBooking, mockCamp);
    
    expect(result.guestEmail).toBeDefined();
    expect(result.hostEmail).toBeDefined();
  });

  it('should handle email sending failures gracefully', async () => {
    // Test error handling
  });
});
```

### Integration Tests

```typescript
// Test full email flow from booking to delivery
describe('Email Integration', () => {
  it('should send emails through complete booking flow', async () => {
    // Create booking -> Verify emails sent -> Check delivery logs
  });
});
```

## Deployment Checklist

- [ ] Set up Resend account and obtain API key
- [ ] Configure environment variables
- [ ] Deploy email templates
- [ ] Set up webhook endpoint for delivery tracking
- [ ] Configure DNS records for custom domain (if using)
- [ ] Test all email templates in production
- [ ] Monitor delivery rates and errors
- [ ] Set up admin dashboard for email monitoring

## Future Enhancements

1. **SMS Notifications** - Add SMS for critical updates
2. **Push Notifications** - Mobile app notifications
3. **Email Preferences** - Let users customize notification settings
4. **A/B Testing** - Test different email templates
5. **Localization** - Multi-language email support
6. **Rich Analytics** - Advanced email engagement metrics