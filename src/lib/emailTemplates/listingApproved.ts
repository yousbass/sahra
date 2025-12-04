interface ListingApprovalData {
  hostName: string;
  campName: string;
  campLocation?: string;
  approvalDate: string;
  dashboardUrl?: string;
}

export function listingApprovedTemplate(data: ListingApprovalData): string {
  const formattedDate = new Date(data.approvalDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Listing Approved</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #F5E6D3;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <tr>
            <td style="padding: 32px; background: linear-gradient(135deg, #D4A574 0%, #C89968 100%); border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: bold;">
                🎉 Your listing is live!
              </h1>
              <p style="margin: 8px 0 0; color: #fff; font-size: 15px;">
                ${data.campName}
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding: 28px 32px;">
              <p style="margin: 0; color: #2D3748; font-size: 16px; line-height: 1.6;">
                Hi ${data.hostName || 'Host'},
              </p>
              <p style="margin: 14px 0 0; color: #2D3748; font-size: 16px; line-height: 1.6;">
                Great news—your camp listing <strong>${data.campName}</strong> has been approved and is now visible to guests.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 32px 28px;">
              <table role="presentation" style="width: 100%; border-collapse: collapse; background: #FFF8F0; border-radius: 10px; border: 2px solid #D4A574;">
                <tr>
                  <td style="padding: 18px 20px;">
                    <h3 style="margin: 0 0 12px; color: #D4A574; font-size: 18px; font-weight: 700;">
                      Listing details
                    </h3>
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 6px 0; color: #718096; font-size: 14px; font-weight: 600;">Name</td>
                        <td style="padding: 6px 0; color: #2D3748; font-size: 14px; font-weight: 700; text-align: right;">${data.campName}</td>
                      </tr>
                      ${data.campLocation ? `
                      <tr>
                        <td style="padding: 6px 0; color: #718096; font-size: 14px; font-weight: 600;">Location</td>
                        <td style="padding: 6px 0; color: #2D3748; font-size: 14px; font-weight: 700; text-align: right;">${data.campLocation}</td>
                      </tr>
                      ` : ''}
                      <tr>
                        <td style="padding: 6px 0; color: #718096; font-size: 14px; font-weight: 600;">Approved on</td>
                        <td style="padding: 6px 0; color: #2D3748; font-size: 14px; font-weight: 700; text-align: right;">${formattedDate}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 32px 28px; text-align: center;">
              <a href="${data.dashboardUrl || 'https://www.mukhymat.com/host/dashboard'}" style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #D4A574 0%, #C89968 100%); color: #fff; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; box-shadow: 0 4px 6px rgba(212, 165, 116, 0.3);">
                View listing
              </a>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 32px 28px;">
              <p style="margin: 0; color: #4A5568; font-size: 14px; line-height: 1.7;">
                To keep your listing performing well, keep pricing and availability up to date, respond quickly to booking requests, and add high-quality photos.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding: 26px 32px; background-color: #F7FAFC; border-top: 1px solid #E2E8F0; border-radius: 0 0 12px 12px; text-align: center;">
              <p style="margin: 0; color: #718096; font-size: 12px; line-height: 1.6;">
                Need help? Contact us at <a href="mailto:support@mukhymat.com" style="color: #D4A574; font-weight: 600; text-decoration: none;">support@mukhymat.com</a><br />
                © ${new Date().getFullYear()} Sahra Camping. All rights reserved.
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
