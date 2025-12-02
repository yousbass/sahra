# Daily Booking System Conversion Plan

## Overview
Convert the camping booking system from date-range based bookings to pure single-day bookings (Bahrain style).

## Current State
- Reserve page: Already uses single date selection
- Booking interface: Has checkInDate and checkOutDate (same day, different times)
- Search filter: Uses date RANGE (checkIn to checkOut) - NEEDS UPDATE
- Availability checking: Already works with single dates

## Changes Required

### 1. Update FilterSidebar.tsx ✅
- Replace date range picker with single date picker
- Change "Check-in / Check-out Dates" to "Booking Date"
- Update state management to use single date instead of date range

### 2. Update Index.tsx (Search Page) ✅
- Update to display single selected date instead of date range
- Update filter state handling for single date
- Update UI text from "Check-in - Check-out" to "Booking Date"

### 3. Update firestore.ts ✅
- Update FilterState interface to use single date instead of dateRange
- Update searchCamps() function to filter by single date
- Simplify availability checking logic

### 4. Update Booking Interface (Already Correct)
- checkInDate: The booking date (e.g., "2025-11-18")
- checkOutDate: Same as checkInDate for daily bookings
- Check-in time: 8:00 AM (start of camp day)
- Check-out time: 3:00 AM next day (end of camp day)

### 5. Update UI Text Throughout
- "per night" → "per day"
- "Check-in / Check-out" → "Booking Date"
- "Date range" → "Date"

## Implementation Order
1. Update FilterSidebar.tsx - Change to single date picker
2. Update Index.tsx - Handle single date in search
3. Update firestore.ts - Update FilterState and searchCamps()
4. Update CampDetails.tsx - Ensure "per day" pricing is shown
5. Update CreateListing.tsx - Ensure "per day" pricing is used
6. Test the entire flow

## Notes
- Reserve.tsx is already correct (uses single date)
- availability.ts is already correct (checks single dates)
- Booking creation already works correctly for daily bookings
- Only the search/filter system needs updating