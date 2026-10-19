/**
 * POST /api/notifications/host-booking-request
 *
 * Sends an Expo push notification to the host when a new booking request
 * arrives. Called by the mobile app immediately after a booking doc is
 * created with status "pending".
 *
 * Security model:
 *   - Requires a valid Firebase ID token; caller must be the booking's guest.
 *   - Host identity is resolved server-side: booking.campId → camp.hostId.
 *     The client-writable booking.hostId field is never used as the recipient.
 *   - Booking must still be in "pending" status to receive a notification.
 *   - Idempotency: a Firestore transaction sets hostNotifiedAt on the booking
 *     atomically before sending; duplicate calls for the same booking are
 *     silently ignored.
 *   - The host's Expo push token is read from their Firestore user doc and
 *     never exposed to the calling client.
 *
 * The route is best-effort from the caller's perspective: if the push fails or
 * the host has no token the booking itself is unaffected. Callers should
 * fire-and-forget.
 */

import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { verifyFirebaseIdToken } from "../lib/firebaseAuth.js";
import { getAdminFirestore } from "../lib/firestoreAdmin.js";

const router = Router();

const str = (v: unknown): string => (typeof v === "string" ? v : "");

/** Firestore doc id: non-empty, no slashes, sane length. */
const HostBookingRequestBody = z.object({
  bookingId: z.string().min(1).max(1500).regex(/^[^\\/]+$/),
});

