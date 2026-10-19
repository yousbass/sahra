// Server-side email templates. All values interpolated here come from
// Firestore documents read server-side; nothing is client-supplied HTML.

export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const e = escapeHtml;

function shell(headerTitle: string, bodyHtml: string): string {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#FDFBF7;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:24px;">
    <div style="background:#0A1128;border-radius:12px 12px 0 0;padding:20px 24px;">
      <div style="color:#F0A03C;font-size:18px;font-weight:bold;letter-spacing:1px;">MUKHYMAT</div>
      <div style="color:#ffffff;font-size:20px;font-weight:bold;margin-top:8px;">${e(headerTitle)}</div>
    </div>
    <div style="background:#ffffff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;padding:20px 24px;">
      ${bodyHtml}
    </div>
  </div>
</body></html>`;
}

function detailTable(rows: [string, string][]): string {
  const rowsHtml = rows
    .filter(([, v]) => v !== "")
    .map(
      ([k, v]) =>
        `<tr><td style="padding:8px 12px;color:#6b7280;font-size:13px;">${e(k)}</td><td style="padding:8px 12px;color:#0A1128;font-size:13px;font-weight:600;text-align:right;">${e(v)}</td></tr>`,
    )
    .join("");
  return `<table style="width:100%;border-collapse:collapse;background:#FDFBF7;border-radius:8px;">${rowsHtml}</table>`;
}

export interface BookingEmailData {
  bookingId: string;
  campName: string;
  campLocation: string;
  checkInDate: string;
  numberOfGuests: number;
  totalAmount: number;
  guestName: string;
  hostName: string;
  arrivalTime?: string;
  paymentMethod?: string;
  cancellationReason?: string;
}

function bookingRows(d: BookingEmailData): [string, string][] {
  const paymentLabel =
    d.paymentMethod === "cash_on_arrival" ? "Cash on arrival" : "Online payment";
  return [
    ["Booking ID", d.bookingId],
    ["Camp", d.campName],
    ["Location", d.campLocation],
    ["Date", d.checkInDate],
    ["Guests", String(d.numberOfGuests || 1)],
    ["Expected arrival", d.arrivalTime || "—"],
    ["Payment", paymentLabel],
    ["Total", `${Number(d.totalAmount || 0).toFixed(3)} BHD`],
  ];
}

export function bookingConfirmationGuest(d: BookingEmailData): string {
  const body = `<p style="color:#0A1128;font-size:14px;margin:0 0 16px;">Thanks ${e(d.guestName || "Guest")}, here are your booking details for ${e(d.campName || "the camp")}.</p>
      ${detailTable(bookingRows(d))}
      ${
        d.paymentMethod === "cash_on_arrival"
          ? '<p style="color:#0A1128;font-size:13px;margin:16px 0 0;"><strong>Payment:</strong> collected in cash on arrival.</p>'
          : ""
      }`;
  return shell("Your booking is in!", body);
}

export function bookingNotificationHost(d: BookingEmailData): string {
  const body = `<p style="color:#0A1128;font-size:14px;margin:0 0 16px;">${e(d.guestName || "A guest")} just booked ${e(d.campName || "your camp")}.</p>
      ${detailTable(bookingRows(d))}`;
  return shell("New booking received", body);
}

export function cancellationEmail(d: BookingEmailData, forHost: boolean): string {
  const intro = forHost
    ? `A guest has cancelled their booking at <strong>${e(d.campName)}</strong>.`
    : `Your booking at <strong>${e(d.campName)}</strong> has been cancelled.`;
  const footer = forHost
    ? "The date is now available for new bookings."
    : "If you paid for this booking, refunds follow the cancellation policy shown on the listing.";
  const body = `<p style="margin:0 0 20px;color:#4b5563;font-size:14px;">${intro}</p>
      ${detailTable([
        ["Booking ID", d.bookingId],
        ["Camp", d.campName],
        ["Location", d.campLocation],
        ["Date", d.checkInDate],
        ["Guests", String(d.numberOfGuests || 1)],
        ["Total", `${Number(d.totalAmount || 0).toFixed(3)} BHD`],
        ["Reason", d.cancellationReason || ""],
      ])}
      <p style="margin:20px 0 0;color:#6b7280;font-size:12px;">${footer}</p>`;
  return shell("Booking Cancelled", body);
}

export interface ListingEmailData {
  campName: string;
  campLocation?: string;
  hostName: string;
}

const DASHBOARD_URL = "https://www.mukhymat.com/host/dashboard";

function dashboardButton(): string {
  return `<a href="${DASHBOARD_URL}" style="display:inline-block;padding:12px 24px;background:#F0A03C;color:#0A1128;border-radius:6px;text-decoration:none;font-weight:bold;">Go to Dashboard</a>`;
}

export function listingPendingHost(d: ListingEmailData): string {
  const body = `<p style="color:#0A1128;font-size:14px;margin:0 0 12px;">Hi ${e(d.hostName || "Host")},</p>
      <p style="color:#0A1128;font-size:14px;margin:0 0 12px;">Your camp <strong>${e(d.campName)}</strong>${d.campLocation ? ` in ${e(d.campLocation)}` : ""} has been submitted for review. Our team will approve it soon.</p>
      <p style="color:#0A1128;font-size:14px;margin:0 0 16px;">You can check your dashboard for status updates.</p>
      ${dashboardButton()}`;
  return shell("We received your listing!", body);
}

export function listingApprovedHost(d: ListingEmailData): string {
  const body = `<p style="color:#0A1128;font-size:14px;margin:0 0 12px;">Hi ${e(d.hostName || "Host")},</p>
      <p style="color:#0A1128;font-size:14px;margin:0 0 12px;">Great news — your camp <strong>${e(d.campName)}</strong>${d.campLocation ? ` in ${e(d.campLocation)}` : ""} has been approved and is now live on MUKHYMAT.</p>
      <p style="color:#0A1128;font-size:14px;margin:0 0 16px;">Guests can now find and book it. Manage availability and bookings from your dashboard.</p>
      ${dashboardButton()}`;
  return shell("Your listing is live!", body);
}
