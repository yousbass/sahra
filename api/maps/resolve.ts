import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { url } = (req.body || {}) as { url?: string };

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

    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json({ success: true, resolvedUrl: response.url });
  } catch (error) {
    console.error('❌ Vercel map resolve error:', error);
    return res.status(500).json({ success: false, error: 'Internal error resolving URL' });
  }
}
