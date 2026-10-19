import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { createHmac, timingSafeEqual, randomUUID } from "crypto";
import { z } from "zod";
import { verifyFirebaseIdToken, type VerifiedUser } from "../lib/firebaseAuth.js";
import { getFirestoreDoc, patchFirestoreDoc } from "../lib/firestoreRest.js";
import { getAdminFirestore } from "../lib/firestoreAdmin.js";
import { sweepExpiredBookings } from "../lib/expirySweep.js";
import { getNightlyRateForDate, toDateKey } from "../lib/peakPricing.js";
import {
  resolveCancellationTier,
  guestRefundFils,
} from "../lib/cancellationPolicy.js";
import {
  hasMatchingAvailabilityLock,
  isAuthoritativeCampHost,
  isCancellableBookingStatus,
} from "../lib/bookingStateGuards.js";
import {
  bookingConfirmationGuest,
  bookingNotificationHost,
  cancellationEmail,
  escapeHtml,
  listingApprovedHost,
  listingPendingHost,
  type BookingEmailData,
  type ListingEmailData,
} from "../lib/emailTemplates.js";

// Routes ported from the imported Sahra/MUKHYMAT site (Vercel api/ functions +
// server.mjs). Same request/response contracts so the frontend works unchanged.

const router: IRouter = Router();

// ---------------------------------------------------------------------------
// Zod validation schemas for all public and authenticated routes.
// ---------------------------------------------------------------------------

/** Firestore document IDs: non-empty strings, no leading slashes, max 1500 chars. */
const DocId = z.string().min(1).max(1500).regex(/^[^\\/]+$/);

/** Validated email-send body. Only allows the finite set of known types. */
const EmailSendBody = z.discriminatedUnion("type", [
  z.object({
    type: z.enum([
      "booking-confirmation",
      "booking-notification",
      "cancellation-guest",
      "cancellation-host",
    ]),
    bookingId: DocId,
  }),
  z.object({
    type: z.enum(["listing-pending", "listing-approved"]),
    campId: DocId,
  }),
]);

/** Validated payments/create body. */
const PaymentCreateBody = z.object({
  bookingId: DocId,
  // Optional redirect origin the client supplies for the post-payment redirect.
  // Server validates it against the known allowlist before using it.
  origin: z.string().url().max(2048).optional(),
  // Mobile: the app scheme prefix for the return URL.
  appScheme: z.string().max(64).optional(),
  // Display-only customer info forwarded to Tap (never trusted for amounts
  // or recipients — those come from the booking document).
  customer: z
    .object({
      name: z.string().max(200).optional(),
      email: z.string().email().max(320).optional(),
      phone: z.string().max(32).optional(),
    })
    .optional(),
  // Mobile deep-link return URL; server re-validates the scheme before use.
  redirectUrl: z.string().max(2048).optional(),
  // Which client is calling ("native" | "web"); anything else is ignored.
  platform: z.string().max(32).optional(),
});

/** Validated bookings cancel body. */
const BookingCancelBody = z.object({
  reason: z.string().min(1).max(500),
});

/** Validated maps/resolve body. */
const MapsResolveBody = z.object({
  url: z.string().url().max(2048),
});

/** Validated dispute body — guest reports a problem with a stay. */
const DisputeBody = z.object({
  bookingId: DocId,
  type: z.enum(["not_as_described", "missing_amenity", "safety_concern", "other"]),
  description: z.string().min(1).max(1000),
  // Optional evidence photo, uploaded by the client to Firebase Storage.
  // Only Firebase Storage download URLs are accepted so the field can't be
  // abused to smuggle arbitrary links into admin emails.
  photoUrl: z
    .string()
    .url()
    .max(2048)
    .refine(
      (u) => {
        try {
          const h = new URL(u);
          return (
            h.protocol === "https:" &&
            (h.hostname === "firebasestorage.googleapis.com" ||
              h.hostname.endsWith(".firebasestorage.app"))
          );
        } catch {
          return false;
        }
      },
      { message: "photoUrl must be a Firebase Storage URL" },
    )
    .optional(),
});

/** Validated admin dispute status update body. */
const DisputeStatusBody = z.object({
  status: z.enum(["resolved", "closed"]),
});

const AdminApplicationDecisionBody = z.object({
  decision: z.enum(["approved", "rejected"]),
  rejectionReason: z.string().trim().max(1000).optional(),
});

/** Helper: parse a Zod schema; reply 400 and return null on failure. */
function parseBody<T>(
  schema: z.ZodType<T>,
  body: unknown,
  res: Response,
): T | null {
  const result = schema.safeParse(body);
  if (!result.success) {
    const message = result.error.issues
      .map((i) => `${i.path.join(".") || "body"}: ${i.message}`)
      .join("; ");
    res.status(400).json({ success: false, error: `Validation error: ${message}` });
    return null;
  }
  return result.data;
}

const FROM_EMAIL = process.env["FROM_EMAIL"] || "Sahra <onboarding@resend.dev>";

async function sendEmail(
  to: string,
  subject: string,
  html: string,
): Promise<{ ok: boolean; data?: unknown; error?: string }> {
  const apiKey = process.env["RESEND_API_KEY"];
  if (!apiKey) {
    return { ok: false, error: "RESEND_API_KEY is not configured" };
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  });
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      (data as { message?: string } | null)?.message ?? "Failed to send email";
    return { ok: false, error: message };
  }
  return { ok: true, data };
}

// ---------------------------------------------------------------------------
// Authenticated email sending
//
// The old /emails/* routes accepted any recipient + raw client HTML with no
// auth — an open relay. They are now disabled (see below). The replacement
// route requires a verified Firebase ID token, loads the referenced booking /
// camp document *as the calling user* (Firestore rules apply), derives the
// recipient from that record, and renders the HTML from server-side templates.
// ---------------------------------------------------------------------------

const str = (v: unknown): string => (typeof v === "string" ? v : "");
const num = (v: unknown): number => (typeof v === "number" ? v : Number(v) || 0);

function bookingEmailData(
  bookingId: string,
  b: Record<string, unknown>,
): BookingEmailData {
  return {
    bookingId,
    campName: str(b["campTitle"]) || str(b["campName"]) || "Camp",
    campLocation: str(b["campLocation"]) || str(b["location"]),
    checkInDate: str(b["checkInDate"]),
    numberOfGuests: num(b["guests"]) || num(b["numberOfGuests"]) || 1,
    totalAmount: num(b["totalPrice"]) || num(b["price"]),
    guestName: str(b["userName"]) || str(b["guestName"]) || "Guest",
    hostName: str(b["hostName"]) || "Host",
    arrivalTime: str(b["arrivalTime"]) || undefined,
    paymentMethod: str(b["paymentMethod"]) || undefined,
    cancellationReason: str(b["cancellationReason"]) || undefined,
  };
}

// Recipient addresses must never come from client-writable *Email fields on
// bookings/camps (a caller could plant an arbitrary victim address there).
// Trusted sources only:
//  - the guest: the verified email on the caller's own ID token
//  - the host: the camp document's hostId (ownership link) -> that user's own
//    profile document, which only the host account writes for itself.
async function resolveTrustedHost(
  booking: Record<string, unknown>,
  idToken: string,
): Promise<{ hostId?: string; hostEmail?: string; hostName?: string }> {
  const campId = str(booking["campId"]);
  if (!campId) return {};
  const camp = await getFirestoreDoc("camps", campId, idToken).catch(() => null);
  const hostId = camp ? str(camp["hostId"]) : "";
  if (!hostId) return {};
  // Profiles are owner/admin-only under Firestore rules (PII), so a guest's
  // ID token can no longer read the host's profile. The server resolves the
  // recipient with the Admin SDK instead — the trust chain is unchanged
  // (camp.hostId -> that user's own profile doc).
  try {
    const hostSnap = await getAdminFirestore().collection("users").doc(hostId).get();
    const host = hostSnap.exists ? hostSnap.data()! : null;
    return {
      hostId,
      hostEmail: host ? str(host["email"]) || undefined : undefined,
      hostName: host ? str(host["displayName"]) || undefined : undefined,
    };
  } catch {
    return { hostId };
  }
}

type EmailType =
  | "booking-confirmation"
  | "booking-notification"
  | "cancellation-guest"
  | "cancellation-host"
  | "listing-pending"
  | "listing-approved";

const BOOKING_EMAIL_TYPES: ReadonlySet<string> = new Set([
  "booking-confirmation",
  "booking-notification",
  "cancellation-guest",
  "cancellation-host",
]);
const LISTING_EMAIL_TYPES: ReadonlySet<string> = new Set([
  "listing-pending",
  "listing-approved",
]);

async function handleBookingEmail(
  type: EmailType,
  bookingId: string,
  user: VerifiedUser,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const booking = await getFirestoreDoc("bookings", bookingId, user.idToken);
  if (!booking) {
    return { status: 404, body: { success: false, error: "Booking not found" } };
  }
  // Identity checks use only trusted links: booking.userId is constrained by
  // Firestore rules to the creator; host identity comes from the camp record,
  // NOT the client-writable booking.hostId/hostEmail fields.
  const isGuest = str(booking["userId"]) === user.uid;
  const trustedHost = await resolveTrustedHost(booking, user.idToken);
  const isHost = !!trustedHost.hostId && trustedHost.hostId === user.uid;
  if (!isGuest && !isHost) {
    return { status: 403, body: { success: false, error: "Not your booking" } };
  }
  if (
    (type === "cancellation-guest" || type === "cancellation-host") &&
    str(booking["status"]) !== "cancelled"
  ) {
    return {
      status: 409,
      body: { success: false, error: "Booking is not cancelled" },
    };
  }

  const data = bookingEmailData(bookingId, booking);
  if (trustedHost.hostName) data.hostName = trustedHost.hostName;
  let to: string | undefined;
  let subject: string;
  let html: string;
  if (type === "booking-confirmation" || type === "cancellation-guest") {
    // Guest emails may only be triggered by the guest, and go to the verified
    // token's email — never to a booking-supplied address.
    if (!isGuest) {
      return {
        status: 403,
        body: { success: false, error: "Only the guest can send this email" },
      };
    }
    to = user.email;
    subject =
      type === "booking-confirmation"
        ? `Booking Confirmed - ${data.campName}`
        : `Booking Cancelled - ${data.campName}`;
    html =
      type === "booking-confirmation"
        ? bookingConfirmationGuest(data)
        : cancellationEmail(data, false);
  } else {
    to = trustedHost.hostEmail;
    subject =
      type === "booking-notification"
        ? `New Booking - ${data.campName}`
        : `Booking Cancelled - ${data.campName}`;
    html =
      type === "booking-notification"
        ? bookingNotificationHost(data)
        : cancellationEmail(data, true);
  }
  if (!to) {
    return {
      status: 422,
      body: { success: false, error: "No recipient email on record" },
    };
  }
  const result = await sendEmail(to, subject, html);
  if (!result.ok) {
    return { status: 502, body: { success: false, error: result.error } };
  }
  return { status: 200, body: { success: true } };
}

async function handleListingEmail(
  type: EmailType,
  campId: string,
  user: VerifiedUser,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const camp = await getFirestoreDoc("camps", campId, user.idToken);
  if (!camp) {
    return { status: 404, body: { success: false, error: "Camp not found" } };
  }
  const hostId = str(camp["hostId"]);
  let hostEmail: string | undefined;
  let hostName = "Host";

  if (type === "listing-pending") {
    // Only the host of the listing may trigger the submission email, and it
    // goes to their own verified token email — never a camp-supplied address.
    if (hostId !== user.uid) {
      return { status: 403, body: { success: false, error: "Not your listing" } };
    }
    hostEmail = user.email;
    const self = await getFirestoreDoc("users", user.uid, user.idToken).catch(
      () => null,
    );
    hostName = self ? str(self["displayName"]) || hostName : hostName;
  } else {
    // listing-approved is strictly admin-triggered after activating the camp.
    const caller = await getFirestoreDoc("users", user.uid, user.idToken).catch(
      () => null,
    );
    const isAdmin = caller?.["isAdmin"] === true || caller?.["role"] === "admin";
    if (!isAdmin) {
      return { status: 403, body: { success: false, error: "Admin only" } };
    }
    if (str(camp["status"]) !== "active") {
      return {
        status: 409,
        body: { success: false, error: "Camp is not active" },
      };
    }
    // Recipient: the camp owner's own profile email (written by that account),
    // never client-writable camp fields like hostEmail.
    if (hostId) {
      const host = await getFirestoreDoc("users", hostId, user.idToken).catch(
        () => null,
      );
      if (host) {
        hostEmail = str(host["email"]) || undefined;
        hostName = str(host["displayName"]) || hostName;
      }
    }
  }
  if (!hostEmail) {
    return {
      status: 422,
      body: { success: false, error: "No recipient email on record" },
    };
  }

  const data: ListingEmailData = {
    campName: str(camp["title"]) || "Your camp",
    campLocation: str(camp["location"]) || undefined,
    hostName,
  };
  const subject =
    type === "listing-approved"
      ? `Your listing is live - ${data.campName}`
      : `Listing received - ${data.campName}`;
  const html =
    type === "listing-approved"
      ? listingApprovedHost(data)
      : listingPendingHost(data);
  const result = await sendEmail(hostEmail, subject, html);
  if (!result.ok) {
    return { status: 502, body: { success: false, error: result.error } };
  }
  return { status: 200, body: { success: true } };
}

router.post("/emails/send", async (req, res) => {
  try {
    const authHeader = req.headers.authorization ?? "";
    const idToken = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : "";
    if (!idToken) {
      res
        .status(401)
        .json({ success: false, error: "Missing Authorization bearer token" });
      return;
    }
    let user: VerifiedUser;
    try {
      user = await verifyFirebaseIdToken(idToken);
    } catch {
      res.status(401).json({ success: false, error: "Invalid ID token" });
      return;
    }

    const parsed = parseBody(EmailSendBody, req.body, res);
    if (!parsed) return;

    if (BOOKING_EMAIL_TYPES.has(parsed.type)) {
      const bookingId = (parsed as { bookingId?: string }).bookingId ?? "";
      const out = await handleBookingEmail(parsed.type as EmailType, bookingId, user);
      res.status(out.status).json(out.body);
      return;
    }
    if (LISTING_EMAIL_TYPES.has(parsed.type)) {
      const campId = (parsed as { campId?: string }).campId ?? "";
      const out = await handleListingEmail(parsed.type as EmailType, campId, user);
      res.status(out.status).json(out.body);
      return;
    }
    res.status(400).json({ success: false, error: "Unknown email type" });
  } catch (err) {
    const statusCode = (err as { statusCode?: number }).statusCode;
    if (statusCode === 403) {
      res.status(403).json({ success: false, error: "Permission denied" });
      return;
    }
    req.log.error({ err }, "Failed to send email");
    res.status(500).json({ success: false, error: "Failed to send email" });
  }
});

// Legacy open-relay routes (recipient + raw HTML in the request body, no
// auth). Kept only so the not-yet-redeployed legacy frontend gets a clean
// error instead of a 404; they no longer send anything. Emails were always
// best-effort in every caller, so bookings/cancellations still succeed there.
const LEGACY_EMAIL_PATHS = [
  "/emails/booking-confirmation",
  "/emails/booking-notification",
  "/emails/cancellation-guest",
  "/emails/cancellation-host",
  "/emails/refund-confirmation",
  "/emails/review-reminder",
  "/emails/listing-approved",
  "/emails/listing-pending",
];
for (const path of LEGACY_EMAIL_PATHS) {
  router.post(path, (_req, res) => {
    res.status(410).json({
      success: false,
      error:
        "This endpoint has been disabled. Use POST /api/emails/send with a Firebase ID token.",
    });
  });
}

// ---------------------------------------------------------------------------
// Maps resolver — SSRF-safe manual redirect following
//
// Prior bug: `redirect: "follow"` only checked the *first-hop* host, so a
// maps short-link that redirected to an internal/loopback address was an
// SSRF probe. Fix: follow each hop manually, re-validate the destination
// host on every hop, and reject private/loopback IP ranges.
// ---------------------------------------------------------------------------

