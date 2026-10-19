/**
 * Google Maps URL coordinate extraction — verbatim port of the web
 * CreateListing.tsx logic so hosts can paste the same links on mobile.
 */

export const isGoogleShortLink = (url: string): boolean =>
  /^https?:\/\/(maps\.app\.goo\.gl|goo\.gl)\/.+/i.test(url.trim());

export const extractCoordinatesFromUrl = (
  url: string
): { lat: string; lng: string } | null => {
  if (!url) return null;

  const decoded = decodeURIComponent(url);

  // Use URL search params when possible
  try {
    const parsed = new URL(decoded);
    const searchLatLng =
      parsed.searchParams.get('q') ||
      parsed.searchParams.get('query') ||
      parsed.searchParams.get('ll') ||
      parsed.searchParams.get('center') ||
      parsed.searchParams.get('sll');
    if (searchLatLng) {
      const parts = searchLatLng.split(',');
      if (parts.length >= 2) {
        const [lat, lng] = parts;
        if (!Number.isNaN(Number(lat)) && !Number.isNaN(Number(lng))) {
          return { lat, lng };
        }
      }
    }
  } catch {
    // Ignore URL parsing failures and fall back to regexes below
  }

  // ?q=lat,lng or &q=lat,lng (e.g., share link)
  const matchQuery = decoded.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (matchQuery) return { lat: matchQuery[1], lng: matchQuery[2] };

  // ?query=lat,lng (Google Maps API param)
  const matchQueryParam = decoded.match(/[?&]query=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (matchQueryParam) return { lat: matchQueryParam[1], lng: matchQueryParam[2] };

  // @lat,lng,zoom (standard map URL)
  const matchAt = decoded.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*),/);
  if (matchAt) return { lat: matchAt[1], lng: matchAt[2] };

  // ...!3dlat!4dlng (place URLs)
  const matchBang = decoded.match(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/);
  if (matchBang) return { lat: matchBang[1], lng: matchBang[2] };

  // place/.../@lat,lng (sometimes without zoom)
  const matchPlace = decoded.match(/place\/[^/]+\/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (matchPlace) return { lat: matchPlace[1], lng: matchPlace[2] };

  // Fallback: first lat,lng pair in the string
  const matchAnyPair = decoded.match(/(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
  if (matchAnyPair) return { lat: matchAnyPair[1], lng: matchAnyPair[2] };

  return null;
};

/**
 * Resolve maps.app.goo.gl / goo.gl short links through the shared api-server
 * route (same endpoint the web uses), trying POST then GET.
 */
export const resolveShortGoogleUrl = async (
  url: string
): Promise<{ resolvedUrl?: string; lat?: string; lng?: string } | null> => {
  const target = `https://${process.env.EXPO_PUBLIC_DOMAIN}/api/maps/resolve`;

  try {
    const response = await fetch(target, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    if (response.ok) {
      const data = await response.json();
      if (data?.resolvedUrl || data?.resolvedLat) {
        return { resolvedUrl: data.resolvedUrl, lat: data.resolvedLat, lng: data.resolvedLng };
      }
    }
  } catch (error) {
    console.warn('Failed to resolve short Google Maps URL via POST:', error);
  }

  // Fallback: GET with query param (some environments block POST)
  try {
    const response = await fetch(`${target}?url=${encodeURIComponent(url)}`, { method: 'GET' });
    if (response.ok) {
      const data = await response.json();
      if (data?.resolvedUrl || data?.resolvedLat) {
        return { resolvedUrl: data.resolvedUrl, lat: data.resolvedLat, lng: data.resolvedLng };
      }
    }
  } catch (error) {
    console.warn('Failed to resolve short Google Maps URL via GET:', error);
  }

  return null;
};
