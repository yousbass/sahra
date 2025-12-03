// Plain JS API route for Vercel to avoid TypeScript routing issues
const { Resend } = require('resend');

module.exports = async (req, res) => {
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
  const fromEmail = process.env.FROM_EMAIL || 'Sahra <onboarding@resend.dev>';

  if (!resendApiKey) {
    return res.status(500).json({ success: false, error: 'RESEND_API_KEY not configured' });
  }

  const resend = new Resend(resendApiKey);

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }

  const { guestEmail, htmlContent, bookingData } = body || {};

  if (!guestEmail || !htmlContent) {
    return res.status(400).json({ success: false, error: 'Missing guestEmail or htmlContent' });
  }

  try {
    await resend.emails.send({
      from: fromEmail,
      to: guestEmail,
      subject: bookingData?.campName ? `Booking Confirmed - ${bookingData.campName}` : 'Booking Confirmed',
      html: htmlContent,
    });

    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send email';
    return res.status(500).json({ success: false, error: message });
  }
};
