import { 
  bookingConfirmationGuestTemplate,
  bookingNotificationHostTemplate,
  cancellationNotificationGuestTemplate,
  cancellationNotificationHostTemplate,
  refundConfirmationTemplate,
  reviewReminderTemplate,
  listingApprovedTemplate
} from './emailTemplates';

// Always hit same-origin API routes in production; avoids localhost misrouting
const API_URL = '';

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
    console.log('📧 Guest email response:', response.status, result);
    
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
        guestEmail
      }),
    });
    
    const result = await response.json();
    console.log('📧 Host email response:', response.status, result);
    
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

/**
 * Send listing submission/pending email to host
 */
export async function sendListingPendingEmail(
  listingData: ListingApprovalData,
  hostEmail: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('📧 Sending listing submission notice to host via backend:', hostEmail);
    
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; color: #1f2937;">
        <h2 style="color:#c89666; margin-bottom: 12px;">We received your listing!</h2>
        <p style="margin: 0 0 12px;">Hi ${listingData.hostName || 'Host'},</p>
        <p style="margin: 0 0 12px;">Your camp <strong>${listingData.campName}</strong>${listingData.campLocation ? ` in ${listingData.campLocation}` : ''} has been submitted for review. Our team will approve it soon.</p>
        <p style="margin: 0 0 16px;">You can check your dashboard for status updates.</p>
        <a href="${listingData.dashboardUrl || 'https://www.mukhymat.com/host/dashboard'}" style="display:inline-block; padding: 12px 24px; background: linear-gradient(135deg, #d4a574 0%, #c89666 100%); color: #fff; border-radius: 6px; text-decoration: none; font-weight: bold;">Go to Dashboard</a>
        <p style="margin-top:16px; font-size: 12px; color:#6b7280;">Submitted on ${listingData.approvalDate ? new Date(listingData.approvalDate).toLocaleString() : new Date().toLocaleString()}</p>
      </div>
    `;
    
    const response = await fetch(`${API_URL}/api/emails/listing-pending`, {
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
      throw new Error(result.error || 'Failed to send listing pending email');
    }
    
    console.log('✅ Listing submission email sent to host');
    return { success: true };
  } catch (error) {
    console.error('❌ Failed to send listing submission email:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}
