import express from 'express';
import cors from 'cors';
import { Resend } from 'resend';
import dotenv from 'dotenv';

// Load environment variables from .env.local first (for local dev), then fallback to .env
dotenv.config({ path: '.env.local' });
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Prefer RESEND_API_KEY, fallback to VITE_RESEND_API_KEY for convenience
const RESEND_API_KEY = process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY;
// Default to Resend's sandbox sender to avoid unverified-domain errors in development
const FROM_EMAIL = process.env.FROM_EMAIL || 'Sahra <onboarding@resend.dev>';

// Initialize Resend with API key
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

// Middleware
app.use(cors());
app.use(express.json());

// Resolve Google Maps short links server-side to avoid browser CORS issues
app.post('/api/maps/resolve', async (req, res) => {
  const { url } = req.body || {};
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ success: false, error: 'Missing url' });
  }

  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SahraBot/1.0; +https://sahra.camp)',
      },
    });
    if (!response.ok) {
      return res.status(400).json({ success: false, error: 'Failed to resolve URL' });
    }
    return res.json({ success: true, resolvedUrl: response.url });
  } catch (error) {
    console.error('❌ Failed to resolve maps URL:', error);
    return res.status(500).json({ success: false, error: 'Internal error resolving URL' });
  }
});

// Create Tap payment page session
app.post('/api/payments/create', async (req, res) => {
  const { amount, currency = 'BHD', bookingId, customer, redirectUrl } = req.body || {};
  
  if (!process.env.TAP_SECRET_KEY) {
    return res.status(500).json({ success: false, error: 'TAP_SECRET_KEY not configured' });
  }
  if (!amount || !bookingId) {
    return res.status(400).json({ success: false, error: 'Missing amount or bookingId' });
  }

  try {
    const baseRedirect = redirectUrl || process.env.VITE_PAYMENT_REDIRECT_URL || 'https://example.com/payment-callback';
    const redirectTarget = bookingId
      ? `${baseRedirect}${baseRedirect.includes('?') ? '&' : '?'}bookingId=${encodeURIComponent(bookingId)}`
      : baseRedirect;

    const paymentPayload = {
      amount: Number(Number(amount).toFixed(3)),
      currency,
      threeDSecure: true,
      save_card: false,
      description: `Booking ${bookingId}`,
      metadata: { bookingId },
      reference: {
        transaction: bookingId,
        order: bookingId,
      },
      receipt: {
        email: true,
        sms: false,
      },
      customer: {
        first_name: customer?.name || 'Guest',
        email: customer?.email || undefined,
        phone: customer?.phone ? { country_code: '973', number: customer.phone } : undefined,
      },
      source: {
        id: 'src_all', // allow all available methods (BenefitPay / Apple Pay / Card)
      },
      redirect: {
        url: redirectTarget,
      },
    };

    const tapRes = await fetch('https://api.tap.company/v2/charges', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.TAP_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentPayload),
    });

    const tapData = await tapRes.json();
    if (!tapRes.ok) {
      console.error('Tap API error:', tapData);
      const tapError =
        tapData?.message ||
        (Array.isArray(tapData?.errors) && tapData.errors[0]?.description) ||
        (Array.isArray(tapData?.errors) && tapData.errors[0]?.code) ||
        'Tap error';
      return res.status(500).json({ success: false, error: tapError, tapData });
    }

    const paymentUrl = tapData?.transaction?.url;
    if (!paymentUrl) {
      return res.status(500).json({ success: false, error: 'Payment URL not returned from Tap' });
    }

    res.json({ success: true, paymentUrl, tapResponse: tapData });
  } catch (error) {
    console.error('❌ Failed to create Tap payment page:', error);
    res.status(500).json({ success: false, error: 'Failed to create payment session' });
  }
});

// Simple root endpoint
app.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    message: 'Email service is running',
    health: '/api/health',
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Email service is running',
    resendConfigured: !!RESEND_API_KEY 
  });
});

