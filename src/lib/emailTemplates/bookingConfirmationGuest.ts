interface BookingData {
  bookingId: string;
  campName: string;
  campLocation: string;
  checkInDate: string;
  checkOutDate: string;
  numberOfGuests: number;
  totalAmount: number;
  guestName: string;
  cancellationPolicy: string;
}

export function bookingConfirmationGuestTemplate(booking: BookingData): string {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Confirmation</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #F5E6D3;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 30px; background: linear-gradient(135deg, #D4A574 0%, #C89968 100%); border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold; text-align: center;">
                🎉 Booking Confirmed!
              </h1>
              <p style="margin: 10px 0 0; color: #ffffff; font-size: 16px; text-align: center;">
                Your desert adventure awaits
              </p>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding: 30px 40px 20px;">
              <p style="margin: 0; color: #2D3748; font-size: 16px; line-height: 1.6;">
                Dear ${booking.guestName},
              </p>
              <p style="margin: 15px 0 0; color: #2D3748; font-size: 16px; line-height: 1.6;">
                Great news! Your booking at <strong>${booking.campName}</strong> has been confirmed. Get ready for an unforgettable experience in the Bahrain desert!
              </p>
            </td>
          </tr>

          <!-- Booking Details Card -->
          <tr>
            <td style="padding: 0 40px 30px;">
              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #FFF8F0; border-radius: 8px; border: 2px solid #D4A574;">
                <tr>
                  <td style="padding: 20px;">
                    <h2 style="margin: 0 0 15px; color: #D4A574; font-size: 20px; font-weight: bold;">
                      📋 Booking Details
                    </h2>
                    
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 8px 0; color: #718096; font-size: 14px; font-weight: 600;">Booking ID:</td>
                        <td style="padding: 8px 0; color: #2D3748; font-size: 14px; font-weight: bold; text-align: right;">${booking.bookingId}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #718096; font-size: 14px; font-weight: 600;">Camp Name:</td>
                        <td style="padding: 8px 0; color: #2D3748; font-size: 14px; font-weight: bold; text-align: right;">${booking.campName}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #718096; font-size: 14px; font-weight: 600;">Location:</td>
                        <td style="padding: 8px 0; color: #2D3748; font-size: 14px; font-weight: bold; text-align: right;">${booking.campLocation}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #718096; font-size: 14px; font-weight: 600;">Check-in:</td>
                        <td style="padding: 8px 0; color: #2D3748; font-size: 14px; font-weight: bold; text-align: right;">${formatDate(booking.checkInDate)}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #718096; font-size: 14px; font-weight: 600;">Check-out:</td>
                        <td style="padding: 8px 0; color: #2D3748; font-size: 14px; font-weight: bold; text-align: right;">${formatDate(booking.checkOutDate)}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #718096; font-size: 14px; font-weight: 600;">Guests:</td>
                        <td style="padding: 8px 0; color: #2D3748; font-size: 14px; font-weight: bold; text-align: right;">${booking.numberOfGuests}</td>
                      </tr>
                      <tr>
                        <td colspan="2" style="padding: 12px 0 8px; border-top: 2px solid #D4A574;">
                          <table role="presentation" style="width: 100%;">
                            <tr>
                              <td style="color: #2D3748; font-size: 16px; font-weight: bold;">Total Amount:</td>
                              <td style="color: #D4A574; font-size: 20px; font-weight: bold; text-align: right;">${booking.totalAmount.toFixed(2)} BD</td>
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

          <!-- Cancellation Policy -->
          <tr>
            <td style="padding: 0 40px 30px;">
              <div style="background-color: #EBF8FF; border-left: 4px solid #3182CE; padding: 15px; border-radius: 4px;">
                <p style="margin: 0; color: #2D3748; font-size: 14px; font-weight: 600;">
                  📌 Cancellation Policy: <span style="color: #3182CE;">${booking.cancellationPolicy}</span>
                </p>
              </div>
            </td>
          </tr>

          <!-- What to Bring -->
          <tr>
            <td style="padding: 0 40px 30px;">
              <h3 style="margin: 0 0 15px; color: #2D3748; font-size: 18px; font-weight: bold;">
                🎒 What to Bring
              </h3>
              <ul style="margin: 0; padding-left: 20px; color: #4A5568; font-size: 14px; line-height: 1.8;">
                <li>Valid ID or passport</li>
                <li>Comfortable clothing suitable for desert weather</li>
                <li>Personal toiletries</li>
                <li>Camera to capture memories</li>
                <li>Any personal medications</li>
              </ul>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td style="padding: 0 40px 30px;" align="center">
              <a href="https://sahra.camp/bookings" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #D4A574 0%, #C89968 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(212, 165, 116, 0.3);">
                View Booking Details
              </a>
            </td>
          </tr>

          <!-- Support -->
          <tr>
            <td style="padding: 0 40px 30px;">
              <p style="margin: 0; color: #718096; font-size: 14px; text-align: center; line-height: 1.6;">
                Need help? Contact us at <a href="mailto:support@sahra.camp" style="color: #D4A574; text-decoration: none; font-weight: 600;">support@sahra.camp</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #F7FAFC; border-radius: 0 0 12px 12px; border-top: 1px solid #E2E8F0;">
              <p style="margin: 0; color: #718096; font-size: 12px; text-align: center; line-height: 1.6;">
                © ${new Date().getFullYear()} Sahra Camping. All rights reserved.<br>
                Experience the magic of Bahrain's desert
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