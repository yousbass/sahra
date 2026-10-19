/**
 * Custom app entry (package.json "main").
 *
 * Runs web-only boot armor BEFORE any app/vendor module executes, then hands
 * over to the standard expo-router entry. Native iOS/Android is untouched —
 * everything is gated on `typeof document`.
 *
 * Why this exists: the workspace preview showed a silent white screen with no
 * error. Three separate protections live here because they must run before
 * the app (a bundle that crashes at module scope can't defend itself):
 *
 * 1. STORAGE SHIM — when the app is embedded in an iframe (the Replit preview
 *    pane frames it on replit.com) and the browser blocks third-party
 *    storage, `window.localStorage` access THROWS. AsyncStorage, i18n, and
 *    Firebase persistence all touch it during module evaluation, so the whole
 *    bundle dies before first paint. The shim swaps in an in-memory fallback
 *    (session-only persistence, but the app boots).
 *
 * 2. INSTANT BRANDED LOADER — paints a MUKHYMAT loading screen the moment the
 *    bundle starts executing, removed automatically when React mounts. Turns
 *    "white = broken?" into visible progress, and doubles as a probe: if the
 *    loader appears but the app doesn't, the bundle ran and the failure is
 *    later; if not even the loader appears, the bundle never executed.
 *
 * 3. WATCHDOG DIAGNOSTICS — if React still hasn't mounted after 15s, the
 *    loader morphs into a readable report of every captured error instead of
 *    spinning forever.
 */
/* eslint-disable no-var */
if (typeof document !== 'undefined') {
  (function () {
    // ---- 1. storage shim (must be first: imports below may touch storage) --
    var shimmed = [];
    var shimStorage = function (name) {
      try {
        window[name].getItem('__probe__');
        return; // storage works — leave it alone
      } catch (e) {}
      var mem = {};
      var shim = {
        getItem: function (k) {
          return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null;
        },
        setItem: function (k, v) {
          mem[k] = String(v);
        },
        removeItem: function (k) {
          delete mem[k];
        },
        clear: function () {
          mem = {};
        },
        key: function (i) {
          return Object.keys(mem)[i] || null;
        },
      };
      try {
        Object.defineProperty(shim, 'length', {
          get: function () {
            return Object.keys(mem).length;
          },
        });
      } catch (e) {}
      try {
        Object.defineProperty(window, name, { value: shim, configurable: true });
        shimmed.push(name);
      } catch (e) {}
    };
    shimStorage('localStorage');
    shimStorage('sessionStorage');

    // ---- error capture --------------------------------------------------
    var failures = [];
    var onError = function (e) {
      var t = e && e.target;
      if (t && (t.tagName === 'SCRIPT' || t.tagName === 'LINK')) {
        failures.push('Failed to load: ' + (t.src || t.href));
      } else if (e && e.message) {
        failures.push('JS error: ' + e.message);
      }
    };
    var onRejection = function (e) {
      var r = e && e.reason;
      failures.push(
        'Promise rejection: ' + ((r && (r.message || r.stack || r)) || 'unknown')
      );
    };
    window.addEventListener('error', onError, true);
    window.addEventListener('unhandledrejection', onRejection);

    // ---- 2 + 3. loader now, diagnostics at 15s, cleanup on mount ---------
    var overlayEl = null;
    var pollTimer = null;
    var startedAt = Date.now();

    var cleanup = function () {
      if (pollTimer) clearInterval(pollTimer);
      pollTimer = null;
      window.removeEventListener('error', onError, true);
      window.removeEventListener('unhandledrejection', onRejection);
      if (overlayEl && overlayEl.parentNode) overlayEl.parentNode.removeChild(overlayEl);
      overlayEl = null;
    };

    var paintLoader = function () {
      if (overlayEl || !document.body) return;
      try {
        overlayEl = document.createElement('div');
        overlayEl.id = 'mkm-boot';
        overlayEl.setAttribute(
          'style',
          'position:fixed;inset:0;z-index:99998;background:#FDFBF7;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:system-ui,-apple-system,sans-serif;'
        );
        overlayEl.innerHTML =
          '<div style="font-size:11px;letter-spacing:3px;color:#F0A03C;font-weight:600;">FIND YOUR ESCAPE</div>' +
          '<div style="font-size:28px;font-weight:800;color:#0A1128;letter-spacing:1px;margin:6px 0 18px;">MUKHYMAT</div>' +
          '<div style="width:28px;height:28px;border:3px solid rgba(240,160,60,.25);border-top-color:#F0A03C;border-radius:50%;animation:mkmspin .9s linear infinite;"></div>' +
          '<style>@keyframes mkmspin{to{transform:rotate(360deg)}}</style>';
        document.body.appendChild(overlayEl);
      } catch (e) {
        overlayEl = null;
      }
    };

    var paintDiagnostics = function () {
      if (!overlayEl) return;
      try {
        overlayEl.setAttribute(
          'style',
          'position:fixed;inset:0;z-index:99998;background:#FDFBF7;color:#0A1128;font:13px/1.6 monospace;padding:20px;overflow:auto;white-space:pre-wrap;word-break:break-word;'
        );
        overlayEl.textContent =
          'MUKHYMAT did not finish starting (' +
          Math.round((Date.now() - startedAt) / 1000) +
          's).\n\n' +
          (shimmed.length
            ? 'Note: this browser blocks storage in embedded previews; using in-memory fallback for ' +
              shimmed.join(', ') +
              '.\n\n'
            : '') +
          (failures.length
            ? 'Problems detected:\n- ' + failures.join('\n- ')
            : 'No errors captured — the app may still be compiling.\nThis page updates automatically when it finishes.');
      } catch (e) {}
    };

    if (document.body) paintLoader();
    else
      document.addEventListener('DOMContentLoaded', paintLoader);

    pollTimer = setInterval(function () {
      var root = document.getElementById('root');
      // "mounted" = root has a child that is NOT our own overlay
      var mounted = !!(root && root.children.length > 0);
      if (mounted) {
        cleanup();
        return;
      }
      if (!overlayEl) paintLoader();
      if (Date.now() - startedAt > 15000) paintDiagnostics();
    }, 500);
  })();
}

require('expo-router/entry');