// Send booking confirmation email
app.post('/api/emails/booking-confirmation', async (req, res) => {
  try {
    if (!resend) {
      throw new Error('Resend API key is missing. Set RESEND_API_KEY or VITE_RESEND_API_KEY in .env.local/.env');
    }
    const { bookingData, guestEmail, htmlContent } = req.body;
    
    console.log('📧 Sending booking confirmation to:', guestEmail);
    
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: guestEmail,
      subject: `Booking Confirmed - ${bookingData.campName}`,
      html: htmlContent,
    });
    
    console.log('✅ Email sent successfully:', result);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('❌ Failed to send email:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Send booking notification to host
app.post('/api/emails/booking-notification', async (req, res) => {
  try {
    if (!resend) {
      throw new Error('Resend API key is missing. Set RESEND_API_KEY or VITE_RESEND_API_KEY in .env.local/.env');
    }
    const { bookingData, hostEmail, htmlContent } = req.body;
    
    console.log('📧 Sending booking notification to host:', hostEmail);
    
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: hostEmail,
      subject: `New Booking - ${bookingData.campName}`,
      html: htmlContent,
    });
    
    console.log('✅ Email sent successfully:', result);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('❌ Failed to send email:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Send cancellation notification to guest
app.post('/api/emails/cancellation-guest', async (req, res) => {
  try {
    if (!resend) {
      throw new Error('Resend API key is missing. Set RESEND_API_KEY or VITE_RESEND_API_KEY in .env.local/.env');
    }
    const { cancellationData, guestEmail, htmlContent } = req.body;
    
    console.log('📧 Sending cancellation notification to guest:', guestEmail);
    
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: guestEmail,
      subject: `Booking Cancelled - ${cancellationData.campName}`,
      html: htmlContent,
    });
    
    console.log('✅ Email sent successfully:', result);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('❌ Failed to send email:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Send cancellation notification to host
app.post('/api/emails/cancellation-host', async (req, res) => {
  try {
    if (!resend) {
      throw new Error('Resend API key is missing. Set RESEND_API_KEY or VITE_RESEND_API_KEY in .env.local/.env');
    }
    const { cancellationData, hostEmail, htmlContent } = req.body;
    
    console.log('📧 Sending cancellation notification to host:', hostEmail);
    
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: hostEmail,
      subject: `Booking Cancelled - ${cancellationData.campName}`,
      html: htmlContent,
    });
    
    console.log('✅ Email sent successfully:', result);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('❌ Failed to send email:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Send refund confirmation
app.post('/api/emails/refund-confirmation', async (req, res) => {
  try {
    if (!resend) {
      throw new Error('Resend API key is missing. Set RESEND_API_KEY or VITE_RESEND_API_KEY in .env.local/.env');
    }
    const { refundData, guestEmail, htmlContent } = req.body;
    
    console.log('📧 Sending refund confirmation to guest:', guestEmail);
    
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: guestEmail,
      subject: `Refund Processed - ${refundData.campName}`,
      html: htmlContent,
    });
    
    console.log('✅ Email sent successfully:', result);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('❌ Failed to send email:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Send review reminder
app.post('/api/emails/review-reminder', async (req, res) => {
  try {
    if (!resend) {
      throw new Error('Resend API key is missing. Set RESEND_API_KEY or VITE_RESEND_API_KEY in .env.local/.env');
    }
    const { bookingData, guestEmail, htmlContent } = req.body;
    
    console.log('📧 Sending review reminder to guest:', guestEmail);
    
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: guestEmail,
      subject: `How was your stay at ${bookingData.campName}?`,
      html: htmlContent,
    });
    
    console.log('✅ Email sent successfully:', result);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('❌ Failed to send email:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Send listing approval to host
app.post('/api/emails/listing-approved', async (req, res) => {
  try {
    if (!resend) {
      throw new Error('Resend API key is missing. Set RESEND_API_KEY or VITE_RESEND_API_KEY in .env.local/.env');
    }
    const { listingData, hostEmail, htmlContent } = req.body;
    
    console.log('📧 Sending listing approval to host:', hostEmail);
    
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: hostEmail,
      subject: `Your listing is live - ${listingData.campName}`,
      html: htmlContent,
    });
    
    console.log('✅ Email sent successfully:', result);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('❌ Failed to send email:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Email service running on http://localhost:${PORT}`);
  console.log(`📧 Resend API configured: ${!!RESEND_API_KEY}`);
  if (!RESEND_API_KEY) {
    console.warn('⚠️  RESEND_API_KEY is missing. Set RESEND_API_KEY (or VITE_RESEND_API_KEY) in .env.local/.env for email sending.');
  }
  console.log(`✉️  From address: ${FROM_EMAIL}`);
});
