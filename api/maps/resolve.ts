import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const method = req.method || 'GET';

  if (method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (method !== 'POST' && method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
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

  // Accept url from body or query for flexibility
  let url = (body && (body.url as string)) || (req.query.url as string);

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ success: false, error: 'Missing url' });
  }

  // Ensure absolute URL
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }

  const attemptResolve = async (redirect: RequestRedirect, method: 'GET' | 'HEAD') => {
    const response = await fetch(url, {
      method,
      redirect,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SahraBot/1.0; +https://sahra.camp)',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    const finalUrl = response.url;
    const locationHeader = response.headers.get('location');
    const resolved = redirect === 'manual' ? locationHeader || finalUrl : finalUrl || locationHeader;
    return { response, resolved };
  };

  try {
    // Try manual redirect (captures Location without following)
    let resolvedData = await attemptResolve('manual', 'GET');

    // If nothing, try HEAD manual
    if (!resolvedData.resolved) {
      resolvedData = await attemptResolve('manual', 'HEAD');
    }

    // If still nothing, follow redirects
    if (!resolvedData.resolved) {
      resolvedData = await attemptResolve('follow', 'GET');
    }

    const { response, resolved } = resolvedData;

    if (!resolved) {
      const text = await response.text().catch(() => '');
      return res.status(400).json({
        success: false,
        error: 'Failed to resolve URL',
        status: response.status || 400,
        body: text?.slice(0, 200),
      });
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json({ success: true, resolvedUrl: resolved });
  } catch (error) {
    console.error('❌ Vercel map resolve error:', error);
    const message = error instanceof Error ? error.message : 'Internal error resolving URL';
    return res.status(500).json({ success: false, error: message });
  }
}