/** Hosts that are allowed at every hop of the redirect chain. */
const MAPS_ALLOWED_HOSTS = new Set([
  "maps.app.goo.gl",
  "goo.gl",
  "maps.google.com",
  "www.google.com",
  "google.com",
]);

/** CIDR blocks that must never be the redirect target. */
const PRIVATE_IP_RANGES: Array<{ prefix: string; bits: number }> = [
  // Loopback
  { prefix: "127.0.0.0", bits: 8 },
  // RFC-1918 private
  { prefix: "10.0.0.0", bits: 8 },
  { prefix: "172.16.0.0", bits: 12 },
  { prefix: "192.168.0.0", bits: 16 },
  // Link-local
  { prefix: "169.254.0.0", bits: 16 },
  // Multicast / broadcast / reserved
  { prefix: "224.0.0.0", bits: 4 },
  { prefix: "240.0.0.0", bits: 4 },
  // IPv6 loopback + link-local + ULA
  { prefix: "::1", bits: 128 },
  { prefix: "fe80::", bits: 10 },
  { prefix: "fc00::", bits: 7 },
];

function ipToInt(ip: string): number {
  const parts = ip.split(".").map(Number);
  return (parts[0]! << 24) | (parts[1]! << 16) | (parts[2]! << 8) | parts[3]!;
}

function prefixToMask(bits: number): number {
  return bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
}

function isPrivateIpv4(ip: string): boolean {
  const ipInt = ipToInt(ip) >>> 0;
  for (const { prefix, bits } of PRIVATE_IP_RANGES) {
    if (!prefix.includes(".")) continue; // skip IPv6 entries
    const mask = prefixToMask(bits);
    if ((ipInt & mask) >>> 0 === (ipToInt(prefix) & mask) >>> 0) return true;
  }
  return false;
}

function isPrivateIpv6(host: string): boolean {
  const lower = host.replace(/^\[|\]$/g, "").toLowerCase();
  if (lower === "::1" || lower === "localhost") return true;
  if (lower.startsWith("fe80:") || lower.startsWith("fc") || lower.startsWith("fd"))
    return true;
  return false;
}

/** Returns true when the hostname looks like a bare IP in a private range. */
function isPrivateHost(hostname: string): boolean {
  // Strip IPv6 brackets
  const bare = hostname.replace(/^\[|\]$/, "");
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(bare)) {
    return isPrivateIpv4(bare);
  }
  if (bare.includes(":")) return isPrivateIpv6(bare);
  // Plain hostnames (e.g. "localhost") are blocked too
  if (bare === "localhost" || bare === "0.0.0.0") return true;
  return false;
}

/** Validates a URL at every hop: must be https, in the allowlist, not a bare private IP. */
function isSafeMapUrl(urlString: string): { ok: true; url: URL } | { ok: false; error: string } {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    return { ok: false, error: "Invalid URL" };
  }
  if (parsed.protocol !== "https:") {
    return { ok: false, error: "Only HTTPS URLs are allowed" };
  }
  const { hostname } = parsed;
  if (isPrivateHost(hostname)) {
    return { ok: false, error: "URL resolves to a private/internal address" };
  }
  if (!MAPS_ALLOWED_HOSTS.has(hostname)) {
    return { ok: false, error: "Unsupported url host" };
  }
  return { ok: true, url: parsed };
}

const MAPS_RESOLVE_TIMEOUT_MS = 5_000;
const MAPS_MAX_REDIRECTS = 8;
const MAPS_MAX_RESPONSE_BYTES = 512 * 1024; // 512 KB

async function handleMapsResolve(
  url: string,
  req: Request,
  res: Response,
): Promise<void> {
  // Validate the first-hop host before making any network request.
  const initial = isSafeMapUrl(url);
  if (!initial.ok) {
    res.status(400).json({ success: false, error: initial.error });
    return;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), MAPS_RESOLVE_TIMEOUT_MS);

    let currentUrl = url;
    let hops = 0;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      if (hops >= MAPS_MAX_REDIRECTS) {
        res.status(400).json({ success: false, error: "Too many redirects" });
        clearTimeout(timer);
        return;
      }

      const response = await fetch(currentUrl, {
        method: "GET",
        redirect: "manual",    // never follow automatically — we do it ourselves
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; SahraBot/1.0; +https://sahra.camp)",
        },
      });

      const location = response.headers.get("location");

      if (response.status >= 300 && response.status < 400 && location) {
        // Resolve the redirect target relative to the current URL.
        let nextUrl: string;
        try {
          nextUrl = new URL(location, currentUrl).toString();
        } catch {
          clearTimeout(timer);
          res.status(400).json({ success: false, error: "Malformed redirect location" });
          return;
        }

        // Re-validate the hop destination.
        const hopCheck = isSafeMapUrl(nextUrl);
        if (!hopCheck.ok) {
          clearTimeout(timer);
          res.status(400).json({ success: false, error: `Redirect blocked: ${hopCheck.error}` });
          return;
        }

        currentUrl = nextUrl;
        hops++;
        // Consume the body so the connection is released.
        await response.body?.cancel?.();
        continue;
      }

      clearTimeout(timer);

      if (!response.ok) {
        res.status(400).json({ success: false, error: "Failed to resolve URL" });
        return;
      }

      // Enforce a response-size cap (read nothing past the limit).
      const contentLength = Number(response.headers.get("content-length") ?? "0");
      if (contentLength > MAPS_MAX_RESPONSE_BYTES) {
        await response.body?.cancel?.();
        res.status(400).json({ success: false, error: "Response too large" });
        return;
      }

      // We only need the final URL, not the body.
      await response.body?.cancel?.();
      res.json({ success: true, resolvedUrl: response.url || currentUrl });
      return;
    }
  } catch (err) {
    if ((err as { name?: string }).name === "AbortError") {
      res.status(504).json({ success: false, error: "URL resolution timed out" });
      return;
    }
    req.log.error({ err }, "Failed to resolve maps URL");
    res.status(500).json({ success: false, error: "Internal error resolving URL" });
  }
}

router.post("/maps/resolve", async (req, res) => {
  const parsed = parseBody(MapsResolveBody, req.body, res);
  if (!parsed) return;
  await handleMapsResolve(parsed.url, req, res);
});

// GET fallback used by some clients (mobile browsers/extensions that block
// POST). Same validation pipeline: the url query param goes through the same
// schema + SSRF-safe resolver as the POST body.
router.get("/maps/resolve", async (req, res) => {
  const parsed = MapsResolveBody.safeParse({ url: req.query["url"] });
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((i) => `${i.path.join(".") || "query"}: ${i.message}`)
      .join("; ");
    res.status(400).json({ success: false, error: `Validation error: ${message}` });
    return;
  }
  await handleMapsResolve(parsed.data.url, req, res);
});

// Public Firebase web config for the mobile app. These values are already
// exposed publicly in the web app's JS bundle — they are client identifiers,
// not secrets (security is enforced by Firestore rules + Auth).
router.get("/firebase-config", (_req, res) => {
  const config = {
    apiKey: process.env["VITE_FIREBASE_API_KEY"],
    authDomain: process.env["VITE_FIREBASE_AUTH_DOMAIN"],
    projectId: process.env["VITE_FIREBASE_PROJECT_ID"],
    storageBucket: process.env["VITE_FIREBASE_STORAGE_BUCKET"],
    messagingSenderId: process.env["VITE_FIREBASE_MESSAGING_SENDER_ID"],
    appId: process.env["VITE_FIREBASE_APP_ID"],
  };
  if (Object.values(config).some((v) => !v)) {
    res.status(500).json({ success: false, error: "Firebase config not set" });
    return;
  }
  res.json({ success: true, config });
});

// ---------------------------------------------------------------------------
// Auth middleware helper
// ---------------------------------------------------------------------------

async function requireAuth(
  req: Request & { uid?: string; userEmail?: string; idToken?: string },
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) {
    res.status(401).json({ success: false, error: "Missing Authorization bearer token" });
    return;
  }
  try {
    const user = await verifyFirebaseIdToken(token);
    req.uid = user.uid;
    req.userEmail = user.email;
    req.idToken = user.idToken;
    next();
  } catch {
    res.status(401).json({ success: false, error: "Invalid or expired ID token" });
  }
}

// Augment Express Request type locally
declare global {
  namespace Express {
    interface Request {
      uid?: string;
      userEmail?: string;
      idToken?: string;
      rawBody?: Buffer;
    }
  }
}

// ---------------------------------------------------------------------------
// Admin: resolve or close a guest dispute.
//
// Disputes are written with the Admin SDK because the collection is not
// client-accessible. Keep the admin check explicit here rather than relying
// on client claims: only the trusted isAdmin user flag may change a dispute's
// lifecycle state.
// ---------------------------------------------------------------------------
router.post("/admin/disputes/:disputeId/status", requireAuth, async (req, res) => {
  const disputeId = typeof req.params["disputeId"] === "string" ? req.params["disputeId"] : "";
  if (!DocId.safeParse(disputeId).success) {
    res.status(400).json({ success: false, error: "Missing or invalid disputeId" });
    return;
  }
  const parsed = parseBody(DisputeStatusBody, req.body, res);
  if (!parsed) return;

  try {
    const adminDb = getAdminFirestore();
    const callerSnap = await adminDb.collection("users").doc(req.uid!).get();
    if (!callerSnap.exists || callerSnap.data()!["isAdmin"] !== true) {
      res.status(403).json({ success: false, error: "Admin access required" });
      return;
    }

    const disputeRef = adminDb.collection("disputes").doc(disputeId);
    const disputeSnap = await disputeRef.get();
    if (!disputeSnap.exists) {
      res.status(404).json({ success: false, error: "Dispute not found" });
      return;
    }

    await disputeRef.update({
      status: parsed.status,
      updatedAt: new Date().toISOString(),
      updatedBy: req.uid,
    });

    res.json({ success: true, disputeId, status: parsed.status });
  } catch (err) {
    req.log.error({ err, disputeId }, "Failed to update dispute status");
    res.status(500).json({ success: false, error: "Failed to update dispute" });
  }
});

