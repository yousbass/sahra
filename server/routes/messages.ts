/**
 * POST /api/notifications/new-message
 *
 * Sends an Expo push notification (and optionally an email) when a new
 * message is posted in a booking thread.  Called by the client immediately
 * after writing the message to Firestore.
 *
 * Security model:
 *   - Requires a valid Firebase ID token.
 *   - Caller must be one of the two thread participants (guest or host).
 *   - Recipient is resolved server-side from the thread doc — never trusted
 *     from the request body.
 *   - Best-effort: notification failure never blocks the message write.
 */

import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { verifyFirebaseIdToken } from "../lib/firebaseAuth.js";
import { getAdminFirestore } from "../lib/firestoreAdmin.js";

const router = Router();

const str = (v: unknown): string => (typeof v === "string" ? v : "");

/** Firestore doc ids: non-empty, no slashes, sane length. */
const DocId = z.string().min(1).max(1500).regex(/^[^\\/]+$/);
const NewMessageBody = z.object({
  threadId: DocId,
  messageId: DocId,
});

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
  "/notifications/new-message",
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

    const parsed = NewMessageBody.safeParse(req.body ?? {});
    if (!parsed.success) {
      const message = parsed.error.issues
        .map((i) => `${i.path.join(".") || "body"}: ${i.message}`)
        .join("; ");
      res.status(400).json({ success: false, error: `Validation error: ${message}` });
      return;
    }
    const { threadId, messageId } = parsed.data;

    const adminDb = getAdminFirestore();

    // 2. Verify the specific message exists, the caller is its sender, and it
    //    was written recently (within 60 s) — prevents replay/spam.
    const msgSnap = await adminDb
      .collection("threads")
      .doc(threadId)
      .collection("messages")
      .doc(messageId)
      .get();
    if (!msgSnap.exists) {
      res.status(404).json({ success: false, error: "Message not found" });
      return;
    }
    const msgData = msgSnap.data()!;
    if (str(msgData["senderId"]) !== callerUid) {
      res.status(403).json({ success: false, error: "Not the message sender" });
      return;
    }
    const createdAtRaw = msgData["createdAt"];
    const createdAt =
      createdAtRaw instanceof Date
        ? createdAtRaw
        : typeof createdAtRaw === "string"
        ? new Date(createdAtRaw)
        : createdAtRaw?.toDate?.() ?? new Date(0);
    const ageMs = Date.now() - createdAt.getTime();
    if (ageMs < 0) {
      // Future-dated message — reject to prevent indefinite replay.
      res.json({ success: true, sent: false, reason: "future-dated message" });
      return;
    }
    if (ageMs > 60_000) {
      // Message is older than 60 s — likely a replay attempt.
      res.json({ success: true, sent: false, reason: "stale message" });
      return;
    }

    // 3. Atomically claim notification delivery for this message so a replayed
    //    request cannot spam the recipient's device.  The admin SDK bypasses
    //    client-side rules; this claim is a server-only sentinel field.
    let claimedDelivery = false;
    try {
      await adminDb.runTransaction(async (tx) => {
        const freshSnap = await tx.get(msgSnap.ref);
        if (freshSnap.data()?.["notificationSent"]) {
          // Already delivered — nothing to do.
          return;
        }
        tx.update(msgSnap.ref, { notificationSent: true });
        claimedDelivery = true;
      });
    } catch {
      // Transaction failure is non-fatal — best-effort notification.
      claimedDelivery = true; // let it proceed rather than silently drop
    }
    if (!claimedDelivery) {
      res.json({ success: true, sent: false, reason: "notification already sent" });
      return;
    }

    // 4. Load the thread and verify the caller is a participant.
    const threadSnap = await adminDb.collection("threads").doc(threadId).get();
    if (!threadSnap.exists) {
      res.status(404).json({ success: false, error: "Thread not found" });
      return;
    }

    const thread = threadSnap.data()!;
    const guestId = str(thread["guestId"]);
    const hostId = str(thread["hostId"]);

    if (callerUid !== guestId && callerUid !== hostId) {
      res.status(403).json({ success: false, error: "Not a thread participant" });
      return;
    }

    // 3. Determine the recipient (the other party).
    const recipientId = callerUid === guestId ? hostId : guestId;
    const senderRole = callerUid === guestId ? "guest" : "host";

    // 4. Look up the recipient's push token.
    const recipientSnap = await adminDb.collection("users").doc(recipientId).get();
    if (!recipientSnap.exists) {
      res.json({ success: true, sent: false, reason: "recipient not found" });
      return;
    }

    const pushToken = str(recipientSnap.data()!["expoPushToken"]);
    if (!pushToken || !pushToken.startsWith("ExponentPushToken")) {
      res.json({ success: true, sent: false, reason: "no push token" });
      return;
    }

    // 5. Build a human-friendly notification.
    const campTitle = str(thread["campTitle"]) || "your booking";
    const lastMessage = str(thread["lastMessage"]) || "You have a new message";
    const titleLabel = senderRole === "guest" ? "New message from guest" : "New message from host";
    const bodyText = lastMessage.length > 100
      ? lastMessage.slice(0, 97) + "…"
      : lastMessage;

    const sent = await sendExpoPush({
      to: pushToken,
      title: `${titleLabel} — ${campTitle}`,
      body: bodyText,
      data: { threadId, screen: "messages" },
    });

    req.log.info({ threadId, recipientId, sent }, "New-message push notification");
    res.json({ success: true, sent });
  }
);

export default router;
