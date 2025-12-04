/**
 * Email Templates for Sahra Camping Platform
 * These templates are used by the email service to send notifications
 */

interface BookingData {
  bookingId: string;
  campName: string;
  campLocation: string;
  checkInDate: string;
  checkOutDate: string;
  numberOfGuests: number;
  totalAmount: number;
  guestName: string;
  hostName: string;
  cancellationPolicy: string;
}

interface CancellationData {
  bookingId: string;
  campName: string;
  campLocation: string;
  checkInDate: string;
  checkOutDate: string;
  numberOfGuests: number;
  totalAmount: number;
  guestName: string;
  hostName: string;
  cancellationReason?: string;
  cancelledAt: string;
}

interface RefundData {
  bookingId: string;
  campName: string;
  refundAmount: number;
  refundPercentage: number;
  originalAmount: number;
  guestName: string;
  processingTime: string;
}

interface ListingApprovalData {
  campName: string;
  campLocation?: string;
  hostName: string;
  approvalDate: string;
  dashboardUrl?: string;
}

/**
 * Booking Confirmation Email Template for Guest
 */
export function bookingConfirmationGuestTemplate(data: BookingData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Confirmation</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #d4a574 0%, #c89666 100%); padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">🏕️ Sahra Camping</h1>
              <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 16px;">Booking Confirmed!</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px 0; color: #333333; font-size: 24px;">Hello ${data.guestName}!</h2>
              <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.6;">
                Your booking has been confirmed! We're excited to host you at <strong>${data.campName}</strong>.
              </p>
              
              <!-- Booking Details -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9f9f9; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <tr>
                  <td>
                    <h3 style="margin: 0 0 15px 0; color: #333333; font-size: 18px;">Booking Details</h3>
                    <table width="100%" cellpadding="8" cellspacing="0">
                      <tr>
                        <td style="color: #666666; font-size: 14px; padding: 8px 0;"><strong>Booking ID:</strong></td>
                        <td style="color: #333333; font-size: 14px; padding: 8px 0; text-align: right;">${data.bookingId}</td>
                      </tr>
                      <tr>
                        <td style="color: #666666; font-size: 14px; padding: 8px 0;"><strong>Camp:</strong></td>
                        <td style="color: #333333; font-size: 14px; padding: 8px 0; text-align: right;">${data.campName}</td>
                      </tr>
                      <tr>
                        <td style="color: #666666; font-size: 14px; padding: 8px 0;"><strong>Location:</strong></td>
                        <td style="color: #333333; font-size: 14px; padding: 8px 0; text-align: right;">${data.campLocation}</td>
                      </tr>
                      <tr>
                        <td style="color: #666666; font-size: 14px; padding: 8px 0;"><strong>Check-in:</strong></td>
                        <td style="color: #333333; font-size: 14px; padding: 8px 0; text-align: right;">${data.checkInDate}</td>
                      </tr>
                      <tr>
                        <td style="color: #666666; font-size: 14px; padding: 8px 0;"><strong>Check-out:</strong></td>
                        <td style="color: #333333; font-size: 14px; padding: 8px 0; text-align: right;">${data.checkOutDate}</td>
                      </tr>
                      <tr>
                        <td style="color: #666666; font-size: 14px; padding: 8px 0;"><strong>Guests:</strong></td>
                        <td style="color: #333333; font-size: 14px; padding: 8px 0; text-align: right;">${data.numberOfGuests}</td>
                      </tr>
                      <tr style="border-top: 2px solid #e0e0e0;">
                        <td style="color: #333333; font-size: 16px; padding: 12px 0;"><strong>Total Amount:</strong></td>
                        <td style="color: #d4a574; font-size: 18px; font-weight: bold; padding: 12px 0; text-align: right;">${data.totalAmount.toFixed(3)} BD</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Cancellation Policy -->
              <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0; color: #856404; font-size: 14px;">
                  <strong>Cancellation Policy:</strong> ${data.cancellationPolicy}
                </p>
              </div>
              
              <!-- What's Next -->
              <h3 style="margin: 30px 0 15px 0; color: #333333; font-size: 18px;">What's Next?</h3>
              <ul style="color: #666666; font-size: 14px; line-height: 1.8; padding-left: 20px;">
                <li>You'll receive a reminder email 24 hours before check-in</li>
                <li>Make sure to bring a valid ID for check-in</li>
                <li>Contact the host if you have any special requests</li>
                <li>Check your booking details in your account dashboard</li>
              </ul>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="https://www.mukhymat.com/bookings" style="display: inline-block; padding: 15px 40px; background: linear-gradient(135deg, #d4a574 0%, #c89666 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">View My Bookings</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9f9f9; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="margin: 0 0 10px 0; color: #999999; font-size: 12px;">
                Questions? Contact us at <a href="mailto:support@mukhymat.com" style="color: #d4a574; text-decoration: none;">support@mukhymat.com</a>
              </p>
              <p style="margin: 0; color: #999999; font-size: 12px;">
                © 2024 Sahra Camping. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * Booking Notification Email Template for Host
 */
export function bookingNotificationHostTemplate(data: BookingData, guestEmail: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Booking Notification</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">🎉 New Booking!</h1>
              <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 16px;">You have a new reservation</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px 0; color: #333333; font-size: 24px;">Hello ${data.hostName}!</h2>
              <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.6;">
                Great news! You have a new booking for <strong>${data.campName}</strong>.
              </p>
              
              <!-- Booking Details -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9f9f9; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <tr>
                  <td>
                    <h3 style="margin: 0 0 15px 0; color: #333333; font-size: 18px;">Booking Details</h3>
                    <table width="100%" cellpadding="8" cellspacing="0">
                      <tr>
                        <td style="color: #666666; font-size: 14px; padding: 8px 0;"><strong>Booking ID:</strong></td>
                        <td style="color: #333333; font-size: 14px; padding: 8px 0; text-align: right;">${data.bookingId}</td>
                      </tr>
                      <tr>
                        <td style="color: #666666; font-size: 14px; padding: 8px 0;"><strong>Guest Name:</strong></td>
                        <td style="color: #333333; font-size: 14px; padding: 8px 0; text-align: right;">${data.guestName}</td>
                      </tr>
                      <tr>
                        <td style="color: #666666; font-size: 14px; padding: 8px 0;"><strong>Guest Email:</strong></td>
                        <td style="color: #333333; font-size: 14px; padding: 8px 0; text-align: right;">${guestEmail}</td>
                      </tr>
                      <tr>
                        <td style="color: #666666; font-size: 14px; padding: 8px 0;"><strong>Check-in:</strong></td>
                        <td style="color: #333333; font-size: 14px; padding: 8px 0; text-align: right;">${data.checkInDate}</td>
                      </tr>
                      <tr>
                        <td style="color: #666666; font-size: 14px; padding: 8px 0;"><strong>Check-out:</strong></td>
                        <td style="color: #333333; font-size: 14px; padding: 8px 0; text-align: right;">${data.checkOutDate}</td>
                      </tr>
                      <tr>
                        <td style="color: #666666; font-size: 14px; padding: 8px 0;"><strong>Number of Guests:</strong></td>
                        <td style="color: #333333; font-size: 14px; padding: 8px 0; text-align: right;">${data.numberOfGuests}</td>
                      </tr>
                      <tr style="border-top: 2px solid #e0e0e0;">
                        <td style="color: #333333; font-size: 16px; padding: 12px 0;"><strong>Total Amount:</strong></td>
                        <td style="color: #4CAF50; font-size: 18px; font-weight: bold; padding: 12px 0; text-align: right;">${data.totalAmount.toFixed(3)} BD</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Action Items -->
              <h3 style="margin: 30px 0 15px 0; color: #333333; font-size: 18px;">Next Steps:</h3>
              <ul style="color: #666666; font-size: 14px; line-height: 1.8; padding-left: 20px;">
                <li>Prepare your camp for the guest's arrival</li>
                <li>Review any special requests from the guest</li>
                <li>Ensure all amenities are ready and in good condition</li>
                <li>Contact the guest if you need any additional information</li>
              </ul>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="https://www.mukhymat.com/host/bookings" style="display: inline-block; padding: 15px 40px; background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">View Booking Details</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9f9f9; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="margin: 0 0 10px 0; color: #999999; font-size: 12px;">
                Questions? Contact us at <a href="mailto:support@mukhymat.com" style="color: #4CAF50; text-decoration: none;">support@mukhymat.com</a>
              </p>
              <p style="margin: 0; color: #999999; font-size: 12px;">
                © 2024 Sahra Camping. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * Listing Approval Email Template for Host
 */
export function listingApprovedTemplate(data: ListingApprovalData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Listing Approved</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; color: #ffffff;">
              <h1 style="margin: 0; font-size: 26px;">🎉 Your listing is live!</h1>
              <p style="margin: 10px 0 0 0; font-size: 16px;">Guests can now book ${data.campName}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 12px 0; color: #111827; font-size: 20px;">Hello ${data.hostName},</h2>
              <p style="margin: 0 0 16px 0; color: #374151; font-size: 15px; line-height: 1.6;">
                Your camp <strong>${data.campName}</strong>${data.campLocation ? ` in ${data.campLocation}` : ''} was approved on ${data.approvalDate}.
                It is now visible to guests, and bookings are open.
              </p>
              <div style="margin: 20px 0; padding: 16px; border-radius: 8px; background-color: #ecfdf3; border: 1px solid #bbf7d0; color: #065f46; font-size: 14px;">
                Tip: keep availability and pricing up to date to maximize bookings.
              </div>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
                <tr>
                  <td align="center">
                    <a href="${data.dashboardUrl || 'https://www.mukhymat.com/host/dashboard'}"
                       style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 15px; font-weight: 600;">
                      Open Host Dashboard
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 12px 0; color: #6b7280; font-size: 13px;">
                Need help? Reply to this email or visit the host dashboard for resources.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; padding: 18px 24px; text-align: center; color: #9ca3af; font-size: 12px; border-top: 1px solid #e5e7eb;">
              © 2024 Sahra. All rights reserved.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * Cancellation Notification Email Template for Guest
 */
export function cancellationNotificationGuestTemplate(data: CancellationData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Cancellation</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%); padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">Booking Cancelled</h1>
              <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 16px;">Your reservation has been cancelled</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px 0; color: #333333; font-size: 24px;">Hello ${data.guestName},</h2>
              <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.6;">
                Your booking for <strong>${data.campName}</strong> has been successfully cancelled.
              </p>
              
              <!-- Cancellation Details -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9f9f9; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <tr>
                  <td>
                    <h3 style="margin: 0 0 15px 0; color: #333333; font-size: 18px;">Cancellation Details</h3>
                    <table width="100%" cellpadding="8" cellspacing="0">
                      <tr>
                        <td style="color: #666666; font-size: 14px; padding: 8px 0;"><strong>Booking ID:</strong></td>
                        <td style="color: #333333; font-size: 14px; padding: 8px 0; text-align: right;">${data.bookingId}</td>
                      </tr>
                      <tr>
                        <td style="color: #666666; font-size: 14px; padding: 8px 0;"><strong>Camp:</strong></td>
                        <td style="color: #333333; font-size: 14px; padding: 8px 0; text-align: right;">${data.campName}</td>
                      </tr>
                      <tr>
                        <td style="color: #666666; font-size: 14px; padding: 8px 0;"><strong>Cancelled On:</strong></td>
                        <td style="color: #333333; font-size: 14px; padding: 8px 0; text-align: right;">${new Date(data.cancelledAt).toLocaleDateString()}</td>
                      </tr>
                      ${data.cancellationReason ? `
                      <tr>
                        <td style="color: #666666; font-size: 14px; padding: 8px 0;"><strong>Reason:</strong></td>
                        <td style="color: #333333; font-size: 14px; padding: 8px 0; text-align: right;">${data.cancellationReason}</td>
                      </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Refund Info -->
              <div style="background-color: #e3f2fd; border-left: 4px solid #2196F3; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0; color: #1565C0; font-size: 14px;">
                  <strong>Refund Information:</strong> If eligible for a refund, you will receive a separate email with refund details. Refunds typically take 5-10 business days to process.
                </p>
              </div>
              
              <p style="margin: 20px 0; color: #666666; font-size: 14px; line-height: 1.6;">
                We're sorry to see you cancel. If you have any questions or concerns, please don't hesitate to contact us.
              </p>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="https://www.mukhymat.com" style="display: inline-block; padding: 15px 40px; background: linear-gradient(135deg, #d4a574 0%, #c89666 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">Browse Other Camps</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9f9f9; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="margin: 0 0 10px 0; color: #999999; font-size: 12px;">
                Questions? Contact us at <a href="mailto:support@mukhymat.com" style="color: #d4a574; text-decoration: none;">support@mukhymat.com</a>
              </p>
              <p style="margin: 0; color: #999999; font-size: 12px;">
                © 2024 Sahra Camping. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * Cancellation Notification Email Template for Host
 */
export function cancellationNotificationHostTemplate(data: CancellationData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Cancellation Notice</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%); padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">Booking Cancelled</h1>
              <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 16px;">A reservation has been cancelled</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px 0; color: #333333; font-size: 24px;">Hello ${data.hostName},</h2>
              <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.6;">
                A booking for <strong>${data.campName}</strong> has been cancelled by the guest.
              </p>
              
              <!-- Cancellation Details -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9f9f9; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <tr>
                  <td>
                    <h3 style="margin: 0 0 15px 0; color: #333333; font-size: 18px;">Cancellation Details</h3>
                    <table width="100%" cellpadding="8" cellspacing="0">
                      <tr>
                        <td style="color: #666666; font-size: 14px; padding: 8px 0;"><strong>Booking ID:</strong></td>
                        <td style="color: #333333; font-size: 14px; padding: 8px 0; text-align: right;">${data.bookingId}</td>
                      </tr>
                      <tr>
                        <td style="color: #666666; font-size: 14px; padding: 8px 0;"><strong>Guest Name:</strong></td>
                        <td style="color: #333333; font-size: 14px; padding: 8px 0; text-align: right;">${data.guestName}</td>
                      </tr>
                      <tr>
                        <td style="color: #666666; font-size: 14px; padding: 8px 0;"><strong>Original Check-in:</strong></td>
                        <td style="color: #333333; font-size: 14px; padding: 8px 0; text-align: right;">${data.checkInDate}</td>
                      </tr>
                      <tr>
                        <td style="color: #666666; font-size: 14px; padding: 8px 0;"><strong>Cancelled On:</strong></td>
                        <td style="color: #333333; font-size: 14px; padding: 8px 0; text-align: right;">${new Date(data.cancelledAt).toLocaleDateString()}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 20px 0; color: #666666; font-size: 14px; line-height: 1.6;">
                Your camp is now available for these dates and can be booked by other guests.
              </p>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="https://www.mukhymat.com/host/bookings" style="display: inline-block; padding: 15px 40px; background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">View My Bookings</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9f9f9; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="margin: 0 0 10px 0; color: #999999; font-size: 12px;">
                Questions? Contact us at <a href="mailto:support@mukhymat.com" style="color: #ff9800; text-decoration: none;">support@mukhymat.com</a>
              </p>
              <p style="margin: 0; color: #999999; font-size: 12px;">
                © 2024 Sahra Camping. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * Refund Confirmation Email Template
 */
export function refundConfirmationTemplate(data: RefundData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Refund Confirmation</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%); padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">💰 Refund Processed</h1>
              <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 16px;">Your refund is on its way</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px 0; color: #333333; font-size: 24px;">Hello ${data.guestName}!</h2>
              <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.6;">
                Good news! Your refund for <strong>${data.campName}</strong> has been processed.
              </p>
              
              <!-- Refund Details -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9f9f9; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <tr>
                  <td>
                    <h3 style="margin: 0 0 15px 0; color: #333333; font-size: 18px;">Refund Details</h3>
                    <table width="100%" cellpadding="8" cellspacing="0">
                      <tr>
                        <td style="color: #666666; font-size: 14px; padding: 8px 0;"><strong>Booking ID:</strong></td>
                        <td style="color: #333333; font-size: 14px; padding: 8px 0; text-align: right;">${data.bookingId}</td>
                      </tr>
                      <tr>
                        <td style="color: #666666; font-size: 14px; padding: 8px 0;"><strong>Original Amount:</strong></td>
                        <td style="color: #333333; font-size: 14px; padding: 8px 0; text-align: right;">${data.originalAmount.toFixed(3)} BD</td>
                      </tr>
                      <tr>
                        <td style="color: #666666; font-size: 14px; padding: 8px 0;"><strong>Refund Percentage:</strong></td>
                        <td style="color: #333333; font-size: 14px; padding: 8px 0; text-align: right;">${data.refundPercentage}%</td>
                      </tr>
                      <tr style="border-top: 2px solid #e0e0e0;">
                        <td style="color: #333333; font-size: 16px; padding: 12px 0;"><strong>Refund Amount:</strong></td>
                        <td style="color: #2196F3; font-size: 18px; font-weight: bold; padding: 12px 0; text-align: right;">${data.refundAmount.toFixed(3)} BD</td>
                      </tr>
                      <tr>
                        <td style="color: #666666; font-size: 14px; padding: 8px 0;"><strong>Processing Time:</strong></td>
                        <td style="color: #333333; font-size: 14px; padding: 8px 0; text-align: right;">${data.processingTime}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Important Info -->
              <div style="background-color: #e3f2fd; border-left: 4px solid #2196F3; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0; color: #1565C0; font-size: 14px;">
                  <strong>Important:</strong> The refund will be credited to your original payment method within ${data.processingTime}. You'll see it reflected in your account statement.
                </p>
              </div>
              
              <p style="margin: 20px 0; color: #666666; font-size: 14px; line-height: 1.6;">
                If you have any questions about your refund, please don't hesitate to contact our support team.
              </p>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="https://www.mukhymat.com" style="display: inline-block; padding: 15px 40px; background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">Browse Camps</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9f9f9; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="margin: 0 0 10px 0; color: #999999; font-size: 12px;">
                Questions? Contact us at <a href="mailto:support@mukhymat.com" style="color: #2196F3; text-decoration: none;">support@mukhymat.com</a>
              </p>
              <p style="margin: 0; color: #999999; font-size: 12px;">
                © 2024 Sahra Camping. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * Review Reminder Email Template
 */
export function reviewReminderTemplate(data: BookingData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Share Your Experience</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #FFC107 0%, #FFA000 100%); padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">⭐ How Was Your Stay?</h1>
              <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 16px;">Share your experience with us</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px 0; color: #333333; font-size: 24px;">Hello ${data.guestName}!</h2>
              <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.6;">
                We hope you had an amazing time at <strong>${data.campName}</strong>! Your feedback helps us improve and helps other campers make informed decisions.
              </p>
              
              <p style="margin: 0 0 30px 0; color: #666666; font-size: 16px; line-height: 1.6;">
                Would you mind taking a moment to share your experience?
              </p>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="https://www.mukhymat.com/bookings" style="display: inline-block; padding: 15px 40px; background: linear-gradient(135deg, #FFC107 0%, #FFA000 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">Write a Review</a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 30px 0 0 0; color: #999999; font-size: 14px; text-align: center;">
                Your review will be visible to other users and will help ${data.hostName} improve their service.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9f9f9; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="margin: 0 0 10px 0; color: #999999; font-size: 12px;">
                Questions? Contact us at <a href="mailto:support@mukhymat.com" style="color: #FFC107; text-decoration: none;">support@mukhymat.com</a>
              </p>
              <p style="margin: 0; color: #999999; font-size: 12px;">
                © 2024 Sahra Camping. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}