// ---------------------------------------------------------------------------
// Verify a Tap charge server-side (auth required — confirms charge belongs
// to the calling user's booking)
// ---------------------------------------------------------------------------
router.get("/payments/verify", requireAuth, async (req, res) => {
  const tapId = req.query["tap_id"];
  if (!tapId || typeof tapId !== "string" || !/^chg_[A-Za-z0-9]+$/.test(tapId)) {
    res.status(400).json({ success: false, error: "Missing or invalid tap_id" });
    return;
  }
  // bookingId is required — reject without it so we always confirm ownership
  const bookingId = typeof req.query["bookingId"] === "string" ? req.query["bookingId"] : "";
  if (!bookingId) {
    res.status(400).json({ success: false, error: "Missing bookingId" });
    return;
  }

  const tapSecret = process.env["TAP_SECRET_KEY"];
  if (!tapSecret) {
    res.status(500).json({ success: false, error: "TAP_SECRET_KEY not configured" });
    return;
  }

  // Verify ownership: the booking must exist and belong to the calling user.
  // Do this before fetching from Tap to fail fast on bad requests.
  try {
    const booking = await getFirestoreDoc("bookings", bookingId, req.idToken!);
    if (!booking) {
      res.status(404).json({ success: false, error: "Booking not found" });
      return;
    }
    if (str(booking["userId"]) !== req.uid) {
      res.status(403).json({ success: false, error: "Booking does not belong to you" });
      return;
    }
  } catch {
    res.status(403).json({ success: false, error: "Access denied to booking" });
    return;
  }

  try {
    const tapRes = await fetch(
      `https://api.tap.company/v2/charges/${encodeURIComponent(tapId)}`,
      { headers: { Authorization: `Bearer ${tapSecret}` } },
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const charge = (await tapRes.json()) as Record<string, any>;
    if (!tapRes.ok) {
      req.log.error({ charge }, "Tap charge lookup failed");
      res.status(502).json({ success: false, error: "Failed to verify charge" });
      return;
    }

    const chargeBookingId: string | null =
      charge["metadata"]?.bookingId ?? charge["metadata"]?.booking_id ?? null;

    // Confirm the Tap charge is for this booking, not someone else's
    if (chargeBookingId !== bookingId) {
      res.status(403).json({ success: false, error: "Charge does not match booking" });
      return;
    }

    const chargeStatus = String(charge["status"] ?? "").toUpperCase();

    // Gate verified:true on actual server-recorded settlement, not just the
    // Tap charge status. The webhook applies the amount/currency guard before
    // writing paymentStatus:paid — so a captured charge that failed the guard
    // (or whose webhook hasn't fired yet) must continue polling rather than
    // showing a premature success screen.
    let settled = false;
    if (chargeStatus === "CAPTURED") {
      try {
        const adminDb = getAdminFirestore();
        const bookingSnap = await adminDb.collection("bookings").doc(bookingId).get();
        if (bookingSnap.exists) {
          const d = bookingSnap.data()!;
          settled =
            d["paymentStatus"] === "paid" || d["status"] === "confirmed";
        }
      } catch (adminErr) {
        req.log.warn({ adminErr, bookingId }, "verify: Admin SDK read failed — treating as not yet settled");
        settled = false;
      }
    }

    res.json({
      success: true,
      verified: settled,
      status: chargeStatus,
      bookingId: chargeBookingId,
      amount: charge["amount"] ?? null,
      currency: charge["currency"] ?? null,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to verify Tap charge");
    res.status(500).json({ success: false, error: "Failed to verify charge" });
  }
});

// ---------------------------------------------------------------------------
// Create Tap payment page session (auth required — idempotent per booking)
//
// Security contract:
//  • requireAuth middleware enforces a valid Firebase ID token (401 otherwise).
//  • Booking ownership is verified server-side via Firestore rules + uid check.
//  • Amount is derived from the stored totalPrice (set at reservation time) or
//    falls back to nightly rate × nights — client value is never trusted.
//  • tapChargeId is persisted before returning the URL so concurrent retries
//    see the stored ID and don't race to create duplicate charges.
//
// Status mapping when tapChargeId already exists on the booking:
//  INITIATED          → return existing payment URL (reuse open session)
//  CAPTURED/AUTHORIZED → 409 already_paid (do NOT create another charge)
//  CANCELLED/FAILED/VOID/other → create a fresh charge
//
// Expiry: if booking.expiresAt < now the payment window has passed — 410.
// ---------------------------------------------------------------------------
router.post("/payments/create", requireAuth, async (req, res) => {
  const parsedPayment = parseBody(PaymentCreateBody, req.body, res);
  if (!parsedPayment) return;
  const { bookingId, customer, redirectUrl, platform } = parsedPayment;

  const tapSecret = process.env["TAP_SECRET_KEY"];
  if (!tapSecret) {
    res.status(500).json({ success: false, error: "TAP_SECRET_KEY not configured" });
    return;
  }

  // Load booking from Firestore and verify it belongs to the calling user.
  let booking: Record<string, unknown> | null = null;
  try {
    booking = await getFirestoreDoc("bookings", bookingId, req.idToken!);
  } catch {
    res.status(403).json({ success: false, error: "Access denied to booking" });
    return;
  }
  if (!booking) {
    res.status(404).json({ success: false, error: "Booking not found" });
    return;
  }
  if (str(booking["userId"]) !== req.uid) {
    res.status(403).json({ success: false, error: "Booking does not belong to you" });
    return;
  }

  // Idempotency guard: reject all non-retryable states.
  // pending_verification means a Tap charge was already captured and is waiting
  // for the server webhook to settle it — creating a second charge here would
  // double-bill the guest.  Only 'pending' and 'failed' are retryable.
  const existingPaymentStatus = str(booking["paymentStatus"]);
  const existingStatus = str(booking["status"]);
  if (existingPaymentStatus === "paid" || existingStatus === "confirmed") {
    res.status(409).json({ success: false, error: "Booking is already paid" });
    return;
  }
  if (existingPaymentStatus === "pending_verification") {
    res.status(409).json({
      success: false,
      error: "A payment is already pending verification for this booking",
    });
    return;
  }
  if (existingStatus === "cancelled") {
    res.status(409).json({ success: false, error: "Booking has been cancelled" });
    return;
  }
  // Allow only explicitly retryable states to proceed.
  const retryablePaymentStates = ["pending", "failed"];
  if (!retryablePaymentStates.includes(existingPaymentStatus)) {
    res.status(409).json({ success: false, error: "Booking is not in a payable state" });
    return;
  }

  // Reject if the booking's payment window has expired.
  const expiresAt = num(booking["expiresAt"]);
  if (expiresAt && expiresAt < Date.now() && existingStatus === "pending") {
    res.status(410).json({ success: false, error: "booking_expired" });
    return;
  }

  // Derive the charge amount SERVER-SIDE from the camp document (host-written,
  // rules-protected) — never trust the booking's client-authored totalPrice
  // (Audit v4 C-2). Authoritative formula, matching what every client displays:
  //   base  = camp nightly rate × nights
  //   total = base + 10% service fee   (no tax currently)
  // Nights come from the full datetime strings (checkIn / checkOut) because all
  // client flows set checkOutDate == checkInDate for same-day bookings while
  // checkOut carries the actual next-day timestamp.
  const campId = str(booking["campId"]);
  if (!campId) {
    res.status(422).json({ success: false, error: "Booking has no campId" });
    return;
  }

  const SERVICE_FEE_RATE = 0.10;
  let amount: number;
  const storedTotal = num(booking["totalPrice"]);

  try {
    const camp = await getFirestoreDoc("camps", campId, req.idToken!).catch(() => null);
    if (!camp) {
      res.status(422).json({ success: false, error: "Camp not found" });
      return;
    }
    // Camp docs store the nightly rate as `pricePerNight` (new) or `price`
    // (legacy), plus optional `weekendPrice` / `holidayPrice` peak rates
    // (Task 240). getNightlyRateForDate applies holiday > weekend > standard.
    const campRates = {
      pricePerNight: num(camp["pricePerNight"]) || undefined,
      price: num(camp["price"]) || undefined,
      weekendPrice: num(camp["weekendPrice"]) || undefined,
      holidayPrice: num(camp["holidayPrice"]) || undefined,
    };
    const standardRate = campRates.pricePerNight || campRates.price || 0;
    if (!standardRate || standardRate <= 0) {
      res.status(422).json({ success: false, error: "Camp has no valid nightly price" });
      return;
    }
    const checkInRaw = str(booking["checkIn"]) || str(booking["checkInDate"]);
    const checkOutRaw = str(booking["checkOut"]) || str(booking["checkOutDate"]);
    const checkIn = checkInRaw ? new Date(checkInRaw) : null;
    const checkOut = checkOutRaw ? new Date(checkOutRaw) : null;
    const rawNights =
      checkIn && checkOut && !isNaN(checkIn.getTime()) && !isNaN(checkOut.getTime())
        ? Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
        : 0;
    // Minimum 1 night/day — same-day bookings span one overnight period.
    const nights = Math.max(rawNights, 1);

    // Sum the per-date rate for each booked night, starting from the booked
    // date (checkInDate when present — the plain YYYY-MM-DD the guest picked —
    // otherwise the checkIn datetime). Compute in integer fils (1 BHD = 1000
    // fils) to avoid float drift.
    const firstNightKey =
      toDateKey(str(booking["checkInDate"]) || checkInRaw || "") || toDateKey(new Date());
    let baseFils = 0;
    for (let i = 0; i < nights; i++) {
      const night = new Date(`${firstNightKey}T12:00:00`);
      night.setDate(night.getDate() + i);
      const { rate } = getNightlyRateForDate(campRates, night);
      baseFils += Math.round((rate || standardRate) * 1000);
    }
    const feeFils = Math.round(baseFils * SERVICE_FEE_RATE);
    const totalFils = baseFils + feeFils;
    amount = totalFils / 1000;

    // If the stored client-authored total disagrees with the server figure,
    // charge the server figure and correct the booking so refunds, emails,
    // and displays all agree with what is actually charged.
    const storedFils = Math.round(storedTotal * 1000);
    if (storedFils !== totalFils) {
      req.log.warn(
        { bookingId, storedTotal, serverTotal: amount, nights, standardRate },
        "Booking totalPrice differs from server-computed amount — overriding with server figure",
      );
      try {
        const adminDb = getAdminFirestore();
        await adminDb.collection("bookings").doc(bookingId).update({
          totalPrice: amount,
          serviceFee: feeFils / 1000,
          taxes: 0,
          campPrice: baseFils / 1000 / nights,
          priceBreakdown: {
            basePrice: baseFils / 1000,
            largeTentPrice: 0,
            smallTentPrice: 0,
            entertainmentTentPrice: 0,
            serviceFee: feeFils / 1000,
            tax: 0,
            total: amount,
          },
          updatedAt: new Date().toISOString(),
        });
      } catch (fixErr) {
        req.log.error(
          { fixErr, bookingId },
          "Failed to persist corrected booking price — refusing to charge a mismatched amount",
        );
        res.status(500).json({ success: false, error: "Could not reconcile booking price" });
        return;
      }
    }
  } catch (err) {
    req.log.error({ err }, "Failed to compute authoritative booking price");
    res.status(500).json({ success: false, error: "Could not compute booking price" });
    return;
  }

  const currency = "BHD";

  if (!amount || amount <= 0) {
    res.status(422).json({ success: false, error: "Computed booking price is invalid" });
    return;
  }

  // Tap idempotency: if the booking already has a tapChargeId, check its
  // current status before creating a new charge.
  const existingChargeId =
    typeof booking["tapChargeId"] === "string" ? booking["tapChargeId"] : null;
  if (existingChargeId) {
    try {
      const existingTapRes = await fetch(
        `https://api.tap.company/v2/charges/${encodeURIComponent(existingChargeId)}`,
        { headers: { Authorization: `Bearer ${tapSecret}` } },
      );
      if (existingTapRes.ok) {
        const existingCharge = (await existingTapRes.json()) as Record<string, any>;
        const existingChargeStatus = String(existingCharge["status"] ?? "").toUpperCase();
        if (existingChargeStatus === "INITIATED") {
          // Reuse the existing open session — user can continue paying.
          const existingUrl = existingCharge?.["transaction"]?.url as string | undefined;
          if (existingUrl) {
            res.json({ success: true, paymentUrl: existingUrl, tapResponse: existingCharge });
            return;
          }
        } else if (
          existingChargeStatus === "CAPTURED" ||
          existingChargeStatus === "AUTHORIZED"
        ) {
          res.status(409).json({ success: false, error: "already_paid" });
          return;
        }
        // CANCELLED / FAILED / VOID / other → fall through to create a new charge
      }
    } catch (lookupErr) {
      req.log.warn(
        { lookupErr, existingChargeId },
        "Could not verify existing charge — proceeding to create new charge",
      );
    }
  }

  // Construct the redirect URL server-side. Client-supplied URLs are never
  // used directly — this prevents open-redirect attacks.
  //
  // Platform strategy:
  //  • Native mobile: validate the client-supplied redirectUrl against the
  //    MOBILE_APP_SCHEME allowlist (e.g. "mukhymat://"). Only if it matches
  //    do we use it — so the native openAuthSessionAsync call returns to the
  //    app. Without MOBILE_APP_SCHEME configured, native falls through to the
  //    web URL (safe but non-functional for native; operator must configure it).
  //  • Web / default: PAYMENT_REDIRECT_URL (full callback path) or
  //    ALLOWED_ORIGIN + /payment/success.
  const allowedOrigin = process.env["ALLOWED_ORIGIN"] ?? "";
  const allowedMobileScheme = (process.env["MOBILE_APP_SCHEME"] ?? "").trim();
  const clientPlatform = typeof platform === "string" ? platform : "";
  const isNative = clientPlatform === "native" || clientPlatform === "mobile";
  const clientRedirectUrl = typeof redirectUrl === "string" ? redirectUrl.trim() : "";
  const mobileRedirectValid =
    isNative &&
    allowedMobileScheme.length > 0 &&
    clientRedirectUrl.length > 0 &&
    clientRedirectUrl.startsWith(allowedMobileScheme);

  // For web requests without explicit configuration, derive the redirect from
  // the request Origin header — but only if it matches a trusted suffix.
  // This lets both Replit dev and production domains work without manual env
  // configuration.  PAYMENT_REDIRECT_URL / ALLOWED_ORIGIN always take priority.
  const SAFE_ORIGIN_SUFFIXES = [".replit.dev", ".repl.co", ".replit.app"];
  const requestOrigin = (req.headers["origin"] as string | undefined ?? "").trim();
  const originIsKnownSafe =
    requestOrigin.startsWith("https://") &&
    SAFE_ORIGIN_SUFFIXES.some((s) => requestOrigin.endsWith(s));
  const derivedOrigin = allowedOrigin || (originIsKnownSafe ? requestOrigin : "");

  const baseRedirect = mobileRedirectValid
    ? clientRedirectUrl
    : process.env["PAYMENT_REDIRECT_URL"] ||
      (derivedOrigin ? `${derivedOrigin}/payment/success` : "");

  if (!baseRedirect) {
    req.log.error(
      { platform: clientPlatform, requestOrigin },
      "Payment session aborted: no redirect URL configured. Set PAYMENT_REDIRECT_URL or ALLOWED_ORIGIN (web) / MOBILE_APP_SCHEME (native).",
    );
    res.status(500).json({
      success: false,
      error: "Payment redirect URL not configured — contact support",
    });
    return;
  }
  const redirectTarget = `${baseRedirect}${baseRedirect.includes("?") ? "&" : "?"}bookingId=${encodeURIComponent(bookingId)}`;

  const paymentPayload = {
    amount: Number(amount.toFixed(3)),
    currency,
    threeDSecure: true,
    save_card: false,
    description: `Booking ${bookingId}`,
    metadata: { bookingId },
    reference: { transaction: bookingId, order: bookingId },
    receipt: { email: true, sms: false },
    customer: {
      first_name: customer?.name || str(booking["userName"]) || "Guest",
      email: customer?.email || req.userEmail || undefined,
      phone: customer?.phone
        ? { country_code: "973", number: customer.phone }
        : undefined,
    },
    source: { id: "src_all" },
    redirect: { url: redirectTarget },
  };

  try {
    // Use bookingId as the Tap idempotency key.  Tap's API guarantees that
    // concurrent requests carrying the same key return the same charge result
    // (only one real charge is ever created), eliminating the read/create race
    // between concurrent POST /payments/create requests for the same booking.
    const tapRes = await fetch("https://api.tap.company/v2/charges", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tapSecret}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `booking_${bookingId}`,
      },
      body: JSON.stringify(paymentPayload),
    });

    const tapData = (await tapRes.json()) as Record<string, any>;
    if (!tapRes.ok) {
      // Never return the raw provider payload to the client (Audit v4 C-7):
      // it can contain internal account identifiers, gateway diagnostics, and
      // request echoes. Log it server-side with a correlation id the client
      // can quote to support instead.
      const correlationId = randomUUID();
      req.log.error({ tapData, correlationId, bookingId }, "Tap API error");
      res.status(502).json({
        success: false,
        error: "Payment provider rejected the request — please try again or contact support",
        correlationId,
      });
      return;
    }

    const paymentUrl = tapData?.["transaction"]?.url;

    // Persist the charge ID BEFORE returning the URL via the Admin SDK.
    // We use the Admin SDK (not the guest token) because the Firestore rules
    // only permit a guest to write tapChargeId when simultaneously transitioning
    // paymentStatus to pending_verification — which is semantically wrong at this
    // stage (the user hasn't paid yet).  Admin SDK bypasses rules safely here.
    // If this fails we must NOT return the URL: any retry would have no stored
    // chargeId and would race to create a second charge.
    const newChargeId = typeof tapData["id"] === "string" ? tapData["id"] : null;
    if (newChargeId) {
      try {
    const adminDb = getAdminFirestore();
        // Persist the charge ID and the server-computed expected amount together.
        // tapExpectedAmount is the single source of truth the webhook uses for
        // amount validation — it avoids depending on totalPrice which may be
        // absent for legacy bookings that used the nightly-rate fallback.
        await adminDb.collection("bookings").doc(bookingId).update({
          tapChargeId: newChargeId,
          tapExpectedAmount: Number(amount.toFixed(3)),
          tapExpectedCurrency: currency,
        });
      } catch (patchErr) {
        req.log.error(
          { patchErr, bookingId, newChargeId },
          "Failed to persist tapChargeId — refusing to return URL to prevent double-charge on retry",
        );
        res.status(500).json({
          success: false,
          error: "Payment session created but could not be saved — please retry",
        });
        return;
      }
    }

    // Return only what the client needs — never the raw provider response
    // (Audit v4 C-7): tapData carries gateway internals and request echoes.
    res.json({ success: true, paymentUrl });
  } catch (err) {
    req.log.error({ err }, "Failed to create Tap payment page");
    res.status(500).json({ success: false, error: "Failed to create payment session" });
  }
});

