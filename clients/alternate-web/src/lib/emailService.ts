import { auth } from './firebase';

// All emails are now sent through a single authenticated API route.
// The server verifies the caller's Firebase ID token, loads the referenced
// booking/camp record itself and derives the recipient + renders the HTML
// server-side — the client no longer supplies recipient addresses or HTML.
const SEND_URL = '/api/emails/send';

type EmailType =
  | 'booking-confirmation'
  | 'booking-notification'
  | 'cancellation-guest'
  | 'cancellation-host'
  | 'listing-pending'
  | 'listing-approved';

async function sendEmail(
  type: EmailType,
  ref: { bookingId?: string; campId?: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    const idToken = await auth?.currentUser?.getIdToken();
    if (!idToken) {
      throw new Error('Not signed in');
    }
    const response = await fetch(SEND_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ type, ...ref }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(result.error || 'Failed to send email');
    }
    return { success: true };
  } catch (error) {
    console.error(`❌ Failed to send ${type} email:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/** Send booking confirmation email to the guest (recipient derived server-side). */
export async function sendBookingConfirmationToGuest(
  bookingData: { bookingId: string },
  _guestEmail?: string,
  _hostEmail?: string
): Promise<{ success: boolean; error?: string }> {
  return sendEmail('booking-confirmation', { bookingId: bookingData.bookingId });
}

/** Send booking notification email to the host (recipient derived server-side). */
export async function sendBookingNotificationToHost(
  bookingData: { bookingId: string },
  _hostEmail?: string,
  _guestEmail?: string
): Promise<{ success: boolean; error?: string }> {
  return sendEmail('booking-notification', { bookingId: bookingData.bookingId });
}

/** Send cancellation notification email to the guest. */
export async function sendCancellationNotificationToGuest(
  cancellationData: { bookingId: string },
  _guestEmail?: string
): Promise<{ success: boolean; error?: string }> {
  return sendEmail('cancellation-guest', { bookingId: cancellationData.bookingId });
}

/** Send cancellation notification email to the host. */
export async function sendCancellationNotificationToHost(
  cancellationData: { bookingId: string },
  _hostEmail?: string
): Promise<{ success: boolean; error?: string }> {
  return sendEmail('cancellation-host', { bookingId: cancellationData.bookingId });
}

/** Send listing approval email to the host of the given camp. */
export async function sendListingApprovalEmail(
  campId: string
): Promise<{ success: boolean; error?: string }> {
  return sendEmail('listing-approved', { campId });
}

/** Send listing submitted/pending email to the host of the given camp. */
export async function sendListingPendingEmail(
  campId: string
): Promise<{ success: boolean; error?: string }> {
  return sendEmail('listing-pending', { campId });
}
