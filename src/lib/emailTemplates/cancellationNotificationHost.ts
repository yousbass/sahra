interface CancellationData {
  bookingId: string;
  campName: string;
  campLocation: string;
  checkInDate: string;
  checkOutDate: string;
  numberOfGuests: number;
  totalAmount: number;
  guestName: string;
  cancellationReason?: string;
  cancelledAt: string;
}

export function cancellationNotificationHostTemplate(cancellation: CancellationData): string {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Cancellation Notification</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #F5E6D3;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 30px; background: linear-gradient(135deg, #ED8936 0%, #DD6B20 100%); border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold; text-align: center;">
                Booking Cancelled
              </h1>
              <p style="margin: 10px 0 0; color: #ffffff; font-size: 16px; text-align: center;">
                A guest has cancelled their reservation
              </p>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding: 30px 40px 20px;">
              <p style="margin: 0; color: #2D3748; font-size: 16px; line-height: 1.6;">
                Dear Host,
              </p>
              <p style="margin: 15px 0 0; color: #2D3748; font-size: 16px; line-height: 1.6;">
                We wanted to inform you that a booking for <strong>${cancellation.campName}</strong> has been cancelled by the guest.
              </p>
            </td>
          </tr>

          <!-- Cancellation Details Card -->
          <tr>
            <td style="padding: 0 40px 30px;">
              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #FFFAF0; border-radius: 8px; border: 2px solid #ED8936;">
                <tr>
                  <td style="padding: 20px;">
                    <h2 style="margin: 0 0 15px; color: #DD6B20; font-size: 20px; font-weight: bold;">
                      📋 Cancelled Booking Details
                    </h2>
                    
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 8px 0; color: #718096; font-size: 14px; font-weight: 600;">Booking ID:</td>
                        <td style="padding: 8px 0; color: #2D3748; font-size: 14px; font-weight: bold; text-align: right;">${cancellation.bookingId}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #718096; font-size: 14px; font-weight: 600;">Guest Name:</td>
                        <td style="padding: 8px 0; color: #2D3748; font-size: 14px; font-weight: bold; text-align: right;">${cancellation.guestName}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #718096; font-size: 14px; font-weight: 600;">Camp:</td>
                        <td style="padding: 8px 0; color: #2D3748; font-size: 14px; font-weight: bold; text-align: right;">${cancellation.campName}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #718096; font-size: 14px; font-weight: 600;">Check-in Date:</td>
                        <td style="padding: 8px 0; color: #2D3748; font-size: 14px; font-weight: bold; text-align: right;">${formatDate(cancellation.checkInDate)}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #718096; font-size: 14px; font-weight: 600;">Check-out Date:</td>
                        <td style="padding: 8px 0; color: #2D3748; font-size: 14px; font-weight: bold; text-align: right;">${formatDate(cancellation.checkOutDate)}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #718096; font-size: 14px; font-weight: 600;">Number of Guests:</td>
                        <td style="padding: 8px 0; color: #2D3748; font-size: 14px; font-weight: bold; text-align: right;">${cancellation.numberOfGuests}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #718096; font-size: 14px; font-weight: 600;">Cancelled On:</td>
                        <td style="padding: 8px 0; color: #2D3748; font-size: 14px; font-weight: bold; text-align: right;">${formatDateTime(cancellation.cancelledAt)}</td>
                      </tr>
                      ${cancellation.cancellationReason ? `
                      <tr>
                        <td style="padding: 8px 0; color: #718096; font-size: 14px; font-weight: 600;">Cancellation Reason:</td>
                        <td style="padding: 8px 0; color: #2D3748; font-size: 14px; font-weight: bold; text-align: right;">${cancellation.cancellationReason}</td>
                      </tr>
                      ` : ''}
                      <tr>
                        <td colspan="2" style="padding: 12px 0 8px; border-top: 2px solid #ED8936;">
                          <table role="presentation" style="width: 100%;">
                            <tr>
                              <td style="color: #2D3748; font-size: 16px; font-weight: bold;">Booking Amount:</td>
                              <td style="color: #DD6B20; font-size: 20px; font-weight: bold; text-align: right;">${cancellation.totalAmount.toFixed(2)} BD</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Next Steps -->
          <tr>
            <td style="padding: 0 40px 30px;">
              <h3 style="margin: 0 0 15px; color: #2D3748; font-size: 18px; font-weight: bold;">
                📌 What This Means
              </h3>
              <ul style="margin: 0; padding-left: 20px; color: #4A5568; font-size: 14px; line-height: 1.8;">
                <li>The dates are now available for new bookings</li>
                <li>You don't need to prepare for this guest's arrival</li>
                <li>Your calendar has been automatically updated</li>
                <li>Any applicable refund has been processed according to your cancellation policy</li>
              </ul>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td style="padding: 0 40px 30px;" align="center">
              <a href="https://www.mukhymat.com/host/listings" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #ED8936 0%, #DD6B20 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(237, 137, 54, 0.3);">
                View Your Bookings
              </a>
            </td>
          </tr>

          <!-- Support -->
          <tr>
            <td style="padding: 0 40px 30px;">
              <p style="margin: 0; color: #718096; font-size: 14px; text-align: center; line-height: 1.6;">
                Questions? Contact us at <a href="mailto:support@mukhymat.com" style="color: #DD6B20; text-decoration: none; font-weight: 600;">support@mukhymat.com</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #F7FAFC; border-radius: 0 0 12px 12px; border-top: 1px solid #E2E8F0;">
              <p style="margin: 0; color: #718096; font-size: 12px; text-align: center; line-height: 1.6;">
                © ${new Date().getFullYear()} Sahra Camping. All rights reserved.<br>
                Supporting hosts in creating memorable experiences
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