// ---------------------------------------------------------------------------
// Cancel a booking — applies refund policy, calls Tap refund API for paid
// online bookings, writes a refund record, and updates the booking atomically.
// Idempotent: safe to call multiple times; a second call on an already-
// cancelled booking returns success without double-refunding.
//
// Auth: caller must be the guest (userId) or the host (hostId) of the booking.
// Cash bookings: status is updated but no Tap refund is attempted (host settles
// directly with guest per platform terms).
// ---------------------------------------------------------------------------
router.post("/bookings/:bookingId/cancel", requireAuth, async (req, res) => {
  const { bookingId } = req.params as { bookingId: string };
  if (!bookingId) {
    res.status(400).json({ success: false, error: "Missing bookingId" });
    return;
  }

  const parsedCancel = parseBody(BookingCancelBody, req.body, res);
  if (!parsedCancel) return;
  const reason = parsedCancel.reason.trim();
  if (!reason) {
    res.status(400).json({ success: false, error: "Cancellation reason is required" });
    return;
  }

  const tapSecret = process.env["TAP_SECRET_KEY"];

  try {
    const adminDb = getAdminFirestore();

    type CancelOutcome =
      | "cancelled"
      | "already_cancelled"
      | "not_found"
      | "forbidden"
      | "not_cancellable"
      | "refund_queued"
      | "refund_retry";

    let tapRefundId: string | undefined;

    // The transaction returns its outcome (runTransaction resolves with the
    // callback's return value) — avoids captured-variable narrowing issues and
    // keeps the decision + data flow explicit.
    const txResult = await adminDb.runTransaction(
      async (tx): Promise<{ outcome: CancelOutcome; refundAmount: number; tapChargeId: string }> => {
        const bookingRef = adminDb.collection("bookings").doc(bookingId);
        const snap = await tx.get(bookingRef);

        if (!snap.exists) {
          return { outcome: "not_found", refundAmount: 0, tapChargeId: "" };
        }
        const d = snap.data()!;

        // Read the availability index doc and the camp doc BEFORE any writes —
        // Firestore transactions require all reads to precede the first write.
        const campIdEarly = str(d["campId"]);
        const checkInDateEarly = str(d["checkInDate"]);
        let indexSnap: FirebaseFirestore.DocumentSnapshot | null = null;
        let indexDocRef: FirebaseFirestore.DocumentReference | null = null;
        let campData: Record<string, unknown> | null = null;
        if (campIdEarly) {
          const campSnap = await tx.get(
            adminDb.collection("camps").doc(campIdEarly),
          );
          campData = campSnap.exists ? (campSnap.data() as Record<string, unknown>) : null;
        }
        if (campIdEarly && checkInDateEarly) {
          indexDocRef = adminDb
            .collection("campAvailability")
            .doc(campIdEarly)
            .collection("dates")
            .doc(checkInDateEarly);
          indexSnap = await tx.get(indexDocRef);
        }

        // Auth: the guest is tied to the booking; the host is tied to the
        // current camp owner record, never the denormalized booking hostId.
        // This prevents a former host from cancelling/refunding a booking
        // after a camp ownership transfer.
        const callerId = req.uid!;
        const isGuest = str(d["userId"]) === callerId;
        const isHost = isAuthoritativeCampHost(campData, callerId);
        if (!isGuest && !isHost) {
          return { outcome: "forbidden", refundAmount: 0, tapChargeId: "" };
        }

        // Idempotent: already cancelled → succeed without re-writing.
        // Exception: if a refund is still stuck in "pending" (the Tap call
        // failed or was ambiguous on a previous attempt), re-run the Tap
        // request — the deterministic Idempotency-Key (refund_<bookingId>)
        // makes the retry safe against double-refunds.
        if (str(d["status"]) === "cancelled") {
          const stuckRefund =
            str(d["refundStatus"]) === "pending" &&
            num(d["refundAmount"]) > 0 &&
            str(d["tapChargeId"]) !== "";
          if (stuckRefund) {
            return {
              outcome: "refund_retry",
              refundAmount: num(d["refundAmount"]),
              tapChargeId: str(d["tapChargeId"]),
            };
          }
          return { outcome: "already_cancelled", refundAmount: 0, tapChargeId: "" };
        }

        // Completed stays and all other terminal/unsupported states must never
        // be turned into cancellations. In particular, hosts receive a full
        // refund for valid cancellations, so allowing a completed paid stay
        // through here would create an improper refund.
        if (!isCancellableBookingStatus(str(d["status"]))) {
          return { outcome: "not_cancellable", refundAmount: 0, tapChargeId: "" };
        }

        const cancelledBy = isHost ? "host" : "guest";
        const now = new Date().toISOString();

        // Determine refund amount from stored refundPolicy + paymentStatus.
        const paymentStatus = str(d["paymentStatus"]);
        const paymentMethod = str(d["paymentMethod"]);
        const isCash = paymentMethod === "cash_on_arrival";
        const isPaid = paymentStatus === "paid";
        const storedTotal = num(d["totalPrice"]);

        // Compute refund in integer fils (BHD has 3 decimals = 1000 fils per BHD).
        let refundFils = 0;
        if (isPaid && !isCash && storedTotal > 0) {
          // For host cancellations: full refund always.
          // For guest cancellations: apply the stored policy (default non-refundable
          // if policy absent — safe conservative default).
          if (cancelledBy === "host") {
            refundFils = Math.round(storedTotal * 1000);
          } else {
            // Resolve the policy tier from the CAMP document (host-written,
            // rules-protected) — never from booking fields, which are
            // client-authored at reservation time (Audit v4 C-2). Booking
            // fields are consulted only when the camp doc no longer exists.
            const tier = campData
              ? resolveCancellationTier(
                  campData["cancellationPolicy"],
                  campData["refundPolicy"],
                )
              : resolveCancellationTier(
                  d["cancellationPolicy"],
                  d["refundPolicy"],
                );
            const checkInDate = str(d["checkInDate"]);
            const daysUntilCheckIn = checkInDate
              ? Math.ceil((new Date(checkInDate).getTime() - Date.now()) / 86_400_000)
              : -1;
            refundFils = guestRefundFils(tier, storedTotal, daysUntilCheckIn);
          }
        }
        const refundAmount = refundFils / 1000;

        // Write cancellation + refund record in one transaction.
        tx.update(bookingRef, {
          status: "cancelled",
          cancelledAt: now,
          cancelledBy,
          cancellationReason: reason,
          updatedAt: now,
          ...(refundAmount > 0
            ? { refundAmount, refundStatus: "pending" }
            : {}),
        });

        // Remove the availability date entry so the slot re-opens — but only
        // if the index doc still belongs to this booking.  The index doc was
        // read above (before any writes) to satisfy Firestore's read-before-write
        // ordering rule.  An expired-pending booking can be reclaimed by a newer
        // booking that overwrites the index with its own bookingId; deleting it
        // unconditionally would corrupt the newer booking's calendar entry.
        const campId = campIdEarly;
        const checkInDate = checkInDateEarly;
        if (indexDocRef && indexSnap !== null) {
          const indexBookingId = indexSnap.exists
            ? (indexSnap.data() as Record<string, unknown>)["bookingId"]
            : undefined;
          // Delete if: doc doesn't exist, or has no bookingId (legacy doc), or belongs to this booking.
          if (!indexSnap.exists || !indexBookingId || indexBookingId === bookingId) {
            tx.delete(indexDocRef);
          }
        }

        // Write a refund record for tracking (even if refundAmount === 0 for audit trail).
        const refundRef = adminDb.collection("refunds").doc();
        tx.set(refundRef, {
          bookingId,
          campId,
          userId: str(d["userId"]),
          hostId: str(d["hostId"]),
          cancelledBy,
          cancellationReason: reason,
          totalAmountBHD: storedTotal,
          refundAmountBHD: refundAmount,
          refundAmountFils: refundFils,
          paymentMethod,
          paymentStatus,
          tapChargeId: str(d["tapChargeId"]) || null,
          refundStatus: refundAmount > 0 && !isCash ? "pending" : "not_applicable",
          createdAt: now,
          updatedAt: now,
        });

        return {
          outcome: refundAmount > 0 && !isCash ? "refund_queued" : "cancelled",
          refundAmount,
          tapChargeId: str(d["tapChargeId"]),
        };
      },
    );

    const { outcome, refundAmount, tapChargeId } = txResult;

    if (outcome === "not_found") {
      res.status(404).json({ success: false, error: "Booking not found" });
      return;
    }
    if (outcome === "forbidden") {
      res.status(403).json({ success: false, error: "Not authorised to cancel this booking" });
      return;
    }
    if (outcome === "already_cancelled") {
      res.json({ success: true, message: "Booking was already cancelled", refundAmount: 0 });
      return;
    }
    if (outcome === "not_cancellable") {
      res.status(409).json({
        success: false,
        error: "Only pending or confirmed bookings can be cancelled",
      });
      return;
    }

    // Attempt Tap refund outside the transaction (can't do network I/O inside).
    // If the refund call fails we log and leave refundStatus:pending; any
    // subsequent cancel call for this booking retries it ("refund_retry") with
    // the same deterministic Idempotency-Key, so retries cannot double-refund.
    if ((outcome === "refund_queued" || outcome === "refund_retry") && refundAmount > 0) {
      if (tapChargeId && tapSecret) {
        try {
          const refundRes = await fetch(
            `https://api.tap.company/v2/refunds`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${tapSecret}`,
                "Content-Type": "application/json",
                // Idempotency key includes the charge ID so a second cancellation
        // attempt on a NEW charge (after a retry created a fresh charge)
        // never reuses a key that was already submitted for the first charge
        // (Audit v4 H-7: avoid cross-operation key collision).
        "Idempotency-Key": `refund_${bookingId}_${tapChargeId}`,
              },
              body: JSON.stringify({
                charge_id: tapChargeId,
                amount: refundAmount,
                currency: "BHD",
                reason: "requested_by_customer",
                metadata: { bookingId, cancelledBy: req.uid },
              }),
            },
          );
          const refundData = (await refundRes.json()) as Record<string, unknown>;
          tapRefundId = typeof refundData["id"] === "string" ? refundData["id"] : undefined;

          if (refundRes.ok && tapRefundId) {
            // Update refund record with the Tap refund ID and status.
            const refundStatus =
              str(refundData["status"]).toUpperCase() === "CAPTURED" ? "refunded" : "processing";
            await adminDb.collection("refunds").where("bookingId", "==", bookingId).limit(1).get()
              .then((qs) => {
                if (!qs.empty) {
                  qs.docs[0].ref.update({
                    tapRefundId,
                    refundStatus,
                    updatedAt: new Date().toISOString(),
                  });
                }
              });
            await adminDb.collection("bookings").doc(bookingId).update({
              refundStatus,
              tapRefundId,
              updatedAt: new Date().toISOString(),
            });
            req.log.info({ bookingId, tapRefundId, refundAmount }, "Tap refund initiated");
          } else {
            req.log.error({ bookingId, refundData }, "Tap refund API call failed — refundStatus stays pending for manual retry");
          }
        } catch (refundErr) {
          req.log.error({ refundErr, bookingId }, "Failed to call Tap refund API — refundStatus stays pending");
        }
      } else if (!tapChargeId) {
        req.log.warn({ bookingId }, "No tapChargeId found — cannot initiate refund automatically");
      }
    }

    // Send cancellation emails best-effort. Skip on refund_retry — the
    // cancellation emails already went out when the booking was first
    // cancelled; a refund retry must not spam guest and host again.
    // Recipients are resolved from Firebase Auth / the camp's host profile
    // (Audit v4 H-8): booking.userEmail and booking.hostEmail are client-
    // written strings and must NOT be used as mailing targets.
    if (outcome !== "refund_retry") {
    try {
      const adminDb2 = getAdminFirestore();
      const bookingSnap = await adminDb2.collection("bookings").doc(bookingId).get();
      if (bookingSnap.exists) {
        const d = bookingSnap.data()!;
        const emailData = bookingEmailData(bookingId, d as Record<string, unknown>);

        // --- Guest email: resolve from Firebase Auth, not booking data ---
        const guestUid = str(d["userId"]);
        let guestEmail: string | undefined;
        if (guestUid) {
          try {
            const { getAuth } = await import("firebase-admin/auth");
            const guestUser = await getAuth().getUser(guestUid);
            guestEmail = guestUser.email ?? undefined;
          } catch {
            req.log.warn({ bookingId, guestUid }, "Could not resolve guest email from Auth — skipping guest cancellation email");
          }
        }

        // --- Host email: camp.hostId -> that user's own profile (Admin SDK).
        // Same trust chain as resolveTrustedHost; done directly here because
        // this path already holds an Admin Firestore handle.
        const campId = str(d["campId"]);
        let hostEmail: string | undefined;
        if (campId) {
          try {
            const campSnap = await adminDb2.collection("camps").doc(campId).get();
            const trustedHostId = campSnap.exists ? str(campSnap.data()!["hostId"]) : "";
            if (trustedHostId) {
              const hostSnap = await adminDb2.collection("users").doc(trustedHostId).get();
              hostEmail = hostSnap.exists ? str(hostSnap.data()!["email"]) || undefined : undefined;
            }
          } catch {
            req.log.warn({ bookingId, campId }, "Could not resolve host email — skipping host cancellation email");
          }
        }

        if (guestEmail) {
          await sendEmail(
            guestEmail,
            `Your booking has been cancelled`,
            cancellationEmail({ ...emailData, cancellationReason: reason }, false),
          );
        }
        if (hostEmail) {
          await sendEmail(
            hostEmail,
            `Booking cancelled`,
            cancellationEmail({ ...emailData, cancellationReason: reason }, true),
          );
        }
      }
    } catch (emailErr) {
      req.log.warn({ emailErr, bookingId }, "Failed to send cancellation emails");
    }
    }

    res.json({
      success: true,
      refundAmount,
      refundStatus: refundAmount > 0 ? (tapRefundId ? "processing" : "pending") : "not_applicable",
      tapRefundId: tapRefundId ?? null,
    });
  } catch (err) {
    req.log.error({ err, bookingId }, "Failed to cancel booking");
    res.status(500).json({ success: false, error: "Failed to cancel booking" });
  }
});

/**
 * Mark a booking's refund as completed in Firestore.
 *
 * Transactionally re-validates that `tapRefundId` still matches the booking's
 * stored refund operation before writing — guards against stale or
 * concurrently-superseded events settling the wrong booking state.
 *
 * Returns "settled" on success, "stale" if the booking's stored tapRefundId
 * no longer matches (concurrent update), "not_found" if the booking is gone.
 * Callers must treat "stale" as a no-op and log for manual review.
 *
 * The booking + late_capture_ record are updated inside the transaction.
 * The regular refund record (not addressable without a query) is updated
 * outside the transaction — this is safe because the booking write is the
 * authoritative state; the record update is an idempotent audit trail write.
 */
async function markRefundCompleted(
  db: FirebaseFirestore.Firestore,
  bookingId: string,
  tapRefundId: string,
  logger: { info: (obj: object, msg: string) => void; warn: (obj: object, msg: string) => void },
): Promise<"settled" | "stale" | "not_found"> {
  if (!tapRefundId) {
    logger.warn({ bookingId }, "markRefundCompleted called without tapRefundId — skipping to avoid wrong-record settlement");
    return "stale";
  }

  const now = new Date().toISOString();

  // Transactional update: read → re-validate → write booking + late_capture_ doc atomically.
  const txOutcome = await db.runTransaction(async (tx) => {
    const bookingRef = db.collection("bookings").doc(bookingId);
    const lcRef = db.collection("refunds").doc(`late_capture_${bookingId}`);

    const [bookingSnap, lcSnap] = await Promise.all([tx.get(bookingRef), tx.get(lcRef)]);

    if (!bookingSnap.exists) return "not_found" as const;

    const bData = bookingSnap.data()!;

    // Re-validate that this tapRefundId still matches the booking's active
    // refund operation.  A stored tapRefundId of "" means no refund has been
    // recorded yet — accept in that case (booking may still be in "pending"
    // when the webhook fires before the cancel endpoint's update propagates).
    const storedRefundId = str(bData["tapRefundId"]);
    if (storedRefundId && storedRefundId !== tapRefundId) {
      return "stale" as const;
    }

    // Idempotency: already refunded → no-op.
    if (str(bData["refundStatus"]) === "refunded") return "settled" as const;

    tx.update(bookingRef, {
      refundStatus: "refunded",
      refundCompletedAt: now,
      tapRefundId,
      updatedAt: now,
    });

    // Update the late_capture_ record only if it carries this exact refund ID.
    if (lcSnap.exists && str(lcSnap.data()!["tapRefundId"]) === tapRefundId) {
      tx.update(lcRef, { refundStatus: "refunded", refundCompletedAt: now, updatedAt: now });
    }

    return "settled" as const;
  });

  if (txOutcome !== "settled") return txOutcome;

  // Update the regular refund record outside the transaction (Firestore
  // transactions cannot run collection queries).  This is an idempotent audit
  // trail write; the booking document is already authoritatively settled above.
  const regularQuery = await db.collection("refunds")
    .where("bookingId", "==", bookingId)
    .where("tapRefundId", "==", tapRefundId)
    .limit(1)
    .get();
  if (!regularQuery.empty) {
    await regularQuery.docs[0].ref
      .update({ refundStatus: "refunded", refundCompletedAt: now, updatedAt: now })
      .catch((e) => logger.warn({ bookingId, e }, "Failed to update regular refund record — booking already settled"));
  }

  logger.info({ bookingId, tapRefundId }, "Refund marked as completed");
  return "settled";
}

// ---------------------------------------------------------------------------
// Tap webhook — verifies HMAC signature then settles booking server-side
// ---------------------------------------------------------------------------
router.post("/webhooks/tap", async (req, res) => {
  const tapSecret = process.env["TAP_SECRET_KEY"];
  if (!tapSecret) {
    req.log.error("TAP_SECRET_KEY not configured — cannot verify webhook");
    res.status(500).json({ success: false, error: "Webhook not configured" });
    return;
  }

  // Tap sends the signature in X-Tap-Signature as HMAC-SHA256 of the raw
  // request body bytes. We use req.rawBody (captured by app.ts verify hook)
  // to match the exact bytes Tap signed — not a re-serialised JSON string,
  // which may differ in key order or whitespace.
  const sigHeader = req.headers["x-tap-signature"];
  const signature = typeof sigHeader === "string" ? sigHeader : "";

  const bodyBytes = req.rawBody;
  if (!bodyBytes || bodyBytes.length === 0) {
    req.log.warn("Tap webhook: raw body not captured — cannot verify signature");
    res.status(400).json({ success: false, error: "Raw body unavailable" });
    return;
  }

  const expected = createHmac("sha256", tapSecret).update(bodyBytes).digest("hex");

  try {
    const sigBuf = Buffer.from(signature, "hex");
    const expBuf = Buffer.from(expected, "hex");
    if (
      sigBuf.length === 0 ||
      sigBuf.length !== expBuf.length ||
      !timingSafeEqual(sigBuf, expBuf)
    ) {
      // Never log the supplied signature value itself (Audit v4 C-7) — a log
      // sink must not become an oracle for signature-forging attempts.
      req.log.warn({ signatureLength: signature.length }, "Tap webhook signature mismatch");
      res.status(401).json({ success: false, error: "Invalid webhook signature" });
      return;
    }
  } catch {
    res.status(401).json({ success: false, error: "Invalid webhook signature" });
    return;
  }

  // Structural validation after HMAC (Audit v4 H-7): the signature proves
  // origin, not shape. Parse the payload against a permissive-but-typed
  // schema so downstream code never sees non-object metadata, numeric IDs,
  // or similar shape surprises from a provider format change.
  const tapWebhookSchema = z
    .object({
      object: z.string().optional(),
      id: z.string().optional(),
      status: z.union([z.string(), z.number()]).optional(),
      amount: z.union([z.number(), z.string()]).optional(),
      currency: z.string().optional(),
      charge_id: z.string().optional(),
      metadata: z.record(z.string(), z.unknown()).optional(),
      charge: z.record(z.string(), z.unknown()).optional(),
    })
    .passthrough();
  const parsedEvent = tapWebhookSchema.safeParse(req.body ?? {});
  if (!parsedEvent.success) {
    req.log.error(
      { issues: parsedEvent.error.issues },
      "Tap webhook: payload failed structural validation — acknowledged without processing",
    );
    // 200 OK: the event is authentic (HMAC passed) but malformed; retrying
    // won't fix its shape, so don't ask Tap to redeliver forever.
    res.json({ success: true, message: "Malformed payload — ignored" });
    return;
  }
  const event = parsedEvent.data as Record<string, any>;

  // ---------------------------------------------------------------------------
  // Tap REFUND events — fired when a refund completes.
  // Shape: { object: "refund", id: "ref_xxx", status: "CAPTURED",
  //          charge_id: "chg_xxx", metadata: { bookingId: "..." } }
  // Handle these before the charge-CAPTURED path so they don't fall through
  // into the charge settlement logic.
  // ---------------------------------------------------------------------------
  if (event["object"] === "refund") {
    const refundId = typeof event["id"] === "string" ? (event["id"] as string) : "";
    const refundStatus = String(event["status"] ?? "").toUpperCase();
    const refundBookingId: string =
      event["metadata"]?.bookingId ?? event["metadata"]?.booking_id ?? "";

    req.log.info({ refundId, refundStatus, refundBookingId }, "Tap refund webhook received");

    if (!refundBookingId) {
      req.log.warn({ event }, "Tap refund webhook: no bookingId in metadata — ignored");
      res.json({ success: true, message: "No bookingId — ignored" });
      return;
    }

    if (refundStatus === "CAPTURED") {
      try {
        const db = getAdminFirestore();

        // ------------------------------------------------------------------
        // Binding validation: a Tap-signed event is authentic, but it must
        // still be bound to the correct booking/refund before we mutate state.
        // A misrouted, delayed, or replayed event must not settle this booking.
        // ------------------------------------------------------------------
        const eventChargeId = typeof event["charge_id"] === "string"
          ? (event["charge_id"] as string) : "";

        const bookingSnap = await db.collection("bookings").doc(refundBookingId).get();
        if (!bookingSnap.exists) {
          req.log.warn({ refundBookingId, refundId }, "Tap refund webhook: booking not found — acknowledged without state change");
          res.json({ success: true, message: "Booking not found — ignored" });
          return;
        }
        const bData = bookingSnap.data()!;

        // 1. charge_id binding: the event MUST carry a non-empty charge_id
        // equal to the charge this booking created. A refund event with no
        // charge_id (or for a booking with no bound charge) has nothing to
        // bind against and must never mutate state (Audit v4 C-6).
        const storedChargeId = str(bData["tapChargeId"]);
        if (!eventChargeId || !storedChargeId || eventChargeId !== storedChargeId) {
          req.log.error(
            { refundBookingId, refundId, eventChargeId, storedChargeId },
            "Tap refund webhook: missing or mismatched charge_id — refusing state change (manual review required)",
          );
          res.json({ success: true, message: "charge_id missing/mismatch — ignored" });
          return;
        }

        // 2. Refund ID binding: the refund ID must be POSITIVELY recognised as
        // belonging to this booking — either it matches the tapRefundId stored
        // on the booking, or a refund record for this booking carries it. An
        // empty stored tapRefundId is NOT a free pass (Audit v4 C-6).
        const storedRefundId = str(bData["tapRefundId"]);
        let refundIdRecognised = !!storedRefundId && storedRefundId === refundId;
        if (!refundIdRecognised) {
          const [regularQuery, lcSnap] = await Promise.all([
            db.collection("refunds")
              .where("bookingId", "==", refundBookingId)
              .where("tapRefundId", "==", refundId)
              .limit(1)
              .get(),
            db.collection("refunds").doc(`late_capture_${refundBookingId}`).get(),
          ]);
          refundIdRecognised =
            !regularQuery.empty ||
            (lcSnap.exists && str(lcSnap.data()!["tapRefundId"]) === refundId);
        }
        if (!refundIdRecognised) {
          req.log.error(
            { refundBookingId, refundId, storedRefundId },
            "Tap refund webhook: refund ID not recognised for this booking — refusing state change (manual review required)",
          );
          res.json({ success: true, message: "refund ID not recognised — ignored" });
          return;
        }

        // Validations passed — settle the refund.
        const refundOutcome = await markRefundCompleted(db, refundBookingId, refundId, req.log);
        if (refundOutcome === "settled") {
          req.log.info({ refundBookingId, refundId }, "Tap refund webhook: booking marked refunded");
        } else {
          req.log.warn({ refundBookingId, refundId, refundOutcome }, "Tap refund webhook: markRefundCompleted returned non-settled outcome");
        }
      } catch (refundWebhookErr) {
        req.log.error({ refundWebhookErr, refundBookingId: event["metadata"]?.bookingId, refundId: event["id"] }, "Tap refund webhook: failed to mark refund completed");
        res.status(500).json({ success: false, error: "Failed to update refund status" });
        return;
      }
    } else {
      req.log.info({ refundBookingId, refundId, refundStatus }, "Tap refund webhook: non-terminal status — no update");
    }

    res.json({ success: true });
    return;
  }

  const charge = event["object"] === "charge" ? event : event["charge"] ?? event;
  const status = String(charge["status"] ?? "").toUpperCase();

  const bookingId: string =
    charge["metadata"]?.bookingId ??
    charge["metadata"]?.booking_id ??
    "";

  if (!bookingId) {
    req.log.warn({ charge }, "Tap webhook: no bookingId in metadata");
    res.json({ success: true, message: "No bookingId — ignored" });
    return;
  }

  req.log.info({ bookingId, status }, "Tap webhook received");

  // Replay protection: record every processed event in a ledger keyed by the
  // charge id + status. A replayed webhook (same charge, same status) is
  // acknowledged without re-processing. The ledger doubles as a durable
  // payment-event audit trail.
  const chargeId = typeof charge["id"] === "string" ? (charge["id"] as string) : "";
  const eventKey = chargeId ? `${chargeId}_${status}` : "";

  if (status === "CAPTURED") {
    // A legitimate Tap capture always carries the charge's `id`. Without it
    // there is nothing to bind against the booking's stored tapChargeId and
    // no ledger key for replay protection — refuse to touch the booking.
    if (!chargeId) {
      req.log.error(
        { bookingId },
        "Tap webhook: CAPTURED event has no charge id — refusing settlement (manual review required)",
      );
      res.json({ success: true, message: "Missing charge id — ignored" });
      return;
    }
    try {
      const db = getAdminFirestore();

      // Claim the event ledger entry ATOMICALLY (Audit v4 C-6): the
      // check-and-claim runs inside one transaction so two concurrent
      // deliveries of the same event race on the `claimedAt` field and
      // exactly one wins. The loser is acknowledged without side effects.
      // `processed` is still set true only after all settlement work
      // succeeds; a claim older than the stale threshold (crashed worker)
      // may be re-claimed so Tap's replay can retry.
      if (eventKey) {
        const eventRef = db.collection("paymentEvents").doc(eventKey);
        const CLAIM_STALE_MS = 2 * 60 * 1000;
        type ClaimOutcome = "claimed" | "already_processed" | "in_flight";
        const claim: ClaimOutcome = await db.runTransaction(
          async (tx: FirebaseFirestore.Transaction): Promise<ClaimOutcome> => {
            const eventSnap = await tx.get(eventRef);
            const existing = eventSnap.exists ? eventSnap.data()! : null;
            if (existing?.["processed"] === true) {
              return "already_processed";
            }
            const claimedAtMs = typeof existing?.["claimedAtMs"] === "number"
              ? (existing["claimedAtMs"] as number) : 0;
            if (existing && claimedAtMs && Date.now() - claimedAtMs < CLAIM_STALE_MS) {
              return "in_flight";
            }
            tx.set(
              eventRef,
              {
                chargeId,
                bookingId,
                status,
                amount: charge["amount"] ?? null,
                currency: charge["currency"] ?? null,
                receivedAt: new Date().toISOString(),
                claimedAtMs: Date.now(),
                processed: false,
              },
              { merge: true },
            );
            return "claimed";
          },
        );
        if (claim === "already_processed") {
          req.log.info({ eventKey, bookingId }, "Tap webhook: event already processed — ignoring replay");
          res.json({ success: true, message: "Already processed" });
          return;
        }
        if (claim === "in_flight") {
          // A concurrent delivery holds the claim. Tell Tap to retry later —
          // if the holder succeeds, the retry hits `already_processed`;
          // if it crashed, the stale claim is re-claimable.
          req.log.warn({ eventKey, bookingId }, "Tap webhook: event claim held by concurrent delivery — deferring");
          res.status(503).json({ success: false, error: "Event processing in flight — retry" });
          return;
        }
      }
      // Transactional settlement: read the booking and the availability lock
      // atomically to ensure:
      //  1. A cancelled booking is never revived.
      //  2. A booking whose payment window expired AND whose lock was already
      //     reclaimed by a new guest is not confirmed — that would create two
      //     confirmed bookings for the same camp+date.
      //  3. The charge being settled is the exact charge this booking created
      //     (charge-ID binding) and its amount/currency match, compared in
      //     integer BHD fils to avoid floating-point drift.
      let settled = false;
      // When a late capture arrives for a booking whose slot was reclaimed (or
      // which was cancelled), the guest's money must go back — flag it for an
      // automatic refund after the transaction commits.
      let refundLateCapture = false;
      // Set to true if the late-capture refund could not be completed this
      // invocation; the payment event is left unprocessed so a Tap webhook
      // replay can retry with the same provider idempotency key.
      let lateCaptureRefundFailed = false;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await db.runTransaction(async (tx: any) => {
        refundLateCapture = false;
        const bookingRef = db.collection("bookings").doc(bookingId);
        const snap = await tx.get(bookingRef);
        if (!snap.exists) {
          throw new Error(`Booking ${bookingId} not found`);
        }
        const data = snap.data()!;

        // Charge-ID binding: the webhook must only settle the charge this
        // booking actually created. A charge for a different booking (or a
        // fabricated/replayed charge for a stale ID) must never flip this
        // booking to paid. Charge creation persists tapChargeId before
        // returning the payment URL, so a legitimate capture always has a
        // bound charge ID — strict equality is required (a booking without
        // one must never be settled by a webhook).
        const boundChargeId =
          typeof data["tapChargeId"] === "string" ? (data["tapChargeId"] as string) : "";
        if (boundChargeId !== chargeId) {
          req.log.error(
            { bookingId, boundChargeId, chargeId },
            "Tap webhook: charge ID does not match booking's tapChargeId — refusing settlement (manual review required)",
          );
          return;
        }

        if (data["status"] === "cancelled" || data["status"] === "expired") {
          // Booking was cancelled or the server-side expiry sweep already
          // released it — do not revive it under any circumstances.  The
          // capture means the guest was charged for a slot that is no longer
          // theirs: refund the full amount automatically.
          // Atomically claim the refund responsibility so a duplicate webhook
          // cannot also trigger a refund (exactly-once guard).
          if (data["lateCaptureClaimed"]) {
            req.log.warn(
              { bookingId, status: data["status"] },
              "Tap webhook: late-capture refund already claimed — skipping",
            );
            return;
          }
          tx.update(bookingRef, { lateCaptureClaimed: true });
          req.log.warn(
            { bookingId, status: data["status"] },
            "Tap webhook: booking is terminal — skipping settlement, refunding late capture",
          );
          refundLateCapture = true;
          return;
        }

        if (data["status"] === "confirmed" && data["paymentStatus"] === "paid") {
          // Already settled (e.g. by the verify endpoint) — idempotent no-op.
          req.log.info({ bookingId }, "Tap webhook: booking already settled — no-op");
          return;
        }

        // Guard against late captures on expired bookings whose slot was reclaimed.
        const bookingExpiresAt: number | undefined =
          typeof data["expiresAt"] === "number" ? (data["expiresAt"] as number) : undefined;
        if (
          bookingExpiresAt !== undefined &&
          bookingExpiresAt < Date.now() &&
          data["status"] === "pending"
        ) {
          // Booking's payment window has elapsed. Check whether the availability
          // lock still points at this booking — if it was reclaimed by a new
          // booking we must not confirm and should not charge the original guest.
          const lockCampId = String(data["campId"] ?? "");
          const lockCheckInDate = String(data["checkInDate"] ?? "");
          if (lockCampId && lockCheckInDate) {
            const lockRef = db
              .collection("availabilityLocks")
              .doc(`${lockCampId}_${lockCheckInDate}`);
            const lockSnap = await tx.get(lockRef);
            const lockBookingId = lockSnap.exists
              ? lockSnap.data()?.["bookingId"]
              : undefined;
            if (lockBookingId !== bookingId) {
              // Slot was reclaimed — skip settlement and refund the guest
              // automatically (they were charged for a slot they lost).
              // Atomically claim the refund responsibility so a duplicate webhook
              // cannot also trigger a refund (exactly-once guard).
              if (data["lateCaptureClaimed"]) {
                req.log.warn(
                  { bookingId },
                  "Tap webhook: late-capture refund already claimed (reclaimed path) — skipping",
                );
                return;
              }
              tx.update(bookingRef, { lateCaptureClaimed: true });
              req.log.error(
                { bookingId, lockCampId, lockCheckInDate, lockBookingId },
                "Tap webhook: expired booking's lock was reclaimed — skipping settlement, refunding late capture",
              );
              refundLateCapture = true;
              return;
            }
          }
        }

        // Validate that the captured amount and currency match what the server
        // computed when it created the charge.  tapExpectedAmount is persisted at
        // charge-creation time so this comparison is reliable even for legacy
        // bookings that have no totalPrice (they used the nightly-rate fallback).
        // Compare in integer BHD fils (1 BHD = 1000 fils) to eliminate any
        // floating-point representation drift between Tap's JSON and ours.
        const tapAmountFils = Math.round(Number(charge["amount"] ?? 0) * 1000);
        const tapCurrency = String(charge["currency"] ?? "").toUpperCase();
        // Primary: use server-persisted expected amount; fall back to totalPrice
        // for bookings created before tapExpectedAmount was introduced.
        const expectedAmountFils = Math.round(
          (data["tapExpectedAmount"] != null
            ? Number(data["tapExpectedAmount"])
            : Number(data["totalPrice"] ?? 0)) * 1000,
        );
        const expectedCurrency = data["tapExpectedCurrency"]
          ? String(data["tapExpectedCurrency"]).toUpperCase()
          : "BHD";
        if (
          tapAmountFils <= 0 ||
          tapAmountFils !== expectedAmountFils ||
          tapCurrency !== expectedCurrency
        ) {
          req.log.error(
            { bookingId, tapAmountFils, expectedAmountFils, tapCurrency, expectedCurrency },
            "Tap webhook: amount/currency mismatch — skipping settlement (manual review required)",
          );
          return;
        }

        tx.update(bookingRef, {
          paymentStatus: "paid",
          status: "confirmed",
          paidAt: new Date().toISOString(),
        });
        settled = true;
      });
      if (settled) {
        req.log.info({ bookingId }, "Booking settled as paid via webhook");
      }

      // Late-capture refund: the guest was charged but the booking cannot be
      // honored (cancelled or slot reclaimed). Queue a refund record, refund
      // the full captured amount via Tap, and alert the team by email so a
      // human is always aware money moved outside the normal flow. We still
      // ACK the webhook because the settlement decision itself is final.
      if (refundLateCapture && chargeId) {
        // Clamp the refund to the server-persisted expected amount (Audit v4
        // C-6): the webhook payload's amount is authenticated but must never
        // exceed what this booking was actually supposed to be charged — a
        // misrouted/inflated payload must not move more money than the
        // booking's own record allows. Fall back to totalPrice for legacy
        // bookings created before tapExpectedAmount existed.
        const payloadAmount = Number(charge["amount"] ?? 0);
        let refundAmount = payloadAmount;
        try {
          const lcBookingSnap = await db.collection("bookings").doc(bookingId).get();
          const lcData = lcBookingSnap.exists ? lcBookingSnap.data()! : null;
          const expectedBHD =
            lcData?.["tapExpectedAmount"] != null
              ? Number(lcData["tapExpectedAmount"])
              : Number(lcData?.["totalPrice"] ?? 0);
          if (expectedBHD > 0 && payloadAmount > expectedBHD) {
            req.log.error(
              { bookingId, chargeId, payloadAmount, expectedBHD },
              "Tap webhook: late-capture payload amount exceeds persisted expected amount — clamping refund",
            );
            refundAmount = expectedBHD;
          }
        } catch (clampErr) {
          req.log.warn({ clampErr, bookingId }, "Late-capture clamp check failed — using payload amount");
        }
        // Deterministic doc ID so webhook replays never create duplicate
        // refund records for the same booking's late capture.
        const refundRecordRef = db.collection("refunds").doc(`late_capture_${bookingId}`);
        try {
          await refundRecordRef.set(
            {
              bookingId,
              tapChargeId: chargeId,
              refundAmountBHD: refundAmount,
              refundAmountFils: Math.round(refundAmount * 1000),
              currency: String(charge["currency"] ?? "BHD").toUpperCase(),
              refundReason: "late_capture",
              refundStatus: "pending",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            { merge: true },
          );
        } catch (recordErr) {
          req.log.error({ recordErr, bookingId }, "Failed to write late-capture refund record");
        }
        try {
          const refundResp = await fetch("https://api.tap.company/v2/refunds", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${tapSecret}`,
              "Content-Type": "application/json",
              // Provider-level idempotency keyed on chargeId: concurrent webhook
              // deliveries or retries after a transient network error will all
              // produce the same key, so Tap de-duplicates the refund on their side.
              "Idempotency-Key": `late_capture_refund_${chargeId}`,
            },
            body: JSON.stringify({
              charge_id: chargeId,
              amount: refundAmount,
              currency: String(charge["currency"] ?? "BHD").toUpperCase(),
              reason: "Late capture — booking no longer valid (cancelled or slot reclaimed)",
              metadata: { bookingId, auto: "late_capture" },
            }),
          });
          const refundData = (await refundResp.json().catch(() => ({}))) as Record<string, unknown>;
          const tapRefundId = typeof refundData["id"] === "string" ? refundData["id"] : null;
          if (refundResp.ok && tapRefundId) {
            await db.collection("bookings").doc(bookingId).set(
              {
                refundStatus: "processing",
                refundAmount,
                tapRefundId,
                refundReason: "late_capture",
                refundInitiatedAt: new Date().toISOString(),
              },
              { merge: true },
            );
            await refundRecordRef.set(
              { refundStatus: "processing", tapRefundId, updatedAt: new Date().toISOString() },
              { merge: true },
            ).catch(() => {});
            req.log.info(
              { bookingId, chargeId, tapRefundId, refundAmount },
              "Tap webhook: automatic late-capture refund initiated",
            );
          } else {
            req.log.error(
              { bookingId, chargeId, status: refundResp.status, refundData },
              "Tap webhook: automatic late-capture refund FAILED — resetting claim for retry",
            );
            // Reset the atomic claim so a subsequent webhook replay can retry.
            // The Tap Idempotency-Key (${bookingId}_late_capture) protects
            // against actual duplicate refunds if the request reached Tap.
            await db.collection("bookings").doc(bookingId).set(
              { lateCaptureClaimed: false, lateCaptureRefundStatus: "failed" },
              { merge: true },
            );
            await refundRecordRef.set(
              { refundStatus: "failed_will_retry", updatedAt: new Date().toISOString() },
              { merge: true },
            ).catch(() => {});
            // Leave the payment event unprocessed so Tap's replay can retry.
            lateCaptureRefundFailed = true;
          }
        } catch (refundErr) {
          req.log.error(
            { refundErr, bookingId, chargeId },
            "Tap webhook: automatic late-capture refund threw — resetting claim for retry",
          );
          // Reset claim so the next webhook delivery can attempt the refund again.
          await db.collection("bookings").doc(bookingId).set(
            { lateCaptureClaimed: false, lateCaptureRefundStatus: "failed" },
            { merge: true },
          ).catch(() => {});
          await refundRecordRef.set(
            { refundStatus: "failed_will_retry", updatedAt: new Date().toISOString() },
            { merge: true },
          ).catch(() => {});
          lateCaptureRefundFailed = true;
        }

        // Alert the team — a late capture on an unusable slot is a money event
        // that must be visible to humans, not just a log line. Best-effort.
        try {
          const alertTo = process.env["TEAM_ALERT_EMAIL"] || "support@mukhymat.com";
          await sendEmail(
            alertTo,
            `⚠️ Late capture refund ${lateCaptureRefundFailed ? "FAILED" : "queued"} — booking ${bookingId}`,
            // IDs come from webhook payload metadata (untrusted despite the
            // HMAC) — HTML-escape every interpolation (Audit v4 C-7).
            `<h2>Late capture on unusable booking</h2>
             <p>A Tap capture arrived for a booking that was cancelled or whose slot was reclaimed.
             An automatic refund of <strong>${escapeHtml(refundAmount.toFixed(3))} ${escapeHtml(String(charge["currency"] ?? "BHD").toUpperCase())}</strong>
             ${lateCaptureRefundFailed
               ? "was attempted but <strong>FAILED</strong>. It will be retried on the next webhook replay — verify in the Tap dashboard."
               : "has been initiated with Tap."}</p>
             <ul>
               <li>Booking ID: ${escapeHtml(bookingId)}</li>
               <li>Charge ID: ${escapeHtml(chargeId)}</li>
               <li>Refund record: refunds/late_capture_${escapeHtml(bookingId)}</li>
             </ul>`,
          );
        } catch (alertErr) {
          req.log.warn({ alertErr, bookingId }, "Failed to send late-capture alert email");
        }
      }

      // Mark the ledger entry processed so replays of this event are ignored.
      // Exception: if a late-capture refund failed and the claim was reset, leave
      // the event unprocessed so Tap's next webhook replay can retry the refund
      // with the same provider idempotency key (no duplicate charge risk).
      if (eventKey) {
        await db
          .collection("paymentEvents")
          .doc(eventKey)
          .set(
            {
              processed: !lateCaptureRefundFailed,
              processedAt: new Date().toISOString(),
              settled,
              ...(lateCaptureRefundFailed ? { lateCaptureRefundPending: true } : {}),
            },
            { merge: true },
          );
      }

      // A failed late-capture refund must be retried: durable state is saved
      // (claim reset, event unprocessed, refund record failed_will_retry), so
      // return a retryable 503 — Tap only redelivers on non-2xx responses.
      // The provider Idempotency-Key makes the redelivered attempt safe.
      if (lateCaptureRefundFailed) {
        res.status(503).json({
          success: false,
          error: "Late-capture refund failed — retry delivery",
        });
        return;
      }
    } catch (err) {
      req.log.error({ err, bookingId }, "Failed to settle booking via webhook");
      // Return 500 so Tap retries
      res.status(500).json({ success: false, error: "Failed to update booking" });
      return;
    }
  } else {
    req.log.info({ bookingId, status }, "Tap webhook: non-captured status — no update");
  }

  res.json({ success: true });
});

