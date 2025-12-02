# Real-time Availability Calendar System Design - Sahra Camping Platform

## Overview

This document outlines the comprehensive design for implementing a real-time availability calendar system for the Sahra camping platform. The system will provide hosts with powerful date blocking capabilities, prevent double bookings, and offer guests a clear visual representation of camp availability.

---

## 1. Calendar UI/UX Design

### 1.1 Guest-Facing Calendar (Reserve Page & Camp Details)

**Component**: `AvailabilityCalendar.tsx`

```typescript
interface AvailabilityCalendarProps {
  campId: string;
  bookedDates: Date[];
  blockedDates: Date[];
  selectedDate: Date | null;
  onDateSelect: (date: Date | null) => void;
  minDate?: Date;
  maxDate?: Date;
  checkInTime?: string;
  checkOutTime?: string;
}
```

**Visual Indicators:**

1. **Available Dates** (Default)
   - Background: White/Light gray
   - Border: Light sand color (#E5DCC5)
   - Hover: Terracotta highlight (#D97757)
   - Cursor: Pointer
   - Tooltip: "Available - Click to select"

2. **Selected Date**
   - Background: Amber/Orange (#F59E0B)
   - Text: White
   - Border: Thick amber border
   - Icon: Check mark
   - Tooltip: "Selected for booking"

3. **Booked Dates** (Confirmed reservations)
   - Background: Red/Pink (#FEE2E2)
   - Text: Gray (strikethrough)
   - Border: Red (#EF4444)
   - Icon: X or Lock icon
   - Cursor: Not-allowed
   - Tooltip: "Unavailable - Already booked"

4. **Blocked Dates** (Host-blocked)
   - Background: Gray (#F3F4F6)
   - Text: Dark gray (strikethrough)
   - Border: Gray (#9CA3AF)
   - Icon: Slash or Block icon
   - Cursor: Not-allowed
   - Tooltip: "Unavailable - Blocked by host"

5. **Past Dates**
   - Background: Light gray
   - Text: Faded gray
   - Cursor: Not-allowed
   - Disabled: true
   - Tooltip: "Past date"

6. **Today**
   - Border: Thick terracotta border (#D97757)
   - Badge: "Today" label
   - Special highlight ring

**Layout:**

```
┌─────────────────────────────────────────────┐
│  ◄  January 2025  ►                         │
├─────────────────────────────────────────────┤
│  Sun  Mon  Tue  Wed  Thu  Fri  Sat         │
├─────────────────────────────────────────────┤
│   -    -    -    1    2    3    4          │
│   5    6    7    8    9   10   11          │
│  12   13   14   15   16   17   18          │
│  19   20   21   22   23   24   25          │
│  26   27   28   29   30   31    -          │
└─────────────────────────────────────────────┘

Legend:
🟢 Available  🟠 Selected  🔴 Booked  ⚫ Blocked
```

### 1.2 Host-Facing Calendar (Host Dashboard)

**Component**: `HostCalendarManager.tsx`

**Additional Features:**

1. **Multi-Date Selection**
   - Click and drag to select date ranges
   - Shift+Click for range selection
   - Ctrl/Cmd+Click for multiple individual dates

2. **Booking Details on Hover**
   - Guest name
   - Number of guests
   - Booking ID
   - Payment status
   - Quick actions (View, Cancel)

3. **Color-Coded Booking Status**
   - **Confirmed**: Green (#10B981)
   - **Pending**: Yellow (#F59E0B)
   - **Cancelled**: Red (#EF4444)
   - **Blocked by Host**: Gray (#6B7280)

4. **Calendar Views**
   - Month view (default)
   - Week view
   - List view (chronological bookings)

5. **Quick Actions Panel**
   - "Block Selected Dates" button
   - "Unblock Selected Dates" button
   - "View All Bookings" link
   - Date range picker for bulk operations

**Layout:**

```
┌─────────────────────────────────────────────────────────┐
│  My Camp Calendar                    [Month ▼] [Week]   │
├─────────────────────────────────────────────────────────┤
│  ◄  January 2025  ►              [Block Dates] [Export] │
├─────────────────────────────────────────────────────────┤
│  Sun    Mon    Tue    Wed    Thu    Fri    Sat         │
├─────────────────────────────────────────────────────────┤
│   -      -      -     1🟢    2🟢    3🔴    4⚫          │
│   5🟢    6🟢    7🟡    8🟢    9🟢   10🔴   11🔴         │
│  12🟢   13🟢   14🟢   15🟢   16🟢   17🟢   18🟢         │
│  19🟢   20🟢   21🟢   22🟢   23🟢   24🟢   25🟢         │
│  26🟢   27🟢   28🟢   29🟢   30🟢   31🟢    -           │
└─────────────────────────────────────────────────────────┘

Statistics:
📊 15 Available  🟢 10 Confirmed  🟡 2 Pending  ⚫4 Blocked
```

---

## 2. Date Blocking Functionality

### 2.1 Host Date Blocking Interface

**Component**: `DateBlockingDialog.tsx`

```typescript
interface DateBlockingDialogProps {
  campId: string;
  onBlockDates: (dates: DateRange[], reason?: string) => Promise<void>;
  onUnblockDates: (blockIds: string[]) => Promise<void>;
}

interface DateRange {
  startDate: Date;
  endDate: Date;
}

interface BlockedDate {
  id: string;
  campId: string;
  hostId: string;
  startDate: Date;
  endDate: Date;
  reason?: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
```

**Features:**

1. **Block Single Date**
   - Click on available date
   - Click "Block Date" button
   - Optional reason field
   - Confirmation dialog

2. **Block Date Range**
   - Select start date
   - Select end date
   - Automatic range highlighting
   - Optional reason field
   - Confirmation with date count

3. **Bulk Block Dates**
   - Multi-select mode
   - Select multiple non-consecutive dates
   - Batch operation confirmation
   - Progress indicator

4. **Recurring Blocks** (Future Enhancement)
   - Block every Monday
   - Block weekends
   - Block specific day of month
   - Custom patterns

**Blocking Reasons (Predefined + Custom):**

- Maintenance/Repairs
- Personal Use
- Weather Conditions
- Special Event
- Seasonal Closure
- Custom (text input)

**UI Flow:**

```
Step 1: Select Dates
┌────────────────────────────────┐
│  Select dates to block         │
│  [Calendar with selection]     │
│  Selected: Jan 15 - Jan 20     │
│  (6 days)                      │
└────────────────────────────────┘
              ↓
Step 2: Add Reason (Optional)
┌────────────────────────────────┐
│  Reason for blocking:          │
│  [Dropdown: Maintenance ▼]     │
│  [Text: Annual camp cleaning]  │
└────────────────────────────────┘
              ↓
Step 3: Confirm
┌────────────────────────────────┐
│  Block 6 dates?                │
│  Jan 15 - Jan 20, 2025         │
│  Reason: Maintenance           │
│  [Cancel] [Confirm Block]      │
└────────────────────────────────┘
```

### 2.2 Unblocking Dates

**Features:**

1. **Single Date Unblock**
   - Click on blocked date
   - "Unblock Date" button appears
   - Confirmation dialog

2. **Range Unblock**
   - Select blocked date range
   - "Unblock Selected" button
   - Confirmation with count

3. **View Block History**
   - List of all blocked dates
   - Filter by date range
   - Filter by reason
   - Bulk unblock option

**Validation Rules:**

- Cannot unblock dates with confirmed bookings
- Cannot unblock past dates
- Warning if unblocking dates with pending bookings
- Confirmation required for bulk operations

---

## 3. Booking Conflict Prevention

### 3.1 Real-time Availability Check

**Function**: `checkDateAvailability()`

```typescript
interface AvailabilityCheckResult {
  available: boolean;
  reason?: 'booked' | 'blocked' | 'past_date' | 'invalid_range';
  conflictingBookingId?: string;
  conflictingBlockId?: string;
  message: string;
}

async function checkDateAvailability(
  campId: string,
  checkDate: Date
): Promise<AvailabilityCheckResult> {
  // 1. Check if date is in the past
  if (isPast(checkDate)) {
    return {
      available: false,
      reason: 'past_date',
      message: 'Cannot book past dates'
    };
  }

  // 2. Check for existing bookings
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
  const blockedDates = await getBlockedDates(campId);
  const conflictingBlock = blockedDates.find(block =>
    isWithinInterval(checkDate, {
      start: block.startDate,
      end: block.endDate
    })
  );

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
}
```

### 3.2 Booking Creation Validation

**Enhanced `createBooking()` Function:**

```typescript
async function createBookingWithValidation(
  bookingData: Omit<Booking, 'id' | 'createdAt'>,
  userId: string
): Promise<string> {
  console.log('=== CREATE BOOKING WITH VALIDATION ===');
  
  if (!db) {
    throw new Error('Firestore is not initialized');
  }

  try {
    // Step 1: Parse booking date
    const bookingDate = parseISO(bookingData.checkInDate);
    
    // Step 2: Check availability
    const availabilityCheck = await checkDateAvailability(
      bookingData.campId,
      bookingDate
    );
    
    if (!availabilityCheck.available) {
      throw new Error(availabilityCheck.message);
    }
    
    // Step 3: Double-check with transaction for race condition prevention
    const bookingRef = collection(db, 'bookings');
    
    return await runTransaction(db, async (transaction) => {
      // Re-check availability within transaction
      const bookingsQuery = query(
        bookingRef,
        where('campId', '==', bookingData.campId),
        where('checkInDate', '==', bookingData.checkInDate),
        where('status', '!=', 'cancelled')
      );
      
      const snapshot = await getDocs(bookingsQuery);
      
      if (!snapshot.empty) {
        throw new Error('This date was just booked by another user. Please select a different date.');
      }
      
      // Create booking
      const newBookingRef = doc(bookingRef);
      const bookingWithUser = {
        ...bookingData,
        userId,
        createdAt: serverTimestamp(),
        eligibleForReview: false,
        paymentStatus: 'pending',
        refundPolicy: bookingData.refundPolicy || 'refundable',
        refundEligible: true,
        refundStatus: 'none'
      };
      
      transaction.set(newBookingRef, bookingWithUser);
      
      console.log('✅ Booking created with ID:', newBookingRef.id);
      return newBookingRef.id;
    });
    
  } catch (error) {
    console.error('❌ Failed to create booking:', error);
    throw error;
  }
}
```

### 3.3 Race Condition Prevention

**Strategy: Firestore Transactions**

```typescript
// Use Firestore transactions for atomic operations
import { runTransaction } from 'firebase/firestore';

async function blockDatesWithValidation(
  campId: string,
  dateRange: DateRange,
  hostId: string,
  reason?: string
): Promise<string[]> {
  if (!db) {
    throw new Error('Firestore is not initialized');
  }

  return await runTransaction(db, async (transaction) => {
    // 1. Check for existing bookings in the date range
    const bookingsRef = collection(db, 'bookings');
    const bookingsQuery = query(
      bookingsRef,
      where('campId', '==', campId),
      where('status', '!=', 'cancelled')
    );
    
    const bookingsSnapshot = await getDocs(bookingsQuery);
    
    const conflictingBookings = bookingsSnapshot.docs.filter(doc => {
      const booking = doc.data() as Booking;
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
    
    // 2. Create blocked date records
    const blockedDateIds: string[] = [];
    const blockedDatesRef = collection(db, 'blockedDates');
    
    const blockData = {
      campId,
      hostId,
      startDate: Timestamp.fromDate(dateRange.startDate),
      endDate: Timestamp.fromDate(dateRange.endDate),
      reason: reason || 'Not specified',
      createdAt: serverTimestamp()
    };
    
    const newBlockRef = doc(blockedDatesRef);
    transaction.set(newBlockRef, blockData);
    blockedDateIds.push(newBlockRef.id);
    
    return blockedDateIds;
  });
}
```

---

## 4. Integration with Booking System

### 4.1 Reserve Page Integration

**File**: `src/pages/Reserve.tsx` (Enhanced)

```typescript
import { AvailabilityCalendar } from '@/components/AvailabilityCalendar';
import { checkDateAvailability } from '@/lib/availabilityService';

export default function Reserve() {
  const [bookedDates, setBookedDates] = useState<Date[]>([]);
  const [blockedDates, setBlockedDates] = useState<Date[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  // Fetch booked and blocked dates
  useEffect(() => {
    const fetchAvailability = async () => {
      if (!campId) return;
      
      try {
        // Fetch bookings
        const bookings = await getBookingsByCamp(campId);
        const booked = bookings
          .filter(b => b.status !== 'cancelled')
          .map(b => parseISO(b.checkInDate));
        setBookedDates(booked);
        
        // Fetch blocked dates
        const blocked = await getBlockedDates(campId);
        const blockedDatesList: Date[] = [];
        blocked.forEach(block => {
          const dates = eachDayOfInterval({
            start: block.startDate.toDate(),
            end: block.endDate.toDate()
          });
          blockedDatesList.push(...dates);
        });
        setBlockedDates(blockedDatesList);
        
      } catch (error) {
        console.error('Failed to fetch availability:', error);
        toast.error('Failed to load availability');
      }
    };
    
    fetchAvailability();
  }, [campId]);

  // Validate date selection
  const handleDateSelect = async (date: Date | null) => {
    if (!date || !campId) return;
    
    setCheckingAvailability(true);
    
    try {
      const availability = await checkDateAvailability(campId, date);
      
      if (!availability.available) {
        toast.error(availability.message);
        return;
      }
      
      setSelectedDate(date);
      toast.success('Date selected! Continue to complete your booking.');
      
    } catch (error) {
      console.error('Availability check failed:', error);
      toast.error('Failed to check availability');
    } finally {
      setCheckingAvailability(false);
    }
  };

  return (
    <div>
      {/* ... other content ... */}
      
      <AvailabilityCalendar
        campId={campId}
        bookedDates={bookedDates}
        blockedDates={blockedDates}
        selectedDate={selectedDate}
        onDateSelect={handleDateSelect}
        minDate={new Date()}
        checkInTime={camp?.checkInTime}
        checkOutTime={camp?.checkOutTime}
      />
      
      {checkingAvailability && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Loader2 className="w-4 h-4 animate-spin" />
          Checking availability...
        </div>
      )}
      
      {/* ... rest of form ... */}
    </div>
  );
}
```

### 4.2 Real-time Updates

**Strategy: Firestore Real-time Listeners**

```typescript
// Real-time booking updates
function useRealtimeAvailability(campId: string) {
  const [bookedDates, setBookedDates] = useState<Date[]>([]);
  const [blockedDates, setBlockedDates] = useState<Date[]>([]);

  useEffect(() => {
    if (!campId || !db) return;

    // Listen to bookings
    const bookingsRef = collection(db, 'bookings');
    const bookingsQuery = query(
      bookingsRef,
      where('campId', '==', campId),
      where('status', '!=', 'cancelled')
    );

    const unsubscribeBookings = onSnapshot(bookingsQuery, (snapshot) => {
      const dates = snapshot.docs.map(doc => {
        const booking = doc.data() as Booking;
        return parseISO(booking.checkInDate);
      });
      setBookedDates(dates);
      console.log('📅 Bookings updated in real-time:', dates.length);
    });

    // Listen to blocked dates
    const blockedRef = collection(db, 'blockedDates');
    const blockedQuery = query(
      blockedRef,
      where('campId', '==', campId)
    );

    const unsubscribeBlocked = onSnapshot(blockedQuery, (snapshot) => {
      const dates: Date[] = [];
      snapshot.docs.forEach(doc => {
        const block = doc.data() as BlockedDate;
        const range = eachDayOfInterval({
          start: block.startDate.toDate(),
          end: block.endDate.toDate()
        });
        dates.push(...range);
      });
      setBlockedDates(dates);
      console.log('🚫 Blocked dates updated in real-time:', dates.length);
    });

    // Cleanup listeners
    return () => {
      unsubscribeBookings();
      unsubscribeBlocked();
    };
  }, [campId]);

  return { bookedDates, blockedDates };
}
```

---

## 5. Database Schema

### 5.1 Firestore Collections

**Collection: `blockedDates`**

```typescript
interface BlockedDate {
  id: string; // Auto-generated document ID
  campId: string; // Reference to camps collection
  hostId: string; // Reference to users collection
  startDate: Timestamp; // Start of blocked period
  endDate: Timestamp; // End of blocked period (inclusive)
  reason: string; // Reason for blocking
  reasonCategory: 'maintenance' | 'personal' | 'weather' | 'event' | 'seasonal' | 'other';
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  createdBy: string; // User ID who created the block
  notes?: string; // Additional notes
}
```

**Collection: `bookings` (Enhanced)**

```typescript
interface Booking {
  // ... existing fields ...
  
  // Add availability-related fields
  availabilityCheckedAt?: Timestamp; // When availability was last verified
  conflictResolved?: boolean; // If there was a conflict that was resolved
  conflictResolutionNotes?: string;
}
```

**Collection: `camps` (Enhanced)**

```typescript
interface Camp {
  // ... existing fields ...
  
  // Add availability settings
  availabilitySettings?: {
    autoBlockPastDates: boolean; // Automatically block past dates
    minAdvanceBooking: number; // Minimum days in advance (e.g., 1 day)
    maxAdvanceBooking: number; // Maximum days in advance (e.g., 365 days)
    allowSameDayBooking: boolean;
    bufferDays: number; // Days between bookings (e.g., 0 for back-to-back)
  };
  
  // Availability statistics
  availabilityStats?: {
    totalBlockedDays: number;
    totalBookedDays: number;
    occupancyRate: number; // Percentage of booked days
    lastUpdated: Timestamp;
  };
}
```

### 5.2 Firestore Indexes

**Required Composite Indexes:**

```javascript
// Index 1: Query bookings by camp and date
{
  collectionGroup: 'bookings',
  queryScope: 'COLLECTION',
  fields: [
    { fieldPath: 'campId', order: 'ASCENDING' },
    { fieldPath: 'checkInDate', order: 'ASCENDING' },
    { fieldPath: 'status', order: 'ASCENDING' }
  ]
}

// Index 2: Query blocked dates by camp
{
  collectionGroup: 'blockedDates',
  queryScope: 'COLLECTION',
  fields: [
    { fieldPath: 'campId', order: 'ASCENDING' },
    { fieldPath: 'startDate', order: 'ASCENDING' },
    { fieldPath: 'endDate', order: 'ASCENDING' }
  ]
}

// Index 3: Query blocked dates by host
{
  collectionGroup: 'blockedDates',
  queryScope: 'COLLECTION',
  fields: [
    { fieldPath: 'hostId', order: 'ASCENDING' },
    { fieldPath: 'createdAt', order: 'DESCENDING' }
  ]
}
```

### 5.3 Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper functions
    function isSignedIn() {
      return request.auth != null;
    }
    
    function isHost() {
      return isSignedIn() && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isHost == true;
    }
    
    function isCampOwner(campId) {
      return isSignedIn() && 
             get(/databases/$(database)/documents/camps/$(campId)).data.hostId == request.auth.uid;
    }
    
    function isAdmin() {
      return isSignedIn() && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }
    
    // Blocked Dates Rules
    match /blockedDates/{blockId} {
      // Anyone can read blocked dates (for availability check)
      allow read: if true;
      
      // Only camp owner can create blocked dates
      allow create: if isHost() && 
                       isCampOwner(request.resource.data.campId) &&
                       request.resource.data.hostId == request.auth.uid;
      
      // Only camp owner can update their blocked dates
      allow update: if isHost() && 
                       isCampOwner(resource.data.campId) &&
                       resource.data.hostId == request.auth.uid;
      
      // Only camp owner or admin can delete blocked dates
      allow delete: if (isHost() && isCampOwner(resource.data.campId)) || 
                       isAdmin();
    }
    
    // Bookings Rules (Enhanced)
    match /bookings/{bookingId} {
      // Read: User can read their own bookings, hosts can read their camp bookings, admins can read all
      allow read: if isSignedIn() && (
        resource.data.userId == request.auth.uid ||
        isCampOwner(resource.data.campId) ||
        isAdmin()
      );
      
      // Create: Authenticated users can create bookings
      // Additional validation: Check for conflicts (handled in Cloud Function)
      allow create: if isSignedIn() && 
                       request.resource.data.userId == request.auth.uid;
      
      // Update: User can update their own bookings (for cancellation)
      allow update: if isSignedIn() && (
        resource.data.userId == request.auth.uid ||
        isCampOwner(resource.data.campId) ||
        isAdmin()
      );
      
      // Delete: Only admins can delete bookings
      allow delete: if isAdmin();
    }
  }
}
```

---

## 6. Performance Optimization

### 6.1 Efficient Date Range Queries

**Strategy 1: Date Bucketing**

Instead of querying individual dates, group blocked dates into ranges:

```typescript
// Instead of storing each date individually:
// ❌ Bad: 30 documents for 30 blocked days
blockedDates: [
  { date: '2025-01-01' },
  { date: '2025-01-02' },
  // ... 28 more
]

// ✅ Good: 1 document for date range
blockedDates: [
  { 
    startDate: '2025-01-01',
    endDate: '2025-01-30'
  }
]
```

**Strategy 2: Indexed Date Queries**

```typescript
// Optimize query with proper indexing
async function getAvailabilityForMonth(
  campId: string,
  year: number,
  month: number
): Promise<AvailabilityData> {
  const startOfMonth = new Date(year, month, 1);
  const endOfMonth = new Date(year, month + 1, 0);
  
  // Query bookings for the month
  const bookingsQuery = query(
    collection(db, 'bookings'),
    where('campId', '==', campId),
    where('checkInDate', '>=', format(startOfMonth, 'yyyy-MM-dd')),
    where('checkInDate', '<=', format(endOfMonth, 'yyyy-MM-dd')),
    where('status', '!=', 'cancelled')
  );
  
  // Query blocked dates that overlap with the month
  const blockedQuery = query(
    collection(db, 'blockedDates'),
    where('campId', '==', campId),
    where('startDate', '<=', Timestamp.fromDate(endOfMonth)),
    where('endDate', '>=', Timestamp.fromDate(startOfMonth))
  );
  
  const [bookingsSnapshot, blockedSnapshot] = await Promise.all([
    getDocs(bookingsQuery),
    getDocs(blockedQuery)
  ]);
  
  return {
    bookings: bookingsSnapshot.docs.map(doc => doc.data() as Booking),
    blockedRanges: blockedSnapshot.docs.map(doc => doc.data() as BlockedDate)
  };
}
```

### 6.2 Caching Strategies

**Strategy 1: Client-Side Caching with React Query**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Cache availability data
function useAvailability(campId: string, month: Date) {
  return useQuery({
    queryKey: ['availability', campId, format(month, 'yyyy-MM')],
    queryFn: () => getAvailabilityForMonth(
      campId,
      month.getFullYear(),
      month.getMonth()
    ),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
  });
}

// Invalidate cache on booking creation
function useCreateBooking() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createBookingWithValidation,
    onSuccess: (data, variables) => {
      // Invalidate availability cache for the camp
      queryClient.invalidateQueries({
        queryKey: ['availability', variables.campId]
      });
    }
  });
}
```

**Strategy 2: Firestore Local Persistence**

```typescript
// Enable offline persistence
import { enableIndexedDbPersistence } from 'firebase/firestore';

enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
  } else if (err.code === 'unimplemented') {
    console.warn('Browser doesn\'t support persistence.');
  }
});
```

**Strategy 3: Memoization**

```typescript
import { useMemo } from 'react';

function AvailabilityCalendar({ bookedDates, blockedDates, month }) {
  // Memoize date availability map
  const availabilityMap = useMemo(() => {
    const map = new Map<string, 'available' | 'booked' | 'blocked'>();
    
    // Mark booked dates
    bookedDates.forEach(date => {
      map.set(format(date, 'yyyy-MM-dd'), 'booked');
    });
    
    // Mark blocked dates
    blockedDates.forEach(date => {
      map.set(format(date, 'yyyy-MM-dd'), 'blocked');
    });
    
    return map;
  }, [bookedDates, blockedDates]);
  
  // Fast lookup for date status
  const getDateStatus = (date: Date) => {
    return availabilityMap.get(format(date, 'yyyy-MM-dd')) || 'available';
  };
  
  // ... render calendar
}
```

### 6.3 Lazy Loading

```typescript
// Load only visible months
function CalendarView() {
  const [visibleMonths, setVisibleMonths] = useState([new Date()]);
  
  // Load availability for visible months only
  const availabilityQueries = useQueries({
    queries: visibleMonths.map(month => ({
      queryKey: ['availability', campId, format(month, 'yyyy-MM')],
      queryFn: () => getAvailabilityForMonth(campId, month.getFullYear(), month.getMonth())
    }))
  });
  
  // Load next month when user scrolls
  const handleMonthChange = (direction: 'prev' | 'next') => {
    const newMonth = direction === 'next' 
      ? addMonths(visibleMonths[visibleMonths.length - 1], 1)
      : subMonths(visibleMonths[0], 1);
    
    setVisibleMonths(prev => 
      direction === 'next' ? [...prev, newMonth] : [newMonth, ...prev]
    );
  };
  
  return (
    <div>
      {availabilityQueries.map((query, index) => (
        <MonthCalendar
          key={format(visibleMonths[index], 'yyyy-MM')}
          month={visibleMonths[index]}
          availability={query.data}
          loading={query.isLoading}
        />
      ))}
    </div>
  );
}
```

---

## 7. Host Dashboard Integration

### 7.1 Host Calendar Dashboard

**Component**: `HostCalendarDashboard.tsx`

```typescript
interface HostCalendarDashboardProps {
  hostId: string;
}

export function HostCalendarDashboard({ hostId }: HostCalendarDashboardProps) {
  const [selectedCamp, setSelectedCamp] = useState<Camp | null>(null);
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'list'>('month');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [showBlockDialog, setShowBlockDialog] = useState(false);

  // Fetch host's camps
  const { data: camps, isLoading: campsLoading } = useQuery({
    queryKey: ['hostCamps', hostId],
    queryFn: () => getCampsByHost(hostId)
  });

  // Fetch availability for selected camp
  const { data: availability, isLoading: availabilityLoading } = useQuery({
    queryKey: ['availability', selectedCamp?.id, format(currentMonth, 'yyyy-MM')],
    queryFn: () => selectedCamp 
      ? getAvailabilityForMonth(selectedCamp.id, currentMonth.getFullYear(), currentMonth.getMonth())
      : null,
    enabled: !!selectedCamp
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Calendar Management</h1>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'month' ? 'default' : 'outline'}
            onClick={() => setViewMode('month')}
          >
            Month
          </Button>
          <Button
            variant={viewMode === 'week' ? 'default' : 'outline'}
            onClick={() => setViewMode('week')}
          >
            Week
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            onClick={() => setViewMode('list')}
          >
            List
          </Button>
        </div>
      </div>

      {/* Camp Selector */}
      <Card className="p-4">
        <Label>Select Camp</Label>
        <Select
          value={selectedCamp?.id}
          onValueChange={(campId) => {
            const camp = camps?.find(c => c.id === campId);
            setSelectedCamp(camp || null);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Choose a camp..." />
          </SelectTrigger>
          <SelectContent>
            {camps?.map(camp => (
              <SelectItem key={camp.id} value={camp.id}>
                {camp.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Card>

      {/* Statistics */}
      {selectedCamp && availability && (
        <div className="grid grid-cols-4 gap-4">
          <StatCard
            title="Total Bookings"
            value={availability.bookings.length}
            icon={<Calendar />}
            color="blue"
          />
          <StatCard
            title="Confirmed"
            value={availability.bookings.filter(b => b.status === 'confirmed').length}
            icon={<Check />}
            color="green"
          />
          <StatCard
            title="Pending"
            value={availability.bookings.filter(b => b.status === 'pending').length}
            icon={<Clock />}
            color="yellow"
          />
          <StatCard
            title="Blocked Days"
            value={availability.blockedRanges.reduce((sum, range) => 
              sum + differenceInDays(range.endDate.toDate(), range.startDate.toDate()) + 1, 0
            )}
            icon={<XCircle />}
            color="gray"
          />
        </div>
      )}

      {/* Calendar */}
      {selectedCamp && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="outline"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            >
              <ChevronLeft />
            </Button>
            <h2 className="text-xl font-semibold">
              {format(currentMonth, 'MMMM yyyy')}
            </h2>
            <Button
              variant="outline"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              <ChevronRight />
            </Button>
          </div>

          {viewMode === 'month' && (
            <HostCalendarMonth
              campId={selectedCamp.id}
              month={currentMonth}
              bookings={availability?.bookings || []}
              blockedRanges={availability?.blockedRanges || []}
              selectedDates={selectedDates}
              onDateSelect={setSelectedDates}
            />
          )}

          {viewMode === 'week' && (
            <HostCalendarWeek
              campId={selectedCamp.id}
              week={currentMonth}
              bookings={availability?.bookings || []}
              blockedRanges={availability?.blockedRanges || []}
            />
          )}

          {viewMode === 'list' && (
            <BookingsList
              bookings={availability?.bookings || []}
              blockedRanges={availability?.blockedRanges || []}
            />
          )}
        </Card>
      )}

      {/* Quick Actions */}
      {selectedDates.length > 0 && (
        <Card className="p-4 bg-amber-50 border-amber-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">
                {selectedDates.length} date(s) selected
              </p>
              <p className="text-sm text-gray-600">
                {format(selectedDates[0], 'MMM dd')}
                {selectedDates.length > 1 && ` - ${format(selectedDates[selectedDates.length - 1], 'MMM dd')}`}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowBlockDialog(true)}
                className="bg-red-600 hover:bg-red-700"
              >
                Block Selected Dates
              </Button>
              <Button
                variant="outline"
                onClick={() => setSelectedDates([])}
              >
                Clear Selection
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Block Dates Dialog */}
      <DateBlockingDialog
        open={showBlockDialog}
        onOpenChange={setShowBlockDialog}
        campId={selectedCamp?.id || ''}
        selectedDates={selectedDates}
        onBlock={async (reason) => {
          // Handle blocking logic
          await blockDates(selectedCamp!.id, selectedDates, reason);
          setSelectedDates([]);
          setShowBlockDialog(false);
          toast.success('Dates blocked successfully');
        }}
      />
    </div>
  );
}
```

### 7.2 Booking Management Panel

```typescript
interface BookingManagementPanelProps {
  booking: Booking;
  onCancel: (bookingId: string) => void;
  onViewDetails: (bookingId: string) => void;
}

function BookingManagementPanel({ booking, onCancel, onViewDetails }: BookingManagementPanelProps) {
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  return (
    <Card className="p-4 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant={
              booking.status === 'confirmed' ? 'success' :
              booking.status === 'pending' ? 'warning' :
              'destructive'
            }>
              {booking.status.toUpperCase()}
            </Badge>
            <Badge variant="outline">
              {booking.paymentStatus}
            </Badge>
          </div>

          <h3 className="font-semibold text-lg mb-1">
            {booking.userName || 'Guest'}
          </h3>

          <div className="space-y-1 text-sm text-gray-600">
            <p>
              <Calendar className="w-4 h-4 inline mr-1" />
              {format(parseISO(booking.checkInDate), 'MMM dd, yyyy')}
            </p>
            <p>
              <Users className="w-4 h-4 inline mr-1" />
              {booking.guests} guest(s)
            </p>
            <p>
              <DollarSign className="w-4 h-4 inline mr-1" />
              {booking.totalPrice.toFixed(3)} BD
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onViewDetails(booking.id)}
          >
            <Eye className="w-4 h-4 mr-1" />
            View
          </Button>
          {booking.status !== 'cancelled' && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setShowCancelDialog(true)}
            >
              <XCircle className="w-4 h-4 mr-1" />
              Cancel
            </Button>
          )}
        </div>
      </div>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Booking?</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel the booking for {booking.userName} on{' '}
              {format(parseISO(booking.checkInDate), 'MMM dd, yyyy')}.
              The guest will be refunded according to the cancellation policy.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Booking</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onCancel(booking.id);
                setShowCancelDialog(false);
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Cancel Booking
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
```

---

## 8. Implementation Checklist

### Phase 1: Core Calendar Components (Week 1-2)
- [ ] Create `AvailabilityCalendar.tsx` component
- [ ] Implement date selection logic
- [ ] Add visual indicators for different date states
- [ ] Create `HostCalendarManager.tsx` component
- [ ] Implement multi-date selection
- [ ] Add calendar view modes (month/week/list)

### Phase 2: Date Blocking (Week 3)
- [ ] Create `DateBlockingDialog.tsx` component
- [ ] Implement block date range selection
- [ ] Add blocking reasons dropdown
- [ ] Create Firestore `blockedDates` collection
- [ ] Implement `blockDates()` function
- [ ] Implement `unblockDates()` function
- [ ] Add validation for blocking conflicts

### Phase 3: Conflict Prevention (Week 4)
- [ ] Implement `checkDateAvailability()` function
- [ ] Add Firestore transaction for booking creation
- [ ] Implement race condition prevention
- [ ] Add real-time availability checks
- [ ] Create availability validation middleware

### Phase 4: Integration (Week 5)
- [ ] Integrate calendar into Reserve page
- [ ] Update booking creation flow
- [ ] Add real-time listeners for bookings
- [ ] Add real-time listeners for blocked dates
- [ ] Implement cache invalidation

### Phase 5: Host Dashboard (Week 6)
- [ ] Create `HostCalendarDashboard.tsx`
- [ ] Implement booking management panel
- [ ] Add statistics cards
- [ ] Integrate date blocking UI
- [ ] Add bulk operations

### Phase 6: Optimization (Week 7)
- [ ] Implement React Query caching
- [ ] Add Firestore indexes
- [ ] Enable offline persistence
- [ ] Optimize date range queries
- [ ] Add lazy loading for months

### Phase 7: Testing & Polish (Week 8)
- [ ] Unit tests for availability logic
- [ ] Integration tests for booking flow
- [ ] E2E tests for calendar interactions
- [ ] Performance testing
- [ ] Accessibility improvements
- [ ] Mobile responsiveness

---

## 9. Testing Strategy

### 9.1 Unit Tests

```typescript
// availabilityService.test.ts
describe('Availability Service', () => {
  describe('checkDateAvailability', () => {
    it('should return unavailable for past dates', async () => {
      const result = await checkDateAvailability('camp123', subDays(new Date(), 1));
      expect(result.available).toBe(false);
      expect(result.reason).toBe('past_date');
    });

    it('should return unavailable for booked dates', async () => {
      // Mock booked date
      const result = await checkDateAvailability('camp123', new Date('2025-01-15'));
      expect(result.available).toBe(false);
      expect(result.reason).toBe('booked');
    });

    it('should return unavailable for blocked dates', async () => {
      // Mock blocked date
      const result = await checkDateAvailability('camp123', new Date('2025-01-20'));
      expect(result.available).toBe(false);
      expect(result.reason).toBe('blocked');
    });

    it('should return available for open dates', async () => {
      const result = await checkDateAvailability('camp123', new Date('2025-02-01'));
      expect(result.available).toBe(true);
    });
  });

  describe('blockDates', () => {
    it('should block date range successfully', async () => {
      const result = await blockDates('camp123', {
        startDate: new Date('2025-01-15'),
        endDate: new Date('2025-01-20')
      }, 'host123', 'Maintenance');
      
      expect(result).toHaveLength(1);
    });

    it('should prevent blocking dates with existing bookings', async () => {
      await expect(
        blockDates('camp123', {
          startDate: new Date('2025-01-10'),
          endDate: new Date('2025-01-15')
        }, 'host123', 'Maintenance')
      ).rejects.toThrow('confirmed booking(s) exist');
    });
  });
});
```

### 9.2 Integration Tests

```typescript
// calendar.integration.test.ts
describe('Calendar Integration', () => {
  it('should update availability in real-time when booking is created', async () => {
    const { getByText, findByText } = render(<AvailabilityCalendar campId="camp123" />);
    
    // Create booking
    await createBooking({
      campId: 'camp123',
      checkInDate: '2025-01-15',
      // ... other fields
    }, 'user123');
    
    // Wait for real-time update
    await waitFor(() => {
      expect(findByText('Booked')).toBeInTheDocument();
    });
  });

  it('should prevent double booking', async () => {
    // User 1 selects date
    const { getByText: getByText1 } = render(<Reserve campId="camp123" />);
    fireEvent.click(getByText1('15'));
    
    // User 2 tries to select same date
    const { getByText: getByText2 } = render(<Reserve campId="camp123" />);
    fireEvent.click(getByText2('15'));
    
    // User 1 completes booking
    fireEvent.click(getByText1('Create Reservation'));
    
    // User 2 should see error
    await waitFor(() => {
      expect(getByText2('This date was just booked')).toBeInTheDocument();
    });
  });
});
```

### 9.3 E2E Tests

```typescript
// calendar.e2e.test.ts (Playwright)
test.describe('Calendar E2E', () => {
  test('host can block dates', async ({ page }) => {
    await page.goto('/host/calendar');
    
    // Select camp
    await page.selectOption('[name="camp"]', 'camp123');
    
    // Select date range
    await page.click('[data-date="2025-01-15"]');
    await page.click('[data-date="2025-01-20"]', { modifiers: ['Shift'] });
    
    // Block dates
    await page.click('text=Block Selected Dates');
    await page.selectOption('[name="reason"]', 'maintenance');
    await page.click('text=Confirm Block');
    
    // Verify blocked
    await expect(page.locator('[data-date="2025-01-15"]')).toHaveClass(/blocked/);
  });

  test('guest cannot book blocked dates', async ({ page }) => {
    await page.goto('/reserve?camp=camp123');
    
    // Try to select blocked date
    await page.click('[data-date="2025-01-15"]');
    
    // Should see error
    await expect(page.locator('text=blocked by host')).toBeVisible();
  });
});
```

---

## 10. Error Handling

### 10.1 User-Facing Errors

```typescript
// Error messages for users
const ERROR_MESSAGES = {
  DATE_BOOKED: 'This date is already booked. Please select another date.',
  DATE_BLOCKED: 'This date has been blocked by the host. Please select another date.',
  DATE_PAST: 'Cannot book past dates. Please select a future date.',
  BOOKING_CONFLICT: 'This date was just booked by another user. Please select a different date.',
  BLOCK_CONFLICT: 'Cannot block dates with existing confirmed bookings.',
  NETWORK_ERROR: 'Unable to check availability. Please check your internet connection.',
  PERMISSION_DENIED: 'You do not have permission to perform this action.',
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
};

// Error handler
function handleAvailabilityError(error: any): string {
  if (error.code === 'permission-denied') {
    return ERROR_MESSAGES.PERMISSION_DENIED;
  } else if (error.code === 'unavailable') {
    return ERROR_MESSAGES.NETWORK_ERROR;
  } else if (error.message?.includes('booked')) {
    return ERROR_MESSAGES.DATE_BOOKED;
  } else if (error.message?.includes('blocked')) {
    return ERROR_MESSAGES.DATE_BLOCKED;
  } else if (error.message?.includes('conflict')) {
    return ERROR_MESSAGES.BOOKING_CONFLICT;
  }
  
  return ERROR_MESSAGES.UNKNOWN_ERROR;
}
```

### 10.2 Retry Logic

```typescript
// Retry availability check with exponential backoff
async function checkAvailabilityWithRetry(
  campId: string,
  date: Date,
  maxRetries: number = 3
): Promise<AvailabilityCheckResult> {
  let lastError: any;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await checkDateAvailability(campId, date);
    } catch (error) {
      lastError = error;
      
      // Don't retry for certain errors
      if (error.code === 'permission-denied') {
        throw error;
      }
      
      // Wait before retrying (exponential backoff)
      const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}
```

---

## 11. Accessibility

### 11.1 Keyboard Navigation

```typescript
// Calendar keyboard navigation
function AvailabilityCalendar() {
  const handleKeyDown = (e: React.KeyboardEvent, date: Date) => {
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        handleDateSelect(date);
        break;
      case 'ArrowRight':
        e.preventDefault();
        focusNextDate(date);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        focusPrevDate(date);
        break;
      case 'ArrowDown':
        e.preventDefault();
        focusDateBelow(date);
        break;
      case 'ArrowUp':
        e.preventDefault();
        focusDateAbove(date);
        break;
    }
  };

  return (
    <div role="grid" aria-label="Calendar">
      {dates.map(date => (
        <button
          key={format(date, 'yyyy-MM-dd')}
          role="gridcell"
          tabIndex={isSameDay(date, focusedDate) ? 0 : -1}
          aria-label={getDateAriaLabel(date)}
          aria-selected={isSameDay(date, selectedDate)}
          aria-disabled={!isDateAvailable(date)}
          onKeyDown={(e) => handleKeyDown(e, date)}
          onClick={() => handleDateSelect(date)}
        >
          {format(date, 'd')}
        </button>
      ))}
    </div>
  );
}
```

### 11.2 Screen Reader Support

```typescript
// Descriptive ARIA labels
function getDateAriaLabel(date: Date, status: DateStatus): string {
  const dateStr = format(date, 'EEEE, MMMM d, yyyy');
  
  switch (status) {
    case 'available':
      return `${dateStr}, available for booking`;
    case 'booked':
      return `${dateStr}, already booked, unavailable`;
    case 'blocked':
      return `${dateStr}, blocked by host, unavailable`;
    case 'selected':
      return `${dateStr}, selected for booking`;
    case 'past':
      return `${dateStr}, past date, unavailable`;
    default:
      return dateStr;
  }
}

// Live region for status updates
function CalendarStatusAnnouncer() {
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    // Announce when availability changes
    if (bookedDates.length > 0) {
      setAnnouncement(`${bookedDates.length} dates are now booked`);
    }
  }, [bookedDates]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {announcement}
    </div>
  );
}
```

---

## 12. Future Enhancements

### 12.1 Advanced Features

1. **Smart Pricing**
   - Dynamic pricing based on demand
   - Weekend/holiday pricing
   - Last-minute discounts
   - Early bird discounts

2. **Recurring Availability Rules**
   - Block every Monday
   - Block weekends
   - Seasonal closures
   - Custom patterns

3. **Availability Sync**
   - Sync with external calendars (Google Calendar, iCal)
   - Import/export availability
   - Multi-platform synchronization

4. **Predictive Availability**
   - ML-based demand forecasting
   - Suggested blocking dates
   - Occupancy optimization

### 12.2 Analytics

1. **Availability Metrics**
   - Occupancy rate over time
   - Average booking lead time
   - Popular booking dates
   - Blocked vs. booked ratio

2. **Revenue Optimization**
   - Revenue per available date
   - Lost revenue from blocked dates
   - Booking conversion rate
   - Cancellation rate analysis

---

## 13. Cost Estimation

### 13.1 Firestore Costs

**Assumptions:**
- 1,000 camps
- Average 30 bookings per camp per month
- Average 5 blocked date ranges per camp
- 10,000 availability checks per day

**Reads:**
- Availability checks: 10,000/day × 30 days = 300,000 reads/month
- Calendar views: 50,000 reads/month
- **Total Reads**: 350,000/month
- **Cost**: $0.06 per 100,000 reads × 3.5 = **$0.21/month**

**Writes:**
- Bookings: 30,000/month
- Blocked dates: 5,000/month
- **Total Writes**: 35,000/month
- **Cost**: $0.18 per 100,000 writes × 0.35 = **$0.06/month**

**Storage:**
- Bookings: 30,000 × 1KB = 30MB
- Blocked dates: 5,000 × 0.5KB = 2.5MB
- **Total Storage**: 32.5MB
- **Cost**: $0.18/GB/month × 0.0325GB = **$0.006/month**

**Total Monthly Cost: ~$0.28**

At 10,000 camps: **~$2.80/month**

---

## 14. Security Considerations

### 14.1 Data Validation

```typescript
// Validate date blocking request
function validateBlockRequest(
  campId: string,
  dateRange: DateRange,
  hostId: string
): ValidationResult {
  const errors: string[] = [];

  // Validate date range
  if (dateRange.endDate < dateRange.startDate) {
    errors.push('End date must be after start date');
  }

  // Validate date range length (max 365 days)
  const daysDiff = differenceInDays(dateRange.endDate, dateRange.startDate);
  if (daysDiff > 365) {
    errors.push('Cannot block more than 365 days at once');
  }

  // Validate not blocking past dates
  if (isBefore(dateRange.startDate, startOfDay(new Date()))) {
    errors.push('Cannot block past dates');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
```

### 14.2 Rate Limiting

```typescript
// Rate limit availability checks to prevent abuse
const availabilityCheckLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: 'Too many availability checks, please try again later'
});

// Apply rate limiting
app.get('/api/availability/:campId/:date', availabilityCheckLimiter, async (req, res) => {
  // Handle availability check
});
```

---

## Conclusion

This comprehensive availability calendar system provides a robust, user-friendly solution for managing camp bookings on the Sahra platform. The system features:

**Key Benefits:**
- ✅ Real-time availability updates
- ✅ Intuitive visual calendar interface
- ✅ Powerful date blocking for hosts
- ✅ Automatic conflict prevention
- ✅ Optimized performance with caching
- ✅ Mobile-responsive design
- ✅ Accessible keyboard navigation
- ✅ Cost-effective Firestore implementation

**Next Steps:**
1. Review and approve this design document
2. Begin Phase 1 implementation (Core Calendar Components)
3. Iteratively implement remaining phases
4. Conduct thorough testing
5. Deploy to production with monitoring

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-XX  
**Author:** Bob (Architect)  
**Status:** Ready for Implementation