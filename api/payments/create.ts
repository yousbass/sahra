// Vercel serverless function to create a Tap Payments session
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
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

  if (!process.env.TAP_SECRET_KEY) {
    return res.status(500).json({ success: false, error: 'TAP_SECRET_KEY not configured' });
  }

  // Body can arrive as string on some platforms
  let body: any = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }

  const { amount, currency = 'BHD', bookingId, customer = {}, redirectUrl } = body || {};

  if (!amount || !bookingId) {
    return res.status(400).json({ success: false, error: 'Missing amount or bookingId' });
  }

  try {
    const baseRedirect =
      redirectUrl || process.env.VITE_PAYMENT_REDIRECT_URL || process.env.PAYMENT_REDIRECT_URL;
    const redirectTarget = baseRedirect
      ? `${baseRedirect}${baseRedirect.includes('?') ? '&' : '?'}bookingId=${encodeURIComponent(
          bookingId
        )}`
      : 'https://mukhymat.com/payment-success';

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
      const tapError =
        tapData?.message ||
        (Array.isArray(tapData?.errors) && tapData.errors[0]?.description) ||
        (Array.isArray(tapData?.errors) && tapData.errors[0]?.code) ||
        'Tap error';
      return res.status(500).json({ success: false, error: tapError, tapData });
    }

    const paymentUrl = tapData?.transaction?.url;
    if (!paymentUrl) {
      return res
        .status(500)
        .json({ success: false, error: 'Payment URL not returned from Tap', tapData });
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json({ success: true, paymentUrl, tapResponse: tapData });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create payment session';
    return res.status(500).json({ success: false, error: message });
  }
}