// ---------------------------------------------------------------------------
// Attempt a Tap refund and return the resulting tapRefundId + status.
// Uses a caller-supplied idempotency key so the same logical refund can be
// retried safely — Tap de-duplicates on their end.
// ---------------------------------------------------------------------------
async function attemptTapRefund(
  tapSecret: string,
  bookingId: string,
  tapChargeId: string | null,
  refundAmount: number,
  idempotencyKey: string,
  logger: { info: (obj: object, msg: string) => void; error: (obj: object, msg: string) => void; warn: (obj: object, msg: string) => void },
): Promise<{ tapRefundId: string | null; refundStatus: "processing" | "pending" }> {
  if (!tapChargeId) {
    logger.warn({ bookingId }, "attemptTapRefund: no tapChargeId — cannot refund");
    return { tapRefundId: null, refundStatus: "pending" };
  }
  try {
    const refundResp = await fetch("https://api.tap.company/v2/refunds", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tapSecret}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        charge_id: tapChargeId,
        amount: refundAmount,
        currency: "BHD",
        reason: "requested_by_customer",
        metadata: { bookingId },
      }),
    });
    const refundData = (await refundResp.json().catch(() => ({}))) as Record<string, unknown>;
    const tapRefundId = typeof refundData["id"] === "string" ? refundData["id"] : null;
    if (refundResp.ok && tapRefundId) {
      logger.info({ bookingId, tapChargeId, tapRefundId }, "Tap refund initiated");
      return { tapRefundId, refundStatus: "processing" };
    }
    logger.error({ bookingId, tapChargeId, status: refundResp.status, refundData }, "Tap refund API call failed");
    return { tapRefundId: null, refundStatus: "pending" };
  } catch (err) {
    logger.error({ err, bookingId, tapChargeId }, "Tap refund API threw");
    return { tapRefundId: null, refundStatus: "pending" };
  }
}

