// Vercel Node API route (no framework types to avoid missing deps in build)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
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

  const extractCoords = (input: string | undefined | null) => {
    if (!input) return null;
    const decoded = decodeURIComponent(input);
    const regexes = [
      /@(-?\d+\.?\d*),(-?\d+\.?\d*),/,
      /[?&](?:q|query|ll|center|sll)=(-?\d+\.?\d*),(-?\d+\.?\d*)/i,
      /!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/,
      /(-?\d+\.\d+),\s*(-?\d+\.\d+)/
    ];
    for (const rx of regexes) {
      const m = decoded.match(rx);
      if (m) return { lat: m[1], lng: m[2] };
    }
    return null;
  };

  const attemptResolve = async (redirect: 'follow' | 'manual', method: 'GET' | 'HEAD') => {
    try {
      const response = await fetch(url, {
        method,
        redirect,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; MukhymatBot/1.0; +https://www.mukhymat.com)',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });

      const finalUrl = response.url;
      const locationHeader = response.headers.get('location');
      const resolved = redirect === 'manual' ? locationHeader || finalUrl : finalUrl || locationHeader;
      return { response, resolved };
    } catch (error) {
      console.error('❌ Resolve attempt failed:', error);
      return { response: null, resolved: null };
    }
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

    let resolvedLat: string | undefined;
    let resolvedLng: string | undefined;
    const coordFromUrl = extractCoords(resolved);

    if (coordFromUrl) {
      resolvedLat = coordFromUrl.lat;
      resolvedLng = coordFromUrl.lng;
    } else if (response?.text) {
      const text = await response.text().catch(() => '');
      const coordFromBody = extractCoords(text);
      if (coordFromBody) {
        resolvedLat = coordFromBody.lat;
        resolvedLng = coordFromBody.lng;
      }
      if (!resolved) {
        const status = response?.status || 400;
        return res.status(400).json({
          success: false,
          error: 'Failed to resolve URL',
          status,
          body: text?.slice(0, 200) || 'No response body',
        });
      }
    } else if (!resolved) {
      // No resolved URL/coords; fall back to original URL so client can still parse
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.status(200).json({ success: true, resolvedUrl: url });
    }

    // If still no coordinates, try geocoding the place name/id using Google Geocoding API
    if ((!resolvedLat || !resolvedLng) && process.env.GOOGLE_MAPS_API_KEY) {
      const parsed = resolved ? new URL(resolved) : new URL(url);
      const qs = parsed.searchParams;
      const query =
        qs.get('q') ||
        qs.get('query') ||
        qs.get('ftid') ||
        parsed.pathname.replace(/^\//, '') ||
        undefined;

      if (query) {
        try {
          const geoResp = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
              query
            )}&key=${process.env.GOOGLE_MAPS_API_KEY}`
          );
          const geoData = await geoResp.json();
          const firstResult = geoData?.results?.[0]?.geometry?.location;
          if (firstResult?.lat && firstResult?.lng) {
            resolvedLat = String(firstResult.lat);
            resolvedLng = String(firstResult.lng);
          }
        } catch (geoError) {
          console.warn('❌ Geocoding fallback failed:', geoError);
        }
      }
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json({ success: true, resolvedUrl: resolved, resolvedLat, resolvedLng });
  } catch (error) {
    console.error('❌ Vercel map resolve error:', error);
    const message = error instanceof Error ? error.message : 'Internal error resolving URL';
    return res.status(500).json({ success: false, error: message });
  }
}
