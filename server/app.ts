import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";
import { createRateLimiter } from "./lib/rateLimiter.js";

// ---------------------------------------------------------------------------
// Allowed origins — web clones + local dev.
// Set EXTRA_ALLOWED_ORIGINS (comma-separated) to add more at runtime.
// ---------------------------------------------------------------------------
const STATIC_ORIGINS = [
  "https://sahra.camp",
  "https://www.sahra.camp",
  "https://mukhymat.com",
  "https://www.mukhymat.com",
];
const extraOrigins = [
  process.env["ALLOWED_ORIGIN"] ?? "",
  ...(process.env["EXTRA_ALLOWED_ORIGINS"] ?? "").split(","),
]
  .map((o) => o.trim().replace(/\/$/, ""))
  .filter(Boolean);
const ALLOWED_ORIGINS = new Set([...STATIC_ORIGINS, ...extraOrigins]);

// Also allow Replit dev-preview and deployment origins (multi-label
// subdomains) plus localhost for local development.
const DEV_ORIGIN_RE =
  /^(https:\/\/[a-zA-Z0-9.-]+\.(replit\.dev|repl\.co|replit\.app)|http:\/\/(localhost|127\.0\.0\.1))(:\d+)?$/;

function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.has(origin)) return true;
  if (DEV_ORIGIN_RE.test(origin)) return true;
  return false;
}

const app: Express = express();

// Behind Replit's reverse proxy there is exactly ONE trusted proxy hop.
// `trust proxy: 1` makes req.ip the address the proxy saw (the real client),
// while ignoring any additional client-injected X-Forwarded-For entries —
// required so per-IP rate limiting cannot be bypassed by spoofing headers.
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// ---------------------------------------------------------------------------
// CORS — restrict to known origins
// ---------------------------------------------------------------------------
app.use(
  cors({
    origin(origin, callback) {
      // Allow requests with no Origin header (server-to-server, curl, mobile).
      if (!origin) return callback(null, true);
      if (isAllowedOrigin(origin)) return callback(null, true);
      // Disallowed origins get no CORS headers (browsers block the response).
      // Auth uses bearer tokens, not cookies, so there is no CSRF surface.
      return callback(null, false);
    },
    credentials: true,
  }),
);

// ---------------------------------------------------------------------------
// Body size limits — prevent oversized payload attacks.
// Public endpoints get a tight cap; the webhook route needs its raw body
// captured for HMAC verification.
// ---------------------------------------------------------------------------
app.use(
  express.json({
    limit: "64kb",
    verify: (req: express.Request & { rawBody?: Buffer }, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);
app.use(express.urlencoded({ extended: true, limit: "16kb" }));

// ---------------------------------------------------------------------------
// Per-IP rate limiting on all /api routes.
// Public, unauthenticated routes are the main abuse surface; authenticated
// routes are covered by the same limiter but can tolerate higher traffic.
// ---------------------------------------------------------------------------

// Strict limiter for the public/unauthenticated endpoints (maps, firebase-config).
const publicLimiter = createRateLimiter({
  windowMs: 60_000,   // 1 minute
  max: 30,
  message: "Too many requests — please slow down.",
});

// Relaxed limiter for all other /api routes (authenticated).
const apiLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 120,
  message: "Too many requests — please slow down.",
});

// Apply strict limiter to the public endpoints that don't require auth.
app.use("/api/maps/resolve", publicLimiter);
app.use("/api/firebase-config", publicLimiter);
app.use("/api/legal", publicLimiter);

// Apply the broader limiter to the entire /api prefix.
app.use("/api", apiLimiter);

app.use("/api", router);

export default app;
