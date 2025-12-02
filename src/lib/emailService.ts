import { 
  bookingConfirmationGuestTemplate,
  bookingNotificationHostTemplate,
  cancellationNotificationGuestTemplate,
  cancellationNotificationHostTemplate,
  refundConfirmationTemplate,
  reviewReminderTemplate,
  listingApprovedTemplate
} from './emailTemplates';

// Backend API URL - use same-origin when VITE_API_URL points to localhost to avoid mixed-content issues via HTTPS tunnels
const API_URL =
  import.meta.env.VITE_API_URL && !import.meta.env.VITE_API_URL.includes('localhost')
    ? import.meta.env.VITE_API_URL
    : '';

interface BookingData {
  bookingId: string;
  campName: string;
  campLocation: string;
  checkInDate: string;
  checkOutDate: string;
  numberOfGuests: number;
  totalAmount: number;
  guestName: string;
  hostName: string;
  cancellationPolicy: string;
}

interface CancellationData {
  bookingId: string;
  campName: string;
  campLocation: string;
  checkInDate: string;
  checkOutDate: string;
  numberOfGuests: number;
  totalAmount: number;
  guestName: string;
  hostName: string;
  cancellationReason?: string;
  cancelledAt: string;
}

interface RefundData {
  bookingId: string;
  campName: string;
  refundAmount: number;
  refundPercentage: number;
  originalAmount: number;
  guestName: string;
  processingTime: string;
}

interface ListingApprovalData {
  campName: string;
  campLocation?: string;
  hostName: string;
  approvalDate: string;
  dashboardUrl?: string;
}

/**
 * Send booking confirmation email to guest
 */
export async function sendBookingConfirmationToGuest(
  bookingData: BookingData,
  guestEmail: string,
  hostEmail: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('📧 Sending booking confirmation to guest via backend:', guestEmail);
    
    const htmlContent = bookingConfirmationGuestTemplate(bookingData);
    
    const response = await fetch(`${API_URL}/api/emails/booking-confirmation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bookingData,
        guestEmail,
        htmlContent,
      }),
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to send email');
    }
    
    console.log('✅ Booking confirmation sent to guest');
    return { success: true };
  } catch (error) {
    console.error('❌ Failed to send booking confirmation to guest:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Send booking notification email to host
 */
export async function sendBookingNotificationToHost(
  bookingData: BookingData,
  hostEmail: string,
  guestEmail: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('📧 Sending booking notification to host via backend:', hostEmail);
    
    const htmlContent = bookingNotificationHostTemplate(bookingData, guestEmail);
    
    const response = await fetch(`${API_URL}/api/emails/booking-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bookingData,
        hostEmail,
        htmlContent,
      }),
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to send email');
    }
    
    console.log('✅ Booking notification sent to host');
    return { success: true };
  } catch (error) {
    console.error('❌ Failed to send booking notification to host:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Send cancellation notification email to guest
 */
export async function sendCancellationNotificationToGuest(
  cancellationData: CancellationData,
  guestEmail: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('📧 Sending cancellation notification to guest via backend:', guestEmail);
    
    const htmlContent = cancellationNotificationGuestTemplate(cancellationData);
    
    const response = await fetch(`${API_URL}/api/emails/cancellation-guest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cancellationData,
        guestEmail,
        htmlContent,
      }),
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to send email');
    }
    
    console.log('✅ Cancellation notification sent to guest');
    return { success: true };
  } catch (error) {
    console.error('❌ Failed to send cancellation notification to guest:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Send cancellation notification email to host
 */
export async function sendCancellationNotificationToHost(
  cancellationData: CancellationData,
  hostEmail: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('📧 Sending cancellation notification to host via backend:', hostEmail);
    
    const htmlContent = cancellationNotificationHostTemplate(cancellationData);
    
    const response = await fetch(`${API_URL}/api/emails/cancellation-host`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cancellationData,
        hostEmail,
        htmlContent,
      }),
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to send email');
    }
    
    console.log('✅ Cancellation notification sent to host');
    return { success: true };
  } catch (error) {
    console.error('❌ Failed to send cancellation notification to host:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Send refund confirmation email to guest
 */
export async function sendRefundConfirmation(
  refundData: RefundData,
  guestEmail: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('📧 Sending refund confirmation to guest via backend:', guestEmail);
    
    const htmlContent = refundConfirmationTemplate(refundData);
    
    const response = await fetch(`${API_URL}/api/emails/refund-confirmation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refundData,
        guestEmail,
        htmlContent,
      }),
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to send email');
    }
    
    console.log('✅ Refund confirmation sent to guest');
    return { success: true };
  } catch (error) {
    console.error('❌ Failed to send refund confirmation to guest:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Send review reminder email to guest
 */
export async function sendReviewReminder(
  bookingData: BookingData,
  guestEmail: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('📧 Sending review reminder to guest via backend:', guestEmail);
    
    const htmlContent = reviewReminderTemplate(bookingData);
    
    const response = await fetch(`${API_URL}/api/emails/review-reminder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bookingData,
        guestEmail,
        htmlContent,
      }),
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to send email');
    }
    
    console.log('✅ Review reminder sent to guest');
    return { success: true };
  } catch (error) {
    console.error('❌ Failed to send review reminder to guest:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Send listing approval email to host
 */
export async function sendListingApprovalEmail(
  listingData: ListingApprovalData,
  hostEmail: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('📧 Sending listing approval to host via backend:', hostEmail);
    
    const htmlContent = listingApprovedTemplate(listingData);
    
    const response = await fetch(`${API_URL}/api/emails/listing-approved`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        listingData,
        hostEmail,
        htmlContent,
      }),
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to send email');
    }
    
    console.log('✅ Listing approval email sent to host');
    return { success: true };
  } catch (error) {
    console.error('❌ Failed to send listing approval email to host:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}
