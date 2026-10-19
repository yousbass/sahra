const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// ---------------------------------------------------------------------------
// Workspace preview fix (dev-only).
//
// The Replit workspace proxies this artifact at the path prefix `/mobile/`,
// but Metro emits root-relative URLs (`/artifacts/.../entry.bundle`). Loaded
// through the prefix, the HTML shell arrives but its bundle request escapes
// `/mobile/` and is answered by the root web artifact (HTML, not JS) — the
// app never boots and the preview stays white forever.
//
// Metro cannot serve under a base path, so instead: 302-redirect every
// `/mobile`-prefixed request to the Expo dev domain, where the app actually
// runs. The variable only exists in the Replit workspace, so this is inert
// everywhere else (CI, EAS builds, local dev).
//
// NOTE: do NOT try to inject scripts into the HTML shell here — Expo CLI
// serves the HTML outside Metro's enhanceMiddleware chain, so response
// interception never sees it. Pre-app boot code belongs in entry.js.
// ---------------------------------------------------------------------------
const expoDevDomain = process.env.REPLIT_EXPO_DEV_DOMAIN;
if (expoDevDomain) {
  const previousEnhance = config.server.enhanceMiddleware;
  config.server.enhanceMiddleware = (middleware, server) => {
    const base = previousEnhance ? previousEnhance(middleware, server) : middleware;
    return (req, res, next) => {
      const url = req.url || '';
      if (url === '/mobile' || url.startsWith('/mobile/') || url.startsWith('/mobile?')) {
        let rest = url.replace(/^\/mobile/, '');
        if (!rest.startsWith('/')) rest = `/${rest}`;
        res.writeHead(302, {
          Location: `https://${expoDevDomain}${rest === '' ? '/' : rest}`,
          'Cache-Control': 'no-store',
        });
        res.end();
        return;
      }
      return base(req, res, next);
    };
  };
}

module.exports = config;
