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
}

export function bookingNotificationHostTemplate(booking: BookingData, guestEmail: string): string {
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
  <title>New Booking Notification</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #F5E6D3;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 30px; background: linear-gradient(135deg, #48BB78 0%, #38A169 100%); border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold; text-align: center;">
                🎊 New Booking Received!
              </h1>
              <p style="margin: 10px 0 0; color: #ffffff; font-size: 16px; text-align: center;">
                You have a new guest reservation
              </p>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding: 30px 40px 20px;">
              <p style="margin: 0; color: #2D3748; font-size: 16px; line-height: 1.6;">
                Dear ${booking.hostName},
              </p>
              <p style="margin: 15px 0 0; color: #2D3748; font-size: 16px; line-height: 1.6;">
                Great news! You have received a new booking for <strong>${booking.campName}</strong>. Please prepare to welcome your guests.
              </p>
            </td>
          </tr>

          <!-- Booking Details Card -->
          <tr>
            <td style="padding: 0 40px 30px;">
              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #F0FFF4; border-radius: 8px; border: 2px solid #48BB78;">
                <tr>
                  <td style="padding: 20px;">
                    <h2 style="margin: 0 0 15px; color: #38A169; font-size: 20px; font-weight: bold;">
                      📋 Booking Details
                    </h2>
                    
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 8px 0; color: #718096; font-size: 14px; font-weight: 600;">Booking ID:</td>
                        <td style="padding: 8px 0; color: #2D3748; font-size: 14px; font-weight: bold; text-align: right;">${booking.bookingId}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #718096; font-size: 14px; font-weight: 600;">Guest Name:</td>
                        <td style="padding: 8px 0; color: #2D3748; font-size: 14px; font-weight: bold; text-align: right;">${booking.guestName}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #718096; font-size: 14px; font-weight: 600;">Guest Email:</td>
                        <td style="padding: 8px 0; color: #2D3748; font-size: 14px; font-weight: bold; text-align: right;">${guestEmail}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #718096; font-size: 14px; font-weight: 600;">Camp:</td>
                        <td style="padding: 8px 0; color: #2D3748; font-size: 14px; font-weight: bold; text-align: right;">${booking.campName}</td>
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
                        <td style="padding: 8px 0; color: #718096; font-size: 14px; font-weight: 600;">Number of Guests:</td>
                        <td style="padding: 8px 0; color: #2D3748; font-size: 14px; font-weight: bold; text-align: right;">${booking.numberOfGuests}</td>
                      </tr>
                      <tr>
                        <td colspan="2" style="padding: 12px 0 8px; border-top: 2px solid #48BB78;">
                          <table role="presentation" style="width: 100%;">
                            <tr>
                              <td style="color: #2D3748; font-size: 16px; font-weight: bold;">Total Earnings:</td>
                              <td style="color: #38A169; font-size: 20px; font-weight: bold; text-align: right;">${booking.totalAmount.toFixed(2)} BD</td>
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

          <!-- Action Items -->
          <tr>
            <td style="padding: 0 40px 30px;">
              <h3 style="margin: 0 0 15px; color: #2D3748; font-size: 18px; font-weight: bold;">
                ✅ Next Steps
              </h3>
              <ul style="margin: 0; padding-left: 20px; color: #4A5568; font-size: 14px; line-height: 1.8;">
                <li>Prepare the camp for guest arrival</li>
                <li>Review any special requests from the guest</li>
                <li>Ensure all amenities are ready and functional</li>
                <li>Contact the guest if you need any additional information</li>
              </ul>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td style="padding: 0 40px 30px;" align="center">
              <a href="https://www.mukhymat.com/host/bookings" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #48BB78 0%, #38A169 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(72, 187, 120, 0.3);">
                View Booking Details
              </a>
            </td>
          </tr>

          <!-- Support -->
          <tr>
            <td style="padding: 0 40px 30px;">
              <p style="margin: 0; color: #718096; font-size: 14px; text-align: center; line-height: 1.6;">
                Questions? Contact us at <a href="mailto:support@mukhymat.com" style="color: #38A169; text-decoration: none; font-weight: 600;">support@mukhymat.com</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #F7FAFC; border-radius: 0 0 12px 12px; border-top: 1px solid #E2E8F0;">
              <p style="margin: 0; color: #718096; font-size: 12px; text-align: center; line-height: 1.6;">
                © ${new Date().getFullYear()} Sahra Camping. All rights reserved.<br>
                Empowering hosts to share unforgettable experiences
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