/** Send one Expo push notification. Returns true on success. */
async function sendExpoPush(opts: {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}): Promise<boolean> {
  try {
    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: opts.to,
        title: opts.title,
        body: opts.body,
        data: opts.data ?? {},
        sound: "default",
        priority: "high",
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

router.post(
  "/notifications/host-booking-request",
  async (req: Request, res: Response): Promise<void> => {
    // 1. Authenticate the caller.
    const authHeader = req.headers.authorization ?? "";
    const idToken = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (!idToken) {
      res.status(401).json({ success: false, error: "Missing auth token" });
      return;
    }

    let callerUid: string;
    try {
      const verified = await verifyFirebaseIdToken(idToken);
      callerUid = verified.uid;
    } catch {
      res.status(401).json({ success: false, error: "Invalid auth token" });
      return;
    }

    const parsed = HostBookingRequestBody.safeParse(req.body ?? {});
    if (!parsed.success) {
      const message = parsed.error.issues
        .map((i) => `${i.path.join(".") || "body"}: ${i.message}`)
        .join("; ");
      res.status(400).json({ success: false, error: `Validation error: ${message}` });
      return;
    }
    const { bookingId } = parsed.data;

    const adminDb = getAdminFirestore();
    const bookingRef = adminDb.collection("bookings").doc(bookingId);

    // 2. Idempotency + status guard: use a transaction so only one
    //    notification fires per booking, even under concurrent calls.
    let bookingData: FirebaseFirestore.DocumentData;
    let shouldSend = false;

    try {
      await adminDb.runTransaction(async (tx) => {
        const snap = await tx.get(bookingRef);
        if (!snap.exists) throw new Error("not_found");

        const data = snap.data()!;

        // Only the booking's guest may trigger this.
        if (str(data["userId"]) !== callerUid) throw new Error("forbidden");

        // Only send for bookings that are still pending.
        if (str(data["status"]) !== "pending") {
          shouldSend = false;
          bookingData = data;
          return;
        }

        // Idempotency: if we already sent a notification for this booking,
        // return early without sending again.
        if (data["hostNotifiedAt"]) {
          shouldSend = false;
          bookingData = data;
          return;
        }

        // Mark as notified inside the transaction so concurrent calls see it.
        tx.update(bookingRef, { hostNotifiedAt: new Date().toISOString() });
        bookingData = data;
        shouldSend = true;
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg === "not_found") {
        res.status(404).json({ success: false, error: "Booking not found" });
        return;
      }
      if (msg === "forbidden") {
        res.status(403).json({ success: false, error: "Not your booking" });
        return;
      }
      req.log.error({ err, bookingId }, "Notification transaction failed");
      res.status(500).json({ success: false, error: "Internal error" });
      return;
    }

    if (!shouldSend) {
      res.json({ success: true, sent: false, reason: "already_notified_or_not_pending" });
      return;
    }

    // 3. Resolve host server-side via campId → camp.hostId.
    //    Never trust client-supplied booking.hostId as the notification target.
    const campId = str(bookingData!["campId"]);
    if (!campId) {
      res.json({ success: true, sent: false, reason: "no campId" });
      return;
    }

    const campSnap = await adminDb.collection("camps").doc(campId).get();
    if (!campSnap.exists) {
      res.json({ success: true, sent: false, reason: "camp not found" });
      return;
    }

    const trustedHostId = str(campSnap.data()!["hostId"]);
    if (!trustedHostId) {
      res.json({ success: true, sent: false, reason: "camp has no hostId" });
      return;
    }

    // 4. Look up the host's push token from their Firestore user doc.
    const hostSnap = await adminDb.collection("users").doc(trustedHostId).get();
    const pushToken = hostSnap.exists
      ? str(hostSnap.data()!["expoPushToken"])
      : "";

    if (!pushToken || !pushToken.startsWith("ExponentPushToken")) {
      res.json({ success: true, sent: false, reason: "no push token" });
      return;
    }

    // 5. Build a human-friendly notification.
    const campTitle =
      str(bookingData!["campTitle"]) || str(campSnap.data()!["title"]) || "your camp";
    const guestName = str(bookingData!["userName"]) || "A guest";
    const checkIn = str(bookingData!["checkInDate"]);

    const sent = await sendExpoPush({
      to: pushToken,
      title: "New booking request 🏕️",
      body: `${guestName} wants to book ${campTitle}${checkIn ? ` on ${checkIn}` : ""}`,
      data: { bookingId, screen: "host-bookings" },
    });

    req.log.info({ bookingId, trustedHostId, sent }, "Host booking-request push notification");
    res.json({ success: true, sent });
  }
);

// ---------------------------------------------------------------------------
// POST /api/notifications/host-application-decision
//
// Sends an Expo push notification to a mobile user when their host application
// is approved or rejected by an admin.
//
// Security model:
//   - Requires a valid Firebase ID token from an admin (isAdmin === true on
//     their Firestore user doc).
//   - Application's userId is resolved server-side; the client cannot supply
//     a recipient UID directly.
//   - Best-effort: a missing push token or Expo delivery failure is logged
//     but never surfaces as an error to the admin caller.
// ---------------------------------------------------------------------------

const HostApplicationDecisionBody = z.object({
  applicationId: z.string().min(1).max(1500).regex(/^[^\\/]+$/),
  decision: z.enum(["approved", "rejected"]),
  rejectionReason: z.string().max(1000).optional(),
});

router.post(
  "/notifications/host-application-decision",
  async (req: Request, res: Response): Promise<void> => {
    // 1. Authenticate the caller.
    const authHeader = req.headers.authorization ?? "";
    const idToken = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (!idToken) {
      res.status(401).json({ success: false, error: "Missing auth token" });
      return;
    }

    let callerUid: string;
    try {
      const verified = await verifyFirebaseIdToken(idToken);
      callerUid = verified.uid;
    } catch {
      res.status(401).json({ success: false, error: "Invalid auth token" });
      return;
    }

    // 2. Verify the caller is an admin.
    const adminDb = getAdminFirestore();
    const callerSnap = await adminDb.collection("users").doc(callerUid).get();
    if (!callerSnap.exists || !callerSnap.data()?.["isAdmin"]) {
      res.status(403).json({ success: false, error: "Admin only" });
      return;
    }

    // 3. Validate request body.
    const parsed = HostApplicationDecisionBody.safeParse(req.body ?? {});
    if (!parsed.success) {
      const message = parsed.error.issues
        .map((i) => `${i.path.join(".") || "body"}: ${i.message}`)
        .join("; ");
      res.status(400).json({ success: false, error: `Validation error: ${message}` });
      return;
    }
    const { applicationId, decision, rejectionReason } = parsed.data;

    // 4. Resolve the applicant's userId from the application doc.
    const appSnap = await adminDb.collection("hostApplications").doc(applicationId).get();
    if (!appSnap.exists) {
      res.status(404).json({ success: false, error: "Application not found" });
      return;
    }
    const applicantUserId = str(appSnap.data()!["userId"]);
    if (!applicantUserId) {
      res.json({ success: true, sent: false, reason: "application has no userId" });
      return;
    }

    // 5. Look up the applicant's push token from their Firestore user doc.
    const userSnap = await adminDb.collection("users").doc(applicantUserId).get();
    const pushToken = userSnap.exists ? str(userSnap.data()!["expoPushToken"]) : "";

    if (!pushToken || !pushToken.startsWith("ExponentPushToken")) {
      req.log.info({ applicationId, applicantUserId, decision }, "Host application decision — no push token, skipping");
      res.json({ success: true, sent: false, reason: "no push token" });
      return;
    }

    // 6. Build the notification based on the decision.
    let title: string;
    let body: string;
    let screen: string;

    if (decision === "approved") {
      title = "🎉 You're now a host!";
      body = "Your host application has been approved. You can now create your first camp listing.";
      screen = "host-dashboard";
    } else {
      const reason = rejectionReason?.trim();
      title = "Host application update";
      body = reason
        ? `Your application wasn't approved: ${reason}`
        : "Your host application wasn't approved. You're welcome to apply again.";
      screen = "become-host";
    }

    const sent = await sendExpoPush({
      to: pushToken,
      title,
      body,
      data: { applicationId, decision, screen },
    });

    req.log.info({ applicationId, applicantUserId, decision, sent }, "Host application decision push notification");
    res.json({ success: true, sent });
  }
);

export default router;
