interface RefundData {
  bookingId: string;
  campName: string;
  refundAmount: number;
  refundPercentage: number;
  originalAmount: number;
  guestName: string;
  processingTime: string;
}

export function refundConfirmationTemplate(refund: RefundData): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Refund Confirmation</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #F5E6D3;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 30px; background: linear-gradient(135deg, #38B2AC 0%, #319795 100%); border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold; text-align: center;">
                💰 Refund Processed
              </h1>
              <p style="margin: 10px 0 0; color: #ffffff; font-size: 16px; text-align: center;">
                Your refund has been initiated
              </p>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding: 30px 40px 20px;">
              <p style="margin: 0; color: #2D3748; font-size: 16px; line-height: 1.6;">
                Dear ${refund.guestName},
              </p>
              <p style="margin: 15px 0 0; color: #2D3748; font-size: 16px; line-height: 1.6;">
                Good news! Your refund for the cancelled booking at <strong>${refund.campName}</strong> has been processed and will be credited to your original payment method.
              </p>
            </td>
          </tr>

          <!-- Refund Details Card -->
          <tr>
            <td style="padding: 0 40px 30px;">
              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #E6FFFA; border-radius: 8px; border: 2px solid #38B2AC;">
                <tr>
                  <td style="padding: 20px;">
                    <h2 style="margin: 0 0 15px; color: #319795; font-size: 20px; font-weight: bold;">
                      💵 Refund Details
                    </h2>
                    
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 8px 0; color: #718096; font-size: 14px; font-weight: 600;">Booking ID:</td>
                        <td style="padding: 8px 0; color: #2D3748; font-size: 14px; font-weight: bold; text-align: right;">${refund.bookingId}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #718096; font-size: 14px; font-weight: 600;">Camp Name:</td>
                        <td style="padding: 8px 0; color: #2D3748; font-size: 14px; font-weight: bold; text-align: right;">${refund.campName}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #718096; font-size: 14px; font-weight: 600;">Original Amount:</td>
                        <td style="padding: 8px 0; color: #2D3748; font-size: 14px; font-weight: bold; text-align: right;">${refund.originalAmount.toFixed(2)} BD</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #718096; font-size: 14px; font-weight: 600;">Refund Percentage:</td>
                        <td style="padding: 8px 0; color: #2D3748; font-size: 14px; font-weight: bold; text-align: right;">${refund.refundPercentage}%</td>
                      </tr>
                      <tr>
                        <td colspan="2" style="padding: 12px 0 8px; border-top: 2px solid #38B2AC;">
                          <table role="presentation" style="width: 100%;">
                            <tr>
                              <td style="color: #2D3748; font-size: 16px; font-weight: bold;">Refund Amount:</td>
                              <td style="color: #319795; font-size: 24px; font-weight: bold; text-align: right;">${refund.refundAmount.toFixed(2)} BD</td>
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

          <!-- Processing Information -->
          <tr>
            <td style="padding: 0 40px 30px;">
              <div style="background-color: #FFF5F7; border-left: 4px solid #ED64A6; padding: 15px; border-radius: 4px;">
                <p style="margin: 0 0 8px; color: #2D3748; font-size: 14px; font-weight: 600;">
                  ⏱️ Processing Time
                </p>
                <p style="margin: 0; color: #4A5568; font-size: 14px; line-height: 1.6;">
                  ${refund.processingTime}
                </p>
              </div>
            </td>
          </tr>

          <!-- Important Notes -->
          <tr>
            <td style="padding: 0 40px 30px;">
              <h3 style="margin: 0 0 15px; color: #2D3748; font-size: 18px; font-weight: bold;">
                📝 Important Notes
              </h3>
              <ul style="margin: 0; padding-left: 20px; color: #4A5568; font-size: 14px; line-height: 1.8;">
                <li>The refund will appear in your account within the stated processing time</li>
                <li>You will see it credited to the same payment method used for booking</li>
                <li>The exact timing may vary depending on your bank or payment provider</li>
                <li>If you don't see the refund after the processing period, please contact us</li>
              </ul>
            </td>
          </tr>

          <!-- Explore Other Camps -->
          <tr>
            <td style="padding: 0 40px 30px;">
              <div style="background-color: #FFF8F0; border-radius: 8px; padding: 20px; text-align: center;">
                <p style="margin: 0 0 15px; color: #2D3748; font-size: 16px; font-weight: 600;">
                  🏕️ Ready for Your Next Adventure?
                </p>
                <p style="margin: 0 0 20px; color: #4A5568; font-size: 14px;">
                  Explore our amazing desert camps and book your next unforgettable experience
                </p>
                <a href="https://www.mukhymat.com" style="display: inline-block; padding: 12px 28px; background: linear-gradient(135deg, #D4A574 0%, #C89968 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px;">
                  Browse Camps
                </a>
              </div>
            </td>
          </tr>

          <!-- Support -->
          <tr>
            <td style="padding: 0 40px 30px;">
              <p style="margin: 0; color: #718096; font-size: 14px; text-align: center; line-height: 1.6;">
                Questions about your refund? Contact us at <a href="mailto:support@mukhymat.com" style="color: #319795; text-decoration: none; font-weight: 600;">support@mukhymat.com</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #F7FAFC; border-radius: 0 0 12px 12px; border-top: 1px solid #E2E8F0;">
              <p style="margin: 0; color: #718096; font-size: 12px; text-align: center; line-height: 1.6;">
                © ${new Date().getFullYear()} Sahra Camping. All rights reserved.<br>
                Thank you for choosing Sahra
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