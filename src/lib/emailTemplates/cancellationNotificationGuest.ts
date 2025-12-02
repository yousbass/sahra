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

export function cancellationNotificationGuestTemplate(cancellation: CancellationData): string {
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
  <title>Booking Cancellation</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #F5E6D3;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 30px; background: linear-gradient(135deg, #E53E3E 0%, #C53030 100%); border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold; text-align: center;">
                Booking Cancelled
              </h1>
              <p style="margin: 10px 0 0; color: #ffffff; font-size: 16px; text-align: center;">
                Your reservation has been cancelled
              </p>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding: 30px 40px 20px;">
              <p style="margin: 0; color: #2D3748; font-size: 16px; line-height: 1.6;">
                Dear ${cancellation.guestName},
              </p>
              <p style="margin: 15px 0 0; color: #2D3748; font-size: 16px; line-height: 1.6;">
                This email confirms that your booking at <strong>${cancellation.campName}</strong> has been cancelled as requested.
              </p>
            </td>
          </tr>

          <!-- Cancellation Details Card -->
          <tr>
            <td style="padding: 0 40px 30px;">
              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #FFF5F5; border-radius: 8px; border: 2px solid #FC8181;">
                <tr>
                  <td style="padding: 20px;">
                    <h2 style="margin: 0 0 15px; color: #E53E3E; font-size: 20px; font-weight: bold;">
                      📋 Cancelled Booking Details
                    </h2>
                    
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 8px 0; color: #718096; font-size: 14px; font-weight: 600;">Booking ID:</td>
                        <td style="padding: 8px 0; color: #2D3748; font-size: 14px; font-weight: bold; text-align: right;">${cancellation.bookingId}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #718096; font-size: 14px; font-weight: 600;">Camp Name:</td>
                        <td style="padding: 8px 0; color: #2D3748; font-size: 14px; font-weight: bold; text-align: right;">${cancellation.campName}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #718096; font-size: 14px; font-weight: 600;">Location:</td>
                        <td style="padding: 8px 0; color: #2D3748; font-size: 14px; font-weight: bold; text-align: right;">${cancellation.campLocation}</td>
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
                        <td style="padding: 8px 0; color: #718096; font-size: 14px; font-weight: 600;">Guests:</td>
                        <td style="padding: 8px 0; color: #2D3748; font-size: 14px; font-weight: bold; text-align: right;">${cancellation.numberOfGuests}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #718096; font-size: 14px; font-weight: 600;">Cancelled On:</td>
                        <td style="padding: 8px 0; color: #2D3748; font-size: 14px; font-weight: bold; text-align: right;">${formatDateTime(cancellation.cancelledAt)}</td>
                      </tr>
                      ${cancellation.cancellationReason ? `
                      <tr>
                        <td style="padding: 8px 0; color: #718096; font-size: 14px; font-weight: 600;">Reason:</td>
                        <td style="padding: 8px 0; color: #2D3748; font-size: 14px; font-weight: bold; text-align: right;">${cancellation.cancellationReason}</td>
                      </tr>
                      ` : ''}
                      <tr>
                        <td colspan="2" style="padding: 12px 0 8px; border-top: 2px solid #FC8181;">
                          <table role="presentation" style="width: 100%;">
                            <tr>
                              <td style="color: #2D3748; font-size: 16px; font-weight: bold;">Original Amount:</td>
                              <td style="color: #E53E3E; font-size: 20px; font-weight: bold; text-align: right;">${cancellation.totalAmount.toFixed(2)} BD</td>
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

          <!-- Refund Information -->
          <tr>
            <td style="padding: 0 40px 30px;">
              <div style="background-color: #EBF8FF; border-left: 4px solid #3182CE; padding: 15px; border-radius: 4px;">
                <p style="margin: 0 0 8px; color: #2D3748; font-size: 14px; font-weight: 600;">
                  💰 Refund Information
                </p>
                <p style="margin: 0; color: #4A5568; font-size: 14px; line-height: 1.6;">
                  If you are eligible for a refund based on the cancellation policy, you will receive a separate email with refund details. Refunds are typically processed within 5-10 business days.
                </p>
              </div>
            </td>
          </tr>

          <!-- Explore Other Camps -->
          <tr>
            <td style="padding: 0 40px 30px;">
              <h3 style="margin: 0 0 15px; color: #2D3748; font-size: 18px; font-weight: bold;">
                🏕️ Explore Other Camps
              </h3>
              <p style="margin: 0; color: #4A5568; font-size: 14px; line-height: 1.6;">
                We're sorry to see your plans change. Why not explore other amazing desert camps in Bahrain? We have many wonderful options available for your next adventure.
              </p>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td style="padding: 0 40px 30px;" align="center">
              <a href="https://sahra.camp" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #D4A574 0%, #C89968 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(212, 165, 116, 0.3);">
                Browse Available Camps
              </a>
            </td>
          </tr>

          <!-- Support -->
          <tr>
            <td style="padding: 0 40px 30px;">
              <p style="margin: 0; color: #718096; font-size: 14px; text-align: center; line-height: 1.6;">
                Questions about your cancellation? Contact us at <a href="mailto:support@sahra.camp" style="color: #D4A574; text-decoration: none; font-weight: 600;">support@sahra.camp</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #F7FAFC; border-radius: 0 0 12px 12px; border-top: 1px solid #E2E8F0;">
              <p style="margin: 0; color: #718096; font-size: 12px; text-align: center; line-height: 1.6;">
                © ${new Date().getFullYear()} Sahra Camping. All rights reserved.<br>
                We hope to see you again soon
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