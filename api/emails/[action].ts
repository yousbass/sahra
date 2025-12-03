// Vercel serverless function to send transactional emails via Resend
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
  const action = (req.query?.action as string) || 'booking-confirmation';
  const method = req.method || 'GET';

  if (method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const Resend = (await import('resend')).Resend;
  const resendApiKey = process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY;
  const fromEmail = process.env.FROM_EMAIL || 'Sahra <onboarding@resend.dev>';

  if (!resendApiKey) {
    return res.status(500).json({ success: false, error: 'RESEND_API_KEY not configured' });
  }

  const resend = new Resend(resendApiKey);

  // Body can arrive as string
  let body: any = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }

  const {
    bookingData,
    cancellationData,
    refundData,
    listingData,
    guestEmail,
    hostEmail,
    htmlContent,
  } = body || {};

  const sendMail = async (to: string | string[], subject: string, html: string) => {
    const result = await resend.emails.send({
      from: fromEmail,
      to,
      subject,
      html,
    });
    return result;
  };

  try {
    let to = '';
    let subject = '';
    let html = htmlContent || '';

    switch (action) {
      case 'booking-confirmation':
        to = guestEmail;
        subject = bookingData?.campName ? `Booking Confirmed - ${bookingData.campName}` : 'Booking Confirmed';
        break;
      case 'booking-notification':
        to = hostEmail;
        subject = bookingData?.campName ? `New Booking - ${bookingData.campName}` : 'New Booking';
        break;
      case 'cancellation-guest':
        to = guestEmail;
        subject = cancellationData?.campName ? `Booking Cancelled - ${cancellationData.campName}` : 'Booking Cancelled';
        break;
      case 'cancellation-host':
        to = hostEmail;
        subject = cancellationData?.campName ? `Booking Cancelled - ${cancellationData.campName}` : 'Booking Cancelled';
        break;
      case 'refund-confirmation':
        to = guestEmail;
        subject = refundData?.campName ? `Refund Processed - ${refundData.campName}` : 'Refund Processed';
        break;
      case 'review-reminder':
        to = guestEmail;
        subject = bookingData?.campName ? `Rate Your Stay at ${bookingData.campName}` : 'Rate Your Stay';
        break;
      case 'listing-approved':
        to = hostEmail;
        subject = listingData?.campName ? `Listing Approved - ${listingData.campName}` : 'Listing Approved';
        break;
      default:
        return res.status(404).json({ success: false, error: 'Unknown email action' });
    }

    if (!to || !html) {
      return res.status(400).json({ success: false, error: 'Missing recipient or content' });
    }

    await sendMail(to, subject, html);

    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send email';
    console.error('❌ Email send error:', error);
    return res.status(500).json({ success: false, error: message });
  }
}
