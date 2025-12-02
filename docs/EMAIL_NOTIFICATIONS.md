# Email Notifications Setup Guide

This guide explains how to set up and use email notifications in the Sahra Camping platform.

## Overview

The Sahra platform uses [Resend](https://resend.com) to send transactional emails for bookings, cancellations, refunds, and review reminders.

## Email Types

The platform sends the following types of emails:

### 1. Booking Confirmation (Guest)
- **Trigger**: When a booking is successfully created
- **Recipient**: Guest
- **Content**: Booking details, check-in/check-out times, cancellation policy, what to bring

### 2. Booking Notification (Host)
- **Trigger**: When a booking is successfully created
- **Recipient**: Host
- **Content**: Guest information, booking details, next steps for preparation

### 3. Cancellation Notification (Guest)
- **Trigger**: When a booking is cancelled
- **Recipient**: Guest
- **Content**: Cancelled booking details, refund information, alternative camps

### 4. Cancellation Notification (Host)
- **Trigger**: When a booking is cancelled
- **Recipient**: Host
- **Content**: Cancelled booking details, availability update

### 5. Refund Confirmation (Guest)
- **Trigger**: When a refund is processed
- **Recipient**: Guest
- **Content**: Refund amount, processing time, payment method

### 6. Review Reminder (Guest)
- **Trigger**: After checkout (typically 1-2 days after)
- **Recipient**: Guest
- **Content**: Request for review, rating options, review guidelines

## Setup Instructions

### Step 1: Create a Resend Account

1. Go to [https://resend.com](https://resend.com)
2. Sign up for a free account
3. Verify your email address

### Step 2: Get Your API Key

1. Log in to your Resend dashboard
2. Navigate to **API Keys** section
3. Click **Create API Key**
4. Give it a name (e.g., "Sahra Camping")
5. Copy the generated API key

### Step 3: Configure Environment Variables

1. Create a `.env` file in the project root (if it doesn't exist)
2. Add your Resend API key:

```bash
VITE_RESEND_API_KEY=re_your_actual_api_key_here
```

3. **Important**: Never commit your `.env` file to version control

### Step 4: Verify Domain (Production Only)

For production use, you need to verify your sending domain:

1. In Resend dashboard, go to **Domains**
2. Click **Add Domain**
3. Enter your domain (e.g., `sahra.camp`)
4. Follow the DNS configuration instructions
5. Wait for verification (usually takes a few minutes)

**Note**: For development, you can use Resend's test mode which doesn't require domain verification.

## Email Templates

All email templates are located in `/src/lib/emailTemplates/`:

- `bookingConfirmationGuest.ts` - Booking confirmation for guests
- `bookingNotificationHost.ts` - Booking notification for hosts
- `cancellationNotificationGuest.ts` - Cancellation notification for guests
- `cancellationNotificationHost.ts` - Cancellation notification for hosts
- `refundConfirmation.ts` - Refund confirmation for guests
- `reviewReminder.ts` - Review reminder for guests

### Customizing Templates

Each template is a TypeScript function that returns HTML. To customize:

1. Open the template file you want to modify
2. Edit the HTML content
3. Maintain the Sahra brand colors:
   - Primary: `#D4A574` (Terracotta)
   - Secondary: `#F5E6D3` (Sand)
4. Test your changes in development mode

## Usage in Code

### Sending Booking Confirmation

```typescript
import { sendBookingConfirmationToGuest, sendBookingNotificationToHost } from '@/lib/emailService';

// After successful booking creation
try {
  await sendBookingConfirmationToGuest(bookingData, guestEmail, hostEmail);
  await sendBookingNotificationToHost(bookingData, hostEmail, guestEmail);
} catch (error) {
  console.error('Failed to send booking emails:', error);
  // Don't block the booking process if emails fail
}
```

### Sending Cancellation Notifications

```typescript
import { sendCancellationNotificationToGuest, sendCancellationNotificationToHost } from '@/lib/emailService';

// After successful cancellation
try {
  await sendCancellationNotificationToGuest(cancellationData, guestEmail);
  await sendCancellationNotificationToHost(cancellationData, hostEmail);
} catch (error) {
  console.error('Failed to send cancellation emails:', error);
}
```

### Sending Refund Confirmation

```typescript
import { sendRefundConfirmation } from '@/lib/emailService';

// After refund is processed
try {
  await sendRefundConfirmation(refundData, guestEmail);
} catch (error) {
  console.error('Failed to send refund confirmation:', error);
}
```

## Testing

### Development Testing

1. Use your own email address for testing
2. Check Resend dashboard for delivery status
3. Verify email content and formatting

### Test Mode

Resend provides a test mode that doesn't send actual emails:

```typescript
// In development, emails are logged but not sent
if (import.meta.env.DEV) {
  console.log('Would send email:', emailData);
  return { success: true };
}
```

## Troubleshooting

### Emails Not Sending

1. **Check API Key**: Ensure `VITE_RESEND_API_KEY` is set correctly
2. **Check Console**: Look for error messages in browser/server console
3. **Check Resend Dashboard**: View delivery logs and error details
4. **Verify Domain**: Ensure your domain is verified (production only)

### Emails Going to Spam

1. **Verify Domain**: Complete SPF, DKIM, and DMARC setup
2. **Warm Up Domain**: Start with low volume and gradually increase
3. **Check Content**: Avoid spam trigger words
4. **Monitor Reputation**: Check Resend dashboard for bounce/complaint rates

### Rate Limits

Resend free tier limits:
- 100 emails per day
- 3,000 emails per month

For production, upgrade to a paid plan.

## Best Practices

1. **Don't Block User Actions**: Email sending should never block critical user actions (booking, cancellation)
2. **Handle Failures Gracefully**: Log errors but don't show them to users
3. **Use Async/Await**: Always send emails asynchronously
4. **Test Thoroughly**: Test all email types before deploying
5. **Monitor Delivery**: Regularly check Resend dashboard for issues
6. **Keep Templates Updated**: Ensure email content matches current policies

## Support

For issues related to:
- **Resend Service**: Contact [Resend Support](https://resend.com/support)
- **Template Customization**: Check the template files in `/src/lib/emailTemplates/`
- **Integration Issues**: Review the email service code in `/src/lib/emailService.ts`

## Additional Resources

- [Resend Documentation](https://resend.com/docs)
- [Resend API Reference](https://resend.com/docs/api-reference)
- [Email Best Practices](https://resend.com/docs/knowledge-base/best-practices)