interface BookingData {
  bookingId: string;
  campName: string;
  campLocation: string;
  checkInDate: string;
  checkOutDate: string;
  guestName: string;
}

export function reviewReminderTemplate(booking: BookingData): string {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Share Your Experience</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #F5E6D3;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 30px; background: linear-gradient(135deg, #9F7AEA 0%, #805AD5 100%); border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold; text-align: center;">
                ⭐ How Was Your Stay?
              </h1>
              <p style="margin: 10px 0 0; color: #ffffff; font-size: 16px; text-align: center;">
                Share your experience with us
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
                We hope you had an amazing time at <strong>${booking.campName}</strong>! Your feedback helps us improve and helps other travelers make informed decisions.
              </p>
            </td>
          </tr>

          <!-- Stay Details -->
          <tr>
            <td style="padding: 0 40px 30px;">
              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #FAF5FF; border-radius: 8px; border: 2px solid #9F7AEA; padding: 20px;">
                <tr>
                  <td>
                    <h3 style="margin: 0 0 10px; color: #805AD5; font-size: 18px; font-weight: bold;">
                      Your Recent Stay
                    </h3>
                    <p style="margin: 5px 0; color: #4A5568; font-size: 14px;">
                      <strong>Camp:</strong> ${booking.campName}
                    </p>
                    <p style="margin: 5px 0; color: #4A5568; font-size: 14px;">
                      <strong>Location:</strong> ${booking.campLocation}
                    </p>
                    <p style="margin: 5px 0; color: #4A5568; font-size: 14px;">
                      <strong>Dates:</strong> ${formatDate(booking.checkInDate)} - ${formatDate(booking.checkOutDate)}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Rating Section -->
          <tr>
            <td style="padding: 0 40px 30px;">
              <div style="text-align: center; padding: 30px; background-color: #FFFAF0; border-radius: 8px;">
                <p style="margin: 0 0 20px; color: #2D3748; font-size: 18px; font-weight: 600;">
                  Rate your experience
                </p>
                <div style="font-size: 40px; margin-bottom: 20px;">
                  ⭐⭐⭐⭐⭐
                </div>
                <a href="https://www.mukhymat.com/bookings" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #9F7AEA 0%, #805AD5 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(159, 122, 234, 0.3);">
                  Write Your Review
                </a>
              </div>
            </td>
          </tr>

          <!-- What to Include -->
          <tr>
            <td style="padding: 0 40px 30px;">
              <h3 style="margin: 0 0 15px; color: #2D3748; font-size: 18px; font-weight: bold;">
                💭 What to Include in Your Review
              </h3>
              <ul style="margin: 0; padding-left: 20px; color: #4A5568; font-size: 14px; line-height: 1.8;">
                <li>How was the camp setup and cleanliness?</li>
                <li>Were the amenities as described?</li>
                <li>How was your interaction with the host?</li>
                <li>What did you enjoy most about your stay?</li>
                <li>Any suggestions for improvement?</li>
              </ul>
            </td>
          </tr>

          <!-- Benefits -->
          <tr>
            <td style="padding: 0 40px 30px;">
              <div style="background-color: #E6FFFA; border-left: 4px solid #38B2AC; padding: 15px; border-radius: 4px;">
                <p style="margin: 0 0 8px; color: #2D3748; font-size: 14px; font-weight: 600;">
                  🎁 Why Leave a Review?
                </p>
                <p style="margin: 0; color: #4A5568; font-size: 14px; line-height: 1.6;">
                  Your honest feedback helps other travelers choose the perfect camp and helps hosts improve their services. Plus, you'll be helping the Sahra community grow!
                </p>
              </div>
            </td>
          </tr>

          <!-- Support -->
          <tr>
            <td style="padding: 0 40px 30px;">
              <p style="margin: 0; color: #718096; font-size: 14px; text-align: center; line-height: 1.6;">
                Questions? Contact us at <a href="mailto:support@mukhymat.com" style="color: #805AD5; text-decoration: none; font-weight: 600;">support@mukhymat.com</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #F7FAFC; border-radius: 0 0 12px 12px; border-top: 1px solid #E2E8F0;">
              <p style="margin: 0; color: #718096; font-size: 12px; text-align: center; line-height: 1.6;">
                © ${new Date().getFullYear()} Sahra Camping. All rights reserved.<br>
                Thank you for being part of our community
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