// ---------------------------------------------------------------------------
// Admin: sync pending/processing refunds — retry pending ones via Tap,
// poll processing ones for completion.
// Requires: admin Firebase ID token (isAdmin === true in Firestore users doc).
// Deterministic idempotency keys ensure retries never double-refund.
// ---------------------------------------------------------------------------
router.post("/admin/refunds/sync", requireAuth, async (req, res) => {
  try {
  const tapSecret = process.env["TAP_SECRET_KEY"];
  if (!tapSecret) {
    res.status(500).json({ success: false, error: "TAP_SECRET_KEY not configured" });
    return;
  }

  const adminDb = getAdminFirestore();

  // Admin gate: caller must have isAdmin flag set by a trusted admin write.
  const callerSnap = await adminDb.collection("users").doc(req.uid!).get();
  if (!callerSnap.exists || callerSnap.data()!["isAdmin"] !== true) {
    res.status(403).json({ success: false, error: "Admin access required" });
    return;
  }

  // Fetch bookings with pending or processing refunds (up to 50 each).
  const [pendingSnap, processingSnap] = await Promise.all([
    adminDb.collection("bookings").where("refundStatus", "==", "pending").limit(50).get(),
    adminDb.collection("bookings").where("refundStatus", "==", "processing").limit(50).get(),
  ]);

  // Also scan the late_capture_ refund records whose bookings may not carry
  // refundStatus at the top level yet (or where the booking-level record
  // already moved to "processing" but the late_capture_ record is "pending").
  const lcPendingSnap = await adminDb
    .collection("refunds")
    .where("refundReason", "==", "late_capture")
    .where("refundStatus", "in", ["pending", "failed_will_retry"])
    .limit(50)
    .get();

  const results: Array<{ bookingId: string; action: string; refundStatus: string }> = [];

  // Collect booking IDs that have an active late_capture_ record so the
  // booking-level loop can skip them (the late_capture_ sub-loop handles those
  // to avoid double-refund from two independent Tap calls for the same charge).
  const bookingIdsWithActiveLC = new Set(
    lcPendingSnap.docs.map((d) => d.data()["bookingId"] as string),
  );

  // ----- Booking-level loop: regular refunds --------------------------------
  for (const doc of [...pendingSnap.docs, ...processingSnap.docs]) {
    const bookingId = doc.id;
    const d = doc.data();
    const refundStatus = str(d["refundStatus"]);
    const tapChargeId = str(d["tapChargeId"]) || null;

    // Skip bookings that have an active late_capture_ refund record — those
    // are processed exclusively in the late_capture_ sub-loop below.
    if (bookingIdsWithActiveLC.has(bookingId)) {
      results.push({ bookingId, action: "skipped_has_active_late_capture", refundStatus });
      continue;
    }

    if (refundStatus === "pending") {
      const { tapRefundId, refundStatus: newStatus } = await attemptTapRefund(
        tapSecret, bookingId, tapChargeId, Number(d["refundAmount"] ?? 0),
        // Include charge ID so admin-sync retries use the same key as the
        // original cancellation attempt (Audit v4 H-7).
        `refund_${bookingId}_${tapChargeId ?? ""}`, req.log,
      );
      if (tapRefundId) {
        await adminDb.collection("bookings").doc(bookingId).update({
          tapRefundId, refundStatus: newStatus, updatedAt: new Date().toISOString(),
        });
        results.push({ bookingId, action: "retried", refundStatus: newStatus });
      } else {
        results.push({ bookingId, action: "retry_failed", refundStatus: "pending" });
      }
    } else if (refundStatus === "processing") {
      const tapRefundId = str(d["tapRefundId"]);
      if (!tapRefundId) {
        results.push({ bookingId, action: "poll_skipped_no_refund_id", refundStatus });
        continue;
      }
      try {
        const pollRes = await fetch(
          `https://api.tap.company/v2/refunds/${encodeURIComponent(tapRefundId)}`,
          { headers: { Authorization: `Bearer ${tapSecret}` } },
        );
        if (!pollRes.ok) {
          results.push({ bookingId, action: "poll_failed", refundStatus });
          continue;
        }
        const pollData = (await pollRes.json().catch(() => ({}))) as Record<string, unknown>;
        const tapStatus = String(pollData["status"] ?? "").toUpperCase();
        if (tapStatus === "CAPTURED") {
          await markRefundCompleted(adminDb, bookingId, tapRefundId, req.log);
          results.push({ bookingId, action: "completed", refundStatus: "refunded" });
        } else {
          results.push({ bookingId, action: "still_processing", refundStatus });
        }
      } catch (pollErr) {
        req.log.error({ pollErr, bookingId, tapRefundId }, "admin/refunds/sync: poll threw");
        results.push({ bookingId, action: "poll_failed", refundStatus });
      }
    }
  }

  // ----- Late-capture sub-loop ---------------------------------------------
  for (const lcDoc of lcPendingSnap.docs) {
    const lcData = lcDoc.data();
    const bookingId = str(lcData["bookingId"]);
    const tapChargeId = str(lcData["tapChargeId"]) || null;
    const lcRefundStatus = str(lcData["refundStatus"]);
    const pseudoId = `late_capture_${bookingId}`;

    const { tapRefundId, refundStatus: newStatus } = await attemptTapRefund(
      tapSecret, bookingId, tapChargeId,
      Number(lcData["refundAmountBHD"] ?? lcData["refundAmount"] ?? 0),
      `late_capture_refund_${tapChargeId ?? bookingId}`, req.log,
    );
    if (tapRefundId) {
      await Promise.all([
        adminDb.collection("refunds").doc(lcDoc.id).update({
          tapRefundId, refundStatus: newStatus, updatedAt: new Date().toISOString(),
        }),
        adminDb.collection("bookings").doc(bookingId).set(
          { tapRefundId, refundStatus: newStatus, updatedAt: new Date().toISOString() },
          { merge: true },
        ),
      ]);
      results.push({ bookingId: pseudoId, action: "retried", refundStatus: newStatus });
    } else {
      results.push({ bookingId: pseudoId, action: "retry_failed", refundStatus: lcRefundStatus });
    }
  }

  res.json({ success: true, processed: results.length, results });
  } catch (syncErr) {
    req.log.error({ syncErr }, "admin/refunds/sync: unexpected error");
    res.status(500).json({ success: false, error: "Refund sync failed" });
  }
});

