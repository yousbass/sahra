import { Resend } from 'resend';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
  const method = req.method || 'GET';

  if (method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const resendApiKey = process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY;
  const fromEmail = process.env.FROM_EMAIL || 'Bookings <no-reply@mukhymat.com>';

  if (!resendApiKey) {
    return res.status(500).json({ success: false, error: 'RESEND_API_KEY not configured' });
  }

  const resend = new Resend(resendApiKey);

  let body: any = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }

  const { hostEmail, htmlContent, bookingData, guestEmail } = body || {};

  if (!hostEmail || !htmlContent) {
    return res.status(400).json({ success: false, error: 'Missing hostEmail or htmlContent' });
  }

  try {
    await resend.emails.send({
      from: fromEmail,
      to: hostEmail,
      subject: bookingData?.campName ? `New Booking - ${bookingData.campName}` : 'New Booking',
      html: htmlContent,
      replyTo: guestEmail || undefined,
    });

    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send email';
    return res.status(500).json({ success: false, error: message });
  }
}
