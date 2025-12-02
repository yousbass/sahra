import { parseISO, isSameDay, isPast, startOfDay, isWithinInterval } from 'date-fns';
import { getBookingsByCamp, Booking } from './firestore';
import { getBlockedDates as getBlockedDatesFromFirestore } from './firestore';

export interface AvailabilityCheckResult {
  available: boolean;
  reason?: 'booked' | 'blocked' | 'past_date' | 'invalid_range';
  conflictingBookingId?: string;
  conflictingBlockId?: string;
  message: string;
}

/**
 * Check if a specific date is available for booking
 * IMPORTANT: A booking only occupies its check-in date. The checkout date (next day at 3:00 AM) is available for new bookings.
 */
export async function checkAvailability(
  campId: string,
  checkDate: Date
): Promise<AvailabilityCheckResult> {
  console.log('=== CHECK AVAILABILITY ===');
  console.log('Camp ID:', campId);
  console.log('Check Date:', checkDate);
  
  try {
    // 1. Check if date is in the past
    if (isPast(startOfDay(checkDate)) && !isSameDay(checkDate, new Date())) {
      return {
        available: false,
        reason: 'past_date',
        message: 'Cannot book past dates'
      };
    }
    
    // 2. Check for existing bookings
    // FIXED: Only check checkInDate, NOT checkOutDate
    // A booking occupies only its check-in date. The checkout happens at 3:00 AM the next day,
    // so that date is available for new check-ins at 8:00 AM.
    const bookings = await getBookingsByCamp(campId);
    const conflictingBooking = bookings.find(booking => 
      isSameDay(parseISO(booking.checkInDate), checkDate) &&
      booking.status !== 'cancelled'
    );
    
    if (conflictingBooking) {
      return {
        available: false,
        reason: 'booked',
        conflictingBookingId: conflictingBooking.id,
        message: 'This date is already booked'
      };
    }
    
    // 3. Check for blocked dates
    const blockedDates = await getBlockedDatesFromFirestore(campId);
    const conflictingBlock = blockedDates.find(block => {
      // Handle both string and Timestamp formats
      const startDate = typeof block.startDate === 'string' 
        ? new Date(block.startDate) 
        : new Date(block.startDate);
      const endDate = typeof block.endDate === 'string' 
        ? new Date(block.endDate) 
        : new Date(block.endDate);
      
      return isWithinInterval(checkDate, {
        start: startDate,
        end: endDate
      });
    });
    
    if (conflictingBlock) {
      return {
        available: false,
        reason: 'blocked',
        conflictingBlockId: conflictingBlock.id,
        message: 'This date has been blocked by the host'
      };
    }
    
    // 4. Date is available
    return {
      available: true,
      message: 'Date is available for booking'
    };
    
  } catch (error) {
    console.error('❌ Error checking availability:', error);
    throw error;
  }
}

/**
 * Get all booked dates from existing bookings
 * FIXED: Only return check-in dates, NOT checkout dates
 */
export async function getBookedDates(campId: string): Promise<Date[]> {
  console.log('=== GET BOOKED DATES ===');
  console.log('Camp ID:', campId);
  
  try {
    const bookings = await getBookingsByCamp(campId);
    
    // Only return check-in dates - checkout dates are available for new bookings
    const bookedDates = bookings
      .filter(booking => booking.status !== 'cancelled')
      .map(booking => parseISO(booking.checkInDate));
    
    console.log(`✅ Found ${bookedDates.length} booked dates (check-in dates only)`);
    return bookedDates;
    
  } catch (error) {
    console.error('❌ Error fetching booked dates:', error);
    throw error;
  }
}

/**
 * Detect booking conflicts for a date range
 * FIXED: Only check check-in dates for conflicts
 */
export async function detectConflicts(
  campId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  hasConflict: boolean;
  conflictingBookings: Booking[];
  conflictingBlocks: unknown[];
}> {
  console.log('=== DETECT CONFLICTS ===');
  console.log('Camp ID:', campId);
  console.log('Date Range:', startDate, 'to', endDate);
  
  try {
    // Check bookings - only check check-in dates
    const bookings = await getBookingsByCamp(campId);
    const conflictingBookings = bookings.filter(booking => {
      if (booking.status === 'cancelled') return false;
      
      // Only check if the check-in date falls within the range
      const bookingDate = parseISO(booking.checkInDate);
      return isWithinInterval(bookingDate, { start: startDate, end: endDate });
    });
    
    // Check blocked dates
    const blockedDates = await getBlockedDatesFromFirestore(campId);
    const conflictingBlocks = blockedDates.filter(block => {
      // Handle both string and Timestamp formats
      const blockStart = typeof block.startDate === 'string' 
        ? new Date(block.startDate) 
        : new Date(block.startDate);
      const blockEnd = typeof block.endDate === 'string' 
        ? new Date(block.endDate) 
        : new Date(block.endDate);
      
      return (
        isWithinInterval(blockStart, { start: startDate, end: endDate }) ||
        isWithinInterval(blockEnd, { start: startDate, end: endDate }) ||
        (blockStart <= startDate && blockEnd >= endDate)
      );
    });
    
    const hasConflict = conflictingBookings.length > 0 || conflictingBlocks.length > 0;
    
    console.log(`✅ Conflict detection complete: ${hasConflict ? 'CONFLICTS FOUND' : 'NO CONFLICTS'}`);
    
    return {
      hasConflict,
      conflictingBookings,
      conflictingBlocks
    };
    
  } catch (error) {
    console.error('❌ Error detecting conflicts:', error);
    throw error;
  }
}

/**
 * Validate booking dates
 */
export function validateBookingDates(
  checkInDate: Date,
  checkOutDate: Date
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check if check-in is in the past
  if (isPast(startOfDay(checkInDate)) && !isSameDay(checkInDate, new Date())) {
    errors.push('Check-in date cannot be in the past');
  }
  
  // Check if check-out is after check-in
  if (checkOutDate <= checkInDate) {
    errors.push('Check-out date must be after check-in date');
  }
  
  // Check if dates are the same day (camping is full-day)
  if (isSameDay(checkInDate, checkOutDate)) {
    errors.push('Check-in and check-out cannot be on the same day');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Check availability with retry logic
 */
export async function checkAvailabilityWithRetry(
  campId: string,
  date: Date,
  maxRetries: number = 3
): Promise<AvailabilityCheckResult> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await checkAvailability(campId, date);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry for certain errors
      if ('code' in lastError && lastError.code === 'permission-denied') {
        throw error;
      }
      
      // Wait before retrying (exponential backoff)
      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}