// ---------------------------------------------------------------------------
// Guest: list own disputes (so guests can see resolution status)
// ---------------------------------------------------------------------------
router.get("/sahra/my-disputes", requireAuth, async (req, res) => {
  try {
    const adminDb = getAdminFirestore();
    // No composite index on disputes (userId + createdAt) — filter by owner
    // only and sort in memory. A single guest files few disputes.
    const snapshot = await adminDb
      .collection("disputes")
      .where("userId", "==", req.uid!)
      .limit(50)
      .get();
    const disputes = snapshot.docs.map((d) => {
      const data = d.data();
      // Only expose what the guest needs — never leak adminNote
      return {
        id: d.id,
        bookingId: String(data["bookingId"] ?? ""),
        type: String(data["type"] ?? "other"),
        status: data["status"] === "resolved" ? "resolved" : "open",
        createdAt: data["createdAt"] != null ? String(data["createdAt"]) : undefined,
        resolvedAt: data["resolvedAt"] != null ? String(data["resolvedAt"]) : undefined,
      };
    });
    disputes.sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")));
    res.json({ success: true, disputes });
  } catch (err) {
    req.log.error({ err }, "Failed to list guest disputes");
    res.status(500).json({ success: false, error: "Failed to load disputes" });
  }
});

// ---------------------------------------------------------------------------
// Admin: list refund records
// ---------------------------------------------------------------------------
router.get("/admin/refunds", requireAuth, async (req, res) => {
  try {
    const adminDb = getAdminFirestore();
    const callerSnap = await adminDb.collection("users").doc(req.uid!).get();
    const callerData = callerSnap.exists ? callerSnap.data()! : {};
    if (callerData["isAdmin"] !== true && callerData["role"] !== "admin") {
      res.status(403).json({ success: false, error: "Admin only" });
      return;
    }
    const snapshot = await adminDb.collection("refunds").orderBy("createdAt", "desc").limit(200).get();
    const refunds = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    res.json({ success: true, refunds });
  } catch (err) {
    req.log.error({ err }, "Failed to list refunds");
    res.status(500).json({ success: false, error: "Failed to list refunds" });
  }
});

// ---------------------------------------------------------------------------
// Admin: update a refund record status with safety guards.
// ---------------------------------------------------------------------------
router.post("/admin/refunds/:refundId/status", requireAuth, async (req, res) => {
  const { refundId } = req.params as { refundId: string };
  if (!refundId) { res.status(400).json({ success: false, error: "Missing refundId" }); return; }
  const body = (req.body ?? {}) as Record<string, unknown>;
  const requestedStatus = typeof body["status"] === "string" ? body["status"] : "";
  const adminNotes = typeof body["adminNotes"] === "string" ? body["adminNotes"].trim() : undefined;
  const manualSettlementConfirmed = body["manualSettlementConfirmed"] === true;
  if (!new Set(["pending","processing","refunded","failed","failed_will_retry","not_applicable"]).has(requestedStatus)) {
    res.status(400).json({ success: false, error: `Invalid status '${requestedStatus}'` }); return;
  }
  try {
    const adminDb = getAdminFirestore();
    const tapSecret = process.env["TAP_SECRET_KEY"];
    const callerSnap = await adminDb.collection("users").doc(req.uid!).get();
    const callerData = callerSnap.exists ? callerSnap.data()! : {};
    if (callerData["isAdmin"] !== true && callerData["role"] !== "admin") {
      res.status(403).json({ success: false, error: "Admin only" }); return;
    }
    const refundRef = adminDb.collection("refunds").doc(refundId);
    const refundSnap = await refundRef.get();
    if (!refundSnap.exists) { res.status(404).json({ success: false, error: "Refund record not found" }); return; }
    const refundData = refundSnap.data()!;
    const now = new Date().toISOString();
    const bookingIdForSync = str(refundData["bookingId"]);
    const currentStatus = str(refundData["refundStatus"] ?? refundData["status"] ?? "");
    const existingTapRefundId = typeof refundData["tapRefundId"] === "string" ? refundData["tapRefundId"] : "";
    const existingTapChargeId = typeof refundData["tapChargeId"] === "string" ? refundData["tapChargeId"] : "";
    // Terminal-state guard
    if (new Set(["refunded", "not_applicable"]).has(currentStatus)) {
      res.status(422).json({ success: false, error: `Refund is in terminal state '${currentStatus}' and cannot be updated.` }); return;
    }
    // 'refunded' path
    if (requestedStatus === "refunded") {
      if (existingTapRefundId) {
        if (!tapSecret) { res.status(500).json({ success: false, error: "TAP_SECRET_KEY not configured." }); return; }
        let tapStatus = "";
        try {
          const r = await fetch(`https://api.tap.company/v2/refunds/${encodeURIComponent(existingTapRefundId)}`, { headers: { Authorization: `Bearer ${tapSecret}` } });
          const d = (await r.json().catch(() => ({}))) as Record<string, unknown>;
          tapStatus = String(d["status"] ?? "").toUpperCase();
        } catch (e) { req.log.warn({ e }, "Tap refund lookup threw"); res.status(502).json({ success: false, error: "Network error verifying refund with Tap." }); return; }
        if (!new Set(["CAPTURED","SUCCEEDED","REFUNDED"]).has(tapStatus)) {
          res.status(422).json({ success: false, error: `Tap refund has status '${tapStatus}' — not yet settled.` }); return;
        }
      } else {
        if (!manualSettlementConfirmed || !adminNotes) {
          res.status(422).json({ success: false, error: "No Tap refund ID. Send manualSettlementConfirmed:true with non-empty adminNotes." }); return;
        }
        if (Number(refundData["refundAmountBHD"] ?? 0) <= 0) {
          res.status(422).json({ success: false, error: "Manual settlement not permitted for zero-amount records." }); return;
        }
        if (str(refundData["paymentMethod"] ?? "") === "cash_on_arrival") {
          res.status(422).json({ success: false, error: "Manual settlement not applicable for cash-on-arrival." }); return;
        }
      }
    }
    // Retry path
    const needsTapRetry = requestedStatus === "processing" && !existingTapRefundId && Boolean(existingTapChargeId);
    if (needsTapRetry && !tapSecret) {
      res.status(500).json({ success: false, error: "TAP_SECRET_KEY not configured — cannot initiate Tap refund retry." }); return;
    }
    if (needsTapRetry && tapSecret) {
      const refundAmountBHD = Number(refundData["refundAmountBHD"] ?? 0);
      if (!bookingIdForSync || refundAmountBHD <= 0) {
        res.status(422).json({ success: false, error: "Cannot retry: missing bookingId or refundAmountBHD" }); return;
      }
      let tapRetryId: string | null = null;
      let tapRetryStatus = "";
      let failed = false;
      let failDetail = "";
      try {
        const tapRes = await fetch("https://api.tap.company/v2/refunds", {
          method: "POST",
          headers: { Authorization: `Bearer ${tapSecret}`, "Content-Type": "application/json", "Idempotency-Key": `refund_${bookingIdForSync}` },
          body: JSON.stringify({ charge_id: existingTapChargeId, amount: Number(refundAmountBHD.toFixed(3)), currency: "BHD", reason: "requested_by_customer", metadata: { bookingId: bookingIdForSync, retriedByAdmin: req.uid } }),
        });
        const tapData = (await tapRes.json().catch(() => ({}))) as Record<string, unknown>;
        if (tapRes.ok && typeof tapData["id"] === "string") {
          tapRetryId = tapData["id"];
          tapRetryStatus = String(tapData["status"] ?? "").toUpperCase();
        } else { failed = true; failDetail = String(tapData["message"] ?? "") || `HTTP ${tapRes.status}`; }
      } catch (e) { failed = true; failDetail = e instanceof Error ? e.message : "Network error"; }
      if (failed) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await refundRef.update({ refundStatus: "failed_will_retry", updatedAt: now, ...(adminNotes !== undefined ? { adminNotes } : {}) } as Record<string, any>);
        if (bookingIdForSync) await adminDb.collection("bookings").doc(bookingIdForSync).update({ refundStatus: "failed_will_retry", updatedAt: now }).catch(() => {});
        res.status(502).json({ success: false, error: `Tap call failed — set to failed_will_retry. ${failDetail}`.trim() }); return;
      }
      const finalStatus = tapRetryStatus === "CAPTURED" ? "refunded" : "processing";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await refundRef.update({ refundStatus: finalStatus, tapRefundId: tapRetryId, updatedAt: now, ...(finalStatus === "refunded" ? { completedAt: now } : {}), ...(adminNotes !== undefined ? { adminNotes } : {}) } as Record<string, any>);
      if (bookingIdForSync) await adminDb.collection("bookings").doc(bookingIdForSync).update({ refundStatus: finalStatus, tapRefundId: tapRetryId, updatedAt: now }).catch(() => {});
      res.json({ success: true, tapRetryId, refundStatus: finalStatus }); return;
    }
    // Plain write
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: Record<string, any> = { refundStatus: requestedStatus, updatedAt: now, ...(requestedStatus === "refunded" ? { completedAt: now } : {}), ...(adminNotes !== undefined ? { adminNotes } : {}), ...(requestedStatus === "refunded" && manualSettlementConfirmed && !existingTapRefundId ? { manuallySettledBy: req.uid, manuallySettledAt: now } : {}) };
    await refundRef.update(updates);
    if (bookingIdForSync) await adminDb.collection("bookings").doc(bookingIdForSync).update({ refundStatus: requestedStatus, updatedAt: now }).catch((e) => req.log.warn({ e }, "Failed to sync refundStatus"));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err, refundId }, "Failed to update refund status");
    res.status(500).json({ success: false, error: "Failed to update refund status" });
  }
});

// ---------------------------------------------------------------------------
// Host accept — host confirms a pending cash-on-arrival booking.
// Replaces the direct client-side status write (Audit v4 C-3): booking read,
// camp-ownership verification, state validation, availability-conflict
// re-check, and the status write all happen inside one Admin SDK transaction
// so a concurrent guest cancellation or a competing booking cannot race the
// acceptance.
// ---------------------------------------------------------------------------
router.post("/bookings/:bookingId/accept", requireAuth, async (req, res) => {
  const { bookingId } = req.params as { bookingId: string };
  if (!bookingId) {
    res.status(400).json({ success: false, error: "Missing bookingId" });
    return;
  }

  try {
    const adminDb = getAdminFirestore();

    type AcceptOutcome =
      | "ok"
      | "already_confirmed"
      | "not_found"
      | "no_camp"
      | "not_host"
      | "not_cash"
      | "not_pending"
      | "slot_conflict";
    let outcome: AcceptOutcome = "ok";

    await adminDb.runTransaction(async (tx) => {
      const bookingRef = adminDb.collection("bookings").doc(bookingId);
      const bookingSnap = await tx.get(bookingRef);

      if (!bookingSnap.exists) {
        outcome = "not_found";
        return;
      }
      const d = bookingSnap.data()!;

      // Authoritative hostId comes from the camp document, not the booking.
      const campId = str(d["campId"]);
      if (!campId) {
        outcome = "no_camp";
        return;
      }
      const campSnap = await tx.get(adminDb.collection("camps").doc(campId));
      if (!campSnap.exists || str(campSnap.data()!["hostId"]) !== req.uid) {
        outcome = "not_host";
        return;
      }

      // Idempotent: already confirmed → success without re-writing.
      // Checked after ownership so callers cannot probe others' bookings.
      if (str(d["status"]) === "confirmed") {
        outcome = "already_confirmed";
        return;
      }

      // Only pending cash-on-arrival bookings are host-acceptable; online
      // payments are confirmed by the payment webhook, never by the host.
      if (str(d["paymentMethod"]) !== "cash_on_arrival") {
        outcome = "not_cash";
        return;
      }
      if (str(d["status"]) !== "pending") {
        outcome = "not_pending";
        return;
      }

      // Availability conflict re-check at the moment of acceptance: an
      // existing lock must point at THIS booking. A missing lock is a conflict
      // too; confirming without it would let a later booking claim the date.
      const checkInDate = str(d["checkInDate"]);
      if (!checkInDate) {
        outcome = "slot_conflict";
        return;
      }
      const lockSnap = await tx.get(
        adminDb.collection("availabilityLocks").doc(`${campId}_${checkInDate}`),
      );
      const lockData = lockSnap.exists
        ? (lockSnap.data() as Record<string, unknown>)
        : null;
      if (!hasMatchingAvailabilityLock(lockData, bookingId)) {
        outcome = "slot_conflict";
        return;
      }

      tx.update(bookingRef, {
        status: "confirmed",
        updatedAt: new Date().toISOString(),
      });
    });

    if (outcome === "ok" || outcome === "already_confirmed") {
      if (outcome === "ok") {
        req.log.info({ bookingId, hostId: req.uid }, "Host accepted booking");
      }
      res.json({ success: true });
      return;
    }
    if (outcome === "not_found") {
      res.status(404).json({ success: false, error: "Booking not found" });
      return;
    }
    if (outcome === "no_camp") {
      res.status(422).json({ success: false, error: "Booking has no campId" });
      return;
    }
    if (outcome === "not_host") {
      res.status(403).json({ success: false, error: "Not your booking" });
      return;
    }
    if (outcome === "not_cash") {
      res.status(409).json({
        success: false,
        error: "Only cash-on-arrival bookings can be accepted by the host",
      });
      return;
    }
    if (outcome === "not_pending") {
      res.status(409).json({ success: false, error: "Booking is not pending" });
      return;
    }
    // slot_conflict
    res.status(409).json({
      success: false,
      error: "This date has been rebooked by another guest — the slot is no longer available",
    });
  } catch (err) {
    req.log.error({ err, bookingId }, "Failed to accept booking");
    res.status(500).json({ success: false, error: "Failed to accept booking" });
  }
});

