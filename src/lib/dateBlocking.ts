import { 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc,
  doc,
  query,
  where,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { eachDayOfInterval, isWithinInterval, parseISO } from 'date-fns';
import { getBookingsByCamp } from './firestore';
import { BlockedDate as FirestoreBlockedDate } from './firestore';

export interface BlockedDate {
  id: string;
  campId: string;
  hostId: string;
  startDate: Timestamp;
  endDate: Timestamp;
  reason: string;
  reasonCategory: 'maintenance' | 'personal' | 'weather' | 'event' | 'seasonal' | 'other';
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  createdBy: string;
  notes?: string;
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

/**
 * Block specific dates or date ranges for a camp
 */
export async function blockDates(
  campId: string,
  dateRange: DateRange,
  hostId: string,
  reason: string = 'Not specified',
  reasonCategory: BlockedDate['reasonCategory'] = 'other',
  notes?: string
): Promise<string> {
  console.log('=== BLOCK DATES ===');
  console.log('Camp ID:', campId);
  console.log('Date Range:', dateRange);
  console.log('Host ID:', hostId);
  
  if (!db) {
    throw new Error('Firestore is not initialized');
  }
  
  try {
    // Validate date range
    if (dateRange.endDate < dateRange.startDate) {
      throw new Error('End date must be after start date');
    }
    
    // Check for existing bookings in the date range
    const bookings = await getBookingsByCamp(campId);
    const conflictingBookings = bookings.filter(booking => {
      if (booking.status === 'cancelled') return false;
      
      const bookingDate = parseISO(booking.checkInDate);
      return isWithinInterval(bookingDate, {
        start: dateRange.startDate,
        end: dateRange.endDate
      });
    });
    
    if (conflictingBookings.length > 0) {
      throw new Error(
        `Cannot block dates: ${conflictingBookings.length} confirmed booking(s) exist in this range`
      );
    }
    
    // Create blocked date record
    const blockData = {
      campId,
      hostId,
      startDate: Timestamp.fromDate(dateRange.startDate),
      endDate: Timestamp.fromDate(dateRange.endDate),
      reason,
      reasonCategory,
      createdBy: hostId,
      createdAt: serverTimestamp(),
      ...(notes && { notes })
    };
    
    const blockedDatesRef = collection(db, 'blockedDates');
    const docRef = await addDoc(blockedDatesRef, blockData);
    
    console.log('✅ Dates blocked successfully:', docRef.id);
    return docRef.id;
    
  } catch (error) {
    console.error('❌ Error blocking dates:', error);
    throw error;
  }
}

/**
 * Remove date blocks
 */
export async function unblockDates(blockId: string): Promise<void> {
  console.log('=== UNBLOCK DATES ===');
  console.log('Block ID:', blockId);
  
  if (!db) {
    throw new Error('Firestore is not initialized');
  }
  
  try {
    const blockRef = doc(db, 'blockedDates', blockId);
    await deleteDoc(blockRef);
    
    console.log('✅ Dates unblocked successfully');
  } catch (error) {
    console.error('❌ Error unblocking dates:', error);
    throw error;
  }
}

/**
 * Fetch all blocked dates for a camp - uses Firestore function
 */
export async function getBlockedDates(campId: string): Promise<FirestoreBlockedDate[]> {
  console.log('=== GET BLOCKED DATES (dateBlocking.ts) ===');
  console.log('Camp ID:', campId);
  
  if (!db) {
    throw new Error('Firestore is not initialized');
  }
  
  try {
    const blockedDatesRef = collection(db, 'blockedDates');
    const q = query(blockedDatesRef, where('campId', '==', campId));
    const snapshot = await getDocs(q);
    
    const blockedDates = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as FirestoreBlockedDate[];
    
    console.log(`✅ Fetched ${blockedDates.length} blocked date ranges`);
    return blockedDates;
    
  } catch (error) {
    console.error('❌ Error fetching blocked dates:', error);
    throw error;
  }
}

/**
 * Get all blocked dates for a host across all their camps
 */
export async function getBlockedDatesByHost(hostId: string): Promise<FirestoreBlockedDate[]> {
  console.log('=== GET BLOCKED DATES BY HOST ===');
  console.log('Host ID:', hostId);
  
  if (!db) {
    throw new Error('Firestore is not initialized');
  }
  
  try {
    const blockedDatesRef = collection(db, 'blockedDates');
    const q = query(blockedDatesRef, where('hostId', '==', hostId));
    const snapshot = await getDocs(q);
    
    const blockedDates = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as FirestoreBlockedDate[];
    
    console.log(`✅ Fetched ${blockedDates.length} blocked date ranges for host`);
    return blockedDates;
    
  } catch (error) {
    console.error('❌ Error fetching host blocked dates:', error);
    throw error;
  }
}

/**
 * Check if a specific date is blocked
 */
export function isDateBlocked(date: Date, blockedRanges: FirestoreBlockedDate[]): boolean {
  return blockedRanges.some(block => {
    // Handle both string and Timestamp formats
    const startDate = typeof block.startDate === 'string' 
      ? new Date(block.startDate) 
      : new Date(block.startDate);
    const endDate = typeof block.endDate === 'string' 
      ? new Date(block.endDate) 
      : new Date(block.endDate);
    
    return isWithinInterval(date, {
      start: startDate,
      end: endDate
    });
  });
}

/**
 * Get all individual dates from blocked ranges
 */
export function getBlockedDatesList(blockedRanges: FirestoreBlockedDate[]): Date[] {
  const dates: Date[] = [];
  
  blockedRanges.forEach(block => {
    // Handle both string and Timestamp formats
    const startDate = typeof block.startDate === 'string' 
      ? new Date(block.startDate) 
      : new Date(block.startDate);
    const endDate = typeof block.endDate === 'string' 
      ? new Date(block.endDate) 
      : new Date(block.endDate);
    
    const rangeDates = eachDayOfInterval({
      start: startDate,
      end: endDate
    });
    dates.push(...rangeDates);
  });
  
  return dates;
}