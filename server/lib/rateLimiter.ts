/**
 * Lightweight in-memory per-IP rate limiter.
 *
 * Intentionally dependency-free: keeps a sliding-window counter per IP using
 * a plain Map. Entries are pruned lazily so memory does not grow unboundedly.
 *
 * Usage:
 *   const limiter = createRateLimiter({ windowMs: 60_000, max: 30 });
 *   app.use(limiter);  // or mount on a specific router
 */

import type { Request, Response, NextFunction } from "express";

interface RateLimiterOptions {
  /** Time window in milliseconds. Default: 60 000 (1 minute). */
  windowMs?: number;
  /** Maximum requests allowed per IP within the window. Default: 60. */
  max?: number;
  /** HTTP status code returned when the limit is hit. Default: 429. */
  statusCode?: number;
  /** Message body returned when the limit is hit. */
  message?: string;
}

interface BucketEntry {
  count: number;
  resetAt: number;
}

export function createRateLimiter(opts: RateLimiterOptions = {}) {
  const windowMs = opts.windowMs ?? 60_000;
  const max = opts.max ?? 60;
  const statusCode = opts.statusCode ?? 429;
  const message = opts.message ?? "Too many requests — please try again later.";

  const store = new Map<string, BucketEntry>();

  // Prune stale entries every windowMs to avoid unbounded growth.
  const pruneInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (entry.resetAt <= now) store.delete(key);
    }
  }, windowMs);
  // Don't block the event loop from exiting.
  if (pruneInterval.unref) pruneInterval.unref();

  return function rateLimitMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
  ): void {
    // req.ip is derived by Express according to the app's `trust proxy`
    // setting — with `trust proxy: 1` it is the address the trusted proxy
    // saw, so clients cannot spoof it by injecting X-Forwarded-For values.
    // NEVER read X-Forwarded-For directly here.
    const ip = req.ip || req.socket?.remoteAddress || "unknown";

    const now = Date.now();
    const existing = store.get(ip);

    if (!existing || existing.resetAt <= now) {
      store.set(ip, { count: 1, resetAt: now + windowMs });
      res.setHeader("X-RateLimit-Limit", String(max));
      res.setHeader("X-RateLimit-Remaining", String(max - 1));
      next();
      return;
    }

    existing.count += 1;
    const remaining = Math.max(0, max - existing.count);
    res.setHeader("X-RateLimit-Limit", String(max));
    res.setHeader("X-RateLimit-Remaining", String(remaining));
    res.setHeader(
      "Retry-After",
      String(Math.ceil((existing.resetAt - now) / 1000)),
    );

    if (existing.count > max) {
      res.status(statusCode).json({ success: false, error: message });
      return;
    }

    next();
  };
}