// ---------------------------------------------------------------------------
// Collect cash — host marks a confirmed cash-on-arrival booking as collected
// (auth required — booking, camp ownership, and state all read and written
//  inside a single Admin SDK transaction to prevent TOCTOU races)
// ---------------------------------------------------------------------------
router.post("/bookings/:bookingId/collect-cash", requireAuth, async (req, res) => {
  const { bookingId } = req.params as { bookingId: string };
  if (!bookingId) {
    res.status(400).json({ success: false, error: "Missing bookingId" });
    return;
  }

  try {
    const adminDb = getAdminFirestore();

    type CollectOutcome =
      | "ok"
      | "already_collected"
      | "not_found"
      | "no_camp"
      | "not_host"
      | "not_cash"
      | "not_confirmed"
      | "bad_payment_state";
    let outcome: CollectOutcome = "ok";

    // Booking read, camp ownership verification, state validation, and write
    // all happen inside one Admin SDK transaction so that a concurrent host
    // ownership transfer or guest cancellation cannot race the authorization
    // check and the state write.
    await adminDb.runTransaction(async (tx) => {
      const bookingRef = adminDb.collection("bookings").doc(bookingId);
      const bookingSnap = await tx.get(bookingRef);

      if (!bookingSnap.exists) {
        outcome = "not_found";
        return;
      }
      const d = bookingSnap.data()!;

      // Load the camp within the same transaction to get the authoritative hostId.
      // Ownership must be verified before any state is disclosed to the caller.
      const campId = str(d["campId"]);
      if (!campId) {
        outcome = "no_camp";
        return;
      }
      const campRef = adminDb.collection("camps").doc(campId);
      const campSnap = await tx.get(campRef);
      if (!campSnap.exists || str(campSnap.data()!["hostId"]) !== req.uid) {
        outcome = "not_host";
        return;
      }

      // Idempotent: already collected → signal success without re-writing.
      // Checked after ownership so callers cannot probe collection state for
      // bookings that don't belong to them.
      if (str(d["paymentStatus"]) === "cash_collected") {
        outcome = "already_collected";
        return;
      }

      // Must be a cash-on-arrival booking.
      if (str(d["paymentMethod"]) !== "cash_on_arrival") {
        outcome = "not_cash";
        return;
      }

      // Booking must be confirmed (not cancelled, not still pending).
      if (str(d["status"]) !== "confirmed") {
        outcome = "not_confirmed";
        return;
      }

      // Payment must be in an uncollectable state (absent or pending).
      // Reject paid, refunded, failed — overwriting these would corrupt
      // financial records.
      const ps = str(d["paymentStatus"]);
      if (ps !== "" && ps !== "pending") {
        outcome = "bad_payment_state";
        return;
      }

      tx.update(bookingRef, {
        paymentStatus: "cash_collected",
        collectedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });

    if (outcome === "ok") {
      req.log.info({ bookingId, hostId: req.uid }, "Cash collected for booking");
      res.json({ success: true });
      return;
    }
    // Idempotent: a second collect on an already-collected booking is a no-op success.
    if (outcome === "already_collected") {
      res.json({ success: true });
      return;
    }
    if (outcome === "not_found") {
      res.status(404).json({ success: false, error: "Booking not found" });
      return;
    }
    if (outcome === "no_camp") {
      res.status(422).json({ success: false, error: "Booking has no campId" });
      return;
    }
    if (outcome === "not_host") {
      res.status(403).json({ success: false, error: "Not your booking" });
      return;
    }
    if (outcome === "not_cash") {
      res.status(409).json({ success: false, error: "Booking is not a cash-on-arrival booking" });
      return;
    }
    if (outcome === "not_confirmed") {
      res.status(409).json({ success: false, error: "Booking is not confirmed" });
      return;
    }
    // bad_payment_state
    res.status(409).json({ success: false, error: "Booking payment is in a non-collectable state" });
  } catch (err) {
    req.log.error({ err, bookingId }, "Failed to collect cash for booking");
    res.status(500).json({ success: false, error: "Failed to update booking" });
  }
});

// ---------------------------------------------------------------------------
// Guest dispute / "report an issue" endpoint.
//
// MVP structured report path (v4 audit trust gap): a guest with a past,
// non-cancelled booking files a typed report. The server verifies booking
// ownership, writes a `disputes` document with the Admin SDK (the collection
// is intentionally absent from Firestore rules — clients can never read or
// write it directly), and alerts the team by email (best effort).
// ---------------------------------------------------------------------------
router.post("/sahra/dispute", requireAuth, async (req, res) => {
  const parsed = parseBody(DisputeBody, req.body, res);
  if (!parsed) return;
  const description = parsed.description.trim();
  if (!description) {
    res.status(400).json({ success: false, error: "Description is required" });
    return;
  }

  try {
    const adminDb = getAdminFirestore();
    const bookingSnap = await adminDb
      .collection("bookings")
      .doc(parsed.bookingId)
      .get();
    if (!bookingSnap.exists) {
      res.status(404).json({ success: false, error: "Booking not found" });
      return;
    }
    const b = bookingSnap.data()!;

    // Only the guest who made the booking may report an issue with it.
    if (str(b["userId"]) !== req.uid) {
      res.status(403).json({ success: false, error: "Not your booking" });
      return;
    }
    if (str(b["status"]) === "cancelled") {
      res.status(400).json({
        success: false,
        error: "Issues can only be reported for completed stays",
      });
      return;
    }
    // The stay must be over. Mirrors the clients' departure-date semantics
    // (lib/bookingDates): `checkOutDate === checkInDate` by the single-day
    // convention, the `checkOut` datetime ("YYYY-MM-DD HH:mm") carries the
    // real departure day, and a missing checkout rolls check-in forward one
    // day. A booking is "past" when its departure day is before today.
    const DAY_MS = 86_400_000;
    const parseDateOnly = (s: unknown): Date | null => {
      if (typeof s !== "string" || !s) return null;
      const d = new Date(s.slice(0, 10));
      return Number.isNaN(d.getTime()) ? null : d;
    };
    const checkIn = parseDateOnly(b["checkInDate"]);
    let departure: Date;
    const fromDatetime = parseDateOnly(b["checkOut"]);
    const stored = parseDateOnly(b["checkOutDate"]);
    if (fromDatetime && (!checkIn || fromDatetime.getTime() > checkIn.getTime())) {
      departure = fromDatetime;
    } else if (stored && checkIn && stored.getTime() > checkIn.getTime()) {
      departure = stored;
    } else {
      departure = new Date((checkIn ?? stored ?? new Date()).getTime() + DAY_MS);
    }
    departure.setHours(0, 0, 0, 0);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    if (departure >= startOfToday) {
      res.status(400).json({
        success: false,
        error: "Issues can only be reported for completed stays",
      });
      return;
    }

    // Duplicate guard: reject if an open dispute for this booking+user already
    // exists to prevent repeated taps from flooding the team inbox.
    const existingDispute = await adminDb
      .collection("disputes")
      .where("bookingId", "==", parsed.bookingId)
      .where("userId", "==", req.uid)
      .where("status", "==", "open")
      .limit(1)
      .get();
    if (!existingDispute.empty) {
      res.status(409).json({ success: false, error: "already_reported" });
      return;
    }

    const disputeDoc: Record<string, unknown> = {
      bookingId: parsed.bookingId,
      userId: req.uid,
      campId: str(b["campId"]),
      type: parsed.type,
      description,
      createdAt: new Date().toISOString(),
      status: "open",
    };
    if (parsed.photoUrl) disputeDoc["photoUrl"] = parsed.photoUrl;

    // Use a deterministic document ID so that two simultaneous first-reports
    // for the same booking+user can't both slip through the query-before-write
    // guard above. Firestore's create() is atomic: if the document already
    // exists it throws ALREADY_EXISTS and we return 409.
    const disputeDocId = `${parsed.bookingId}_${req.uid}`;
    const ref = adminDb.collection("disputes").doc(disputeDocId);
    try {
      await ref.create(disputeDoc);
    } catch (createErr: unknown) {
      const code =
        createErr &&
        typeof createErr === "object" &&
        "code" in createErr &&
        (createErr as { code: unknown }).code;
      if (code === 6 || code === "ALREADY_EXISTS") {
        res.status(409).json({ success: false, error: "already_reported" });
        return;
      }
      throw createErr;
    }

    // Best-effort team alert — a failed email must not fail the report.
    try {
      const alertTo = process.env["TEAM_ALERT_EMAIL"] || "support@mukhymat.com";
      const typeLabels: Record<string, string> = {
        not_as_described: "Camp not as described",
        missing_amenity: "Missing amenity",
        safety_concern: "Safety concern",
        other: "Other issue",
      };
      const campName = str(b["campTitle"]) || str(b["campName"]) || str(b["campId"]);
      const html =
        `<h2>New guest dispute (${escapeHtml(typeLabels[parsed.type] ?? parsed.type)})</h2>` +
        `<p><strong>Dispute ID:</strong> ${escapeHtml(ref.id)}</p>` +
        `<p><strong>Booking:</strong> ${escapeHtml(parsed.bookingId)}</p>` +
        `<p><strong>Camp:</strong> ${escapeHtml(campName)}</p>` +
        `<p><strong>Guest:</strong> ${escapeHtml(str(b["userName"]) || "Guest")} (${escapeHtml(req.userEmail ?? req.uid ?? "")})</p>` +
        `<p><strong>Check-in:</strong> ${escapeHtml(str(b["checkInDate"]))}</p>` +
        `<p><strong>Description:</strong></p>` +
        `<p>${escapeHtml(description).replace(/\n/g, "<br/>")}</p>` +
        (parsed.photoUrl
          ? `<p><strong>Photo:</strong> <a href="${escapeHtml(parsed.photoUrl)}">${escapeHtml(parsed.photoUrl)}</a></p>`
          : "");
      const emailResult = await sendEmail(
        alertTo,
        `[Dispute] ${typeLabels[parsed.type] ?? parsed.type} — booking ${parsed.bookingId}`,
        html,
      );
      if (!emailResult.ok) {
        req.log.warn({ error: emailResult.error, disputeId: ref.id }, "Dispute alert email failed");
      }
    } catch (emailErr) {
      req.log.warn({ err: emailErr }, "Dispute alert email threw");
    }

    res.json({ success: true, disputeId: ref.id });
  } catch (err) {
    req.log.error({ err }, "Dispute endpoint: unhandled error");
    res.status(500).json({ success: false, error: "Failed to submit report" });
  }
});

// ---------------------------------------------------------------------------
// Internal sweep endpoint — expires unpaid bookings whose payment window has
// passed and releases their availability slots.
//
// Protected by a shared secret in the X-Sweep-Secret header so it can be
// called from a cron job or admin script without requiring Firebase auth.
// Set INTERNAL_SWEEP_SECRET in the server environment; if the variable is
// absent the endpoint is disabled (returns 503) to avoid an open trigger.
// ---------------------------------------------------------------------------
router.post("/internal/sweep/expired-bookings", async (req, res) => {
  const sweepSecret = process.env["INTERNAL_SWEEP_SECRET"];
  if (!sweepSecret) {
    res.status(503).json({
      success: false,
      error: "INTERNAL_SWEEP_SECRET not configured — endpoint disabled",
    });
    return;
  }

  const provided = req.headers["x-sweep-secret"];
  if (typeof provided !== "string" || provided !== sweepSecret) {
    res.status(401).json({ success: false, error: "Invalid or missing X-Sweep-Secret header" });
    return;
  }

  try {
    const result = await sweepExpiredBookings();
    req.log.info(result, "Manual sweep triggered via endpoint");
    res.json({ success: true, ...result });
  } catch (err) {
    req.log.error({ err }, "Manual sweep endpoint: unhandled error");
    res.status(500).json({ success: false, error: "Sweep failed — see server logs" });
  }
});

// ---------------------------------------------------------------------------
// Admin: atomically decide host/seller applications and grant the matching role.
// Notifications are deliberately kept out of this transaction and are sent by
// the caller only after the authoritative commit succeeds.
// ---------------------------------------------------------------------------
router.post("/admin/applications/:kind/:applicationId/decision", requireAuth, async (req, res) => {
  const kind = typeof req.params["kind"] === "string" ? req.params["kind"] : "";
  const applicationId = typeof req.params["applicationId"] === "string" ? req.params["applicationId"] : "";
  if (!["host", "seller"].includes(kind) || !applicationId) {
    res.status(400).json({ success: false, error: "Invalid application" });
    return;
  }
  const parsed = parseBody(AdminApplicationDecisionBody, req.body, res);
  if (!parsed) return;
  if (parsed.decision === "rejected" && !parsed.rejectionReason) {
    res.status(400).json({ success: false, error: "A rejection reason is required" });
    return;
  }
  try {
    const adminDb = getAdminFirestore();
    const caller = await adminDb.collection("users").doc(req.uid!).get();
    if (!caller.exists || caller.data()?.["isAdmin"] !== true) {
      res.status(403).json({ success: false, error: "Admin access required" });
      return;
    }
    const applicationRef = adminDb.collection(kind === "host" ? "hostApplications" : "sellerApplications").doc(applicationId);
    const application = await applicationRef.get();
    if (!application.exists) {
      res.status(404).json({ success: false, error: "Application not found" });
      return;
    }
    const data = application.data() ?? {};
    const userId = typeof data["userId"] === "string" ? data["userId"] : "";
    if (!userId) {
      res.status(422).json({ success: false, error: "Application has no applicant" });
      return;
    }
    const userRef = adminDb.collection("users").doc(userId);
    const now = new Date().toISOString();
    const roleField = kind === "host" ? "isHost" : "isSeller";
    const applicationStatus = parsed.decision === "approved" ? "approved" : "rejected";
    await adminDb.runTransaction(async (tx) => {
      const latest = await tx.get(applicationRef);
      if (!latest.exists) throw new Error("Application not found");
      const latestData = latest.data() ?? {};
      if (["approved", "rejected"].includes(String(latestData["status"] ?? latestData["applicationStatus"]))) {
        throw new Error("Application has already been decided");
      }
      // Approval grants the matching role. Rejection must not revoke a role
      // the applicant may already hold independently (for example, a host
      // applying to become a seller). Role removal belongs to a separate,
      // explicitly authorized moderation workflow.
      if (parsed.decision === "approved") {
        tx.update(userRef, { [roleField]: true });
      }
      tx.update(applicationRef, {
        status: applicationStatus,
        applicationStatus,
        reviewedBy: req.uid,
        reviewedAt: now,
        ...(parsed.decision === "rejected" ? { rejectionReason: parsed.rejectionReason } : {}),
      });
    });
    res.json({ success: true, applicationId, kind, decision: parsed.decision, userId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to decide application";
    res.status(message.includes("already") ? 409 : 500).json({ success: false, error: message });
  }
});

// ---------------------------------------------------------------------------
// Admin: list disputes.
// ---------------------------------------------------------------------------
router.get("/admin/disputes", requireAuth, async (req, res) => {
  try {
    const adminDb = getAdminFirestore();
    const callerSnap = await adminDb.collection("users").doc(req.uid!).get();
    const callerData = callerSnap.exists ? callerSnap.data()! : {};
    if (callerData["isAdmin"] !== true && callerData["role"] !== "admin") {
      res.status(403).json({ success: false, error: "Admin only" });
      return;
    }
    // No composite index on disputes — always fetch all records ordered by
    // createdAt (single-field index, auto-provisioned by Firestore) and let
    // the client filter by status. Admin volume is low enough for 200-record
    // client-side filtering to be fast and safe.
    const snapshot = await adminDb
      .collection("disputes")
      .orderBy("createdAt", "desc")
      .limit(200)
      .get();
    const disputes = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    res.json({ success: true, disputes });
  } catch (err) {
    req.log.error({ err }, "Failed to list disputes");
    res.status(500).json({ success: false, error: "Failed to list disputes" });
  }
});

// ---------------------------------------------------------------------------
// Admin: resolve a dispute.
// ---------------------------------------------------------------------------
router.post("/admin/disputes/:disputeId/resolve", requireAuth, async (req, res) => {
  const { disputeId } = req.params as { disputeId: string };
  if (!disputeId) {
    res.status(400).json({ success: false, error: "Missing disputeId" });
    return;
  }
  try {
    const adminDb = getAdminFirestore();
    const callerSnap = await adminDb.collection("users").doc(req.uid!).get();
    const callerData = callerSnap.exists ? callerSnap.data()! : {};
    if (callerData["isAdmin"] !== true && callerData["role"] !== "admin") {
      res.status(403).json({ success: false, error: "Admin only" });
      return;
    }
    const disputeRef = adminDb.collection("disputes").doc(disputeId);
    const disputeSnap = await disputeRef.get();
    if (!disputeSnap.exists) {
      res.status(404).json({ success: false, error: "Dispute not found" });
      return;
    }
    if (disputeSnap.data()!["status"] === "resolved") {
      res.status(422).json({ success: false, error: "Dispute is already resolved" });
      return;
    }
    const body = (req.body ?? {}) as Record<string, unknown>;
    const adminNote = typeof body["adminNote"] === "string" ? body["adminNote"].trim().slice(0, 1000) : undefined;
    await disputeRef.update({
      status: "resolved",
      resolvedAt: new Date().toISOString(),
      resolvedBy: req.uid,
      ...(adminNote ? { adminNote } : {}),
    });
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to resolve dispute");
    res.status(500).json({ success: false, error: "Failed to resolve dispute" });
  }
});

export default router;
