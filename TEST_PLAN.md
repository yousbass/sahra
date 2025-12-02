# Comprehensive Test Plan for Sahra App

## Test Environment Setup

### Prerequisites
1. Firebase project configured with Firestore enabled
2. Two test accounts ready:
   - **Account A (Host):** host@test.com
   - **Account B (Guest):** guest@test.com
3. Browser with location services enabled
4. Google Maps link ready for testing

---

## Test Sequence (Execute in Order)

### Phase 1: Account Setup & Host Creation

#### Test 1.1: Sign Up as Host
**Steps:**
1. Navigate to `/signup`
2. Create account with host@test.com
3. Sign in
4. Go to Profile page
5. Click "Become a Host"

**Expected Results:**
- ✅ Account created successfully
- ✅ "Host" badge appears on profile
- ✅ "Host Dashboard" card appears in profile sidebar

**Actual Results:**
- [ ] Pass
- [ ] Fail - Details: ___________

---

#### Test 1.2: Create First Camp Listing
**Steps:**
1. From Profile, click "Host Dashboard"
2. Click "Create New Listing"
3. Fill in basic info:
   - Title: "Golden Sands Desert Camp"
   - Location: "Sakhir, Bahrain"
   - Price: 50
4. **Test Location Input:**
   - Click "Use My Current Location" button
   - OR paste Google Maps URL: `https://maps.google.com/?q=26.0667,50.5577`
5. Verify:
   - Green success badge appears
   - Coordinates display
   - Map preview loads
6. Set max guests: 20
7. Add tents:
   - Add 2 Large Tents
   - Add 3 Small Tents
   - Add 1 Entertainment Tent
8. Configure Entertainment Tent with NEW amenities:
   - ✅ Furnished
   - ✅ Carpeted
   - ✅ TV Available
   - ✅ Ping-Pong Table
   - ✅ Foosball Table
   - ✅ Air Hockey Table
   - ✅ Volleyball Field
   - ✅ Football Field
9. Select amenities:
   - Restrooms
   - Kitchen
   - BBQ Grill
   - Sound System
10. Add description, special features, rules
11. Click "Create Camp Listing"

**Expected Results:**
- ✅ Location coordinates captured successfully
- ✅ Map preview displays correct location
- ✅ All new tent amenities save correctly
- ✅ Success toast appears
- ✅ Redirected to My Listings page
- ✅ New camp appears in My Listings

**Actual Results:**
- [ ] Pass
- [ ] Fail - Details: ___________

**Critical Checks:**
- [ ] Coordinates were REQUIRED (form didn't submit without them)
- [ ] All 5 new tent amenities are available as checkboxes
- [ ] Map preview loaded correctly

---

#### Test 1.3: Verify Camp in Search
**Steps:**
1. Navigate to home page `/`
2. Look for "Golden Sands Desert Camp"

**Expected Results:**
- ✅ Camp appears in search results
- ✅ Shows correct price (50 BD)
- ✅ Shows correct location (Sakhir, Bahrain)
- ✅ Shows "Up to 20" guests badge
- ✅ Shows "6 Tents" badge

**Actual Results:**
- [ ] Pass
- [ ] Fail - Details: ___________

---

#### Test 1.4: View Camp Details
**Steps:**
1. Click on "Golden Sands Desert Camp"
2. Scroll through all sections

**Expected Results:**
- ✅ All camp information displays correctly
- ✅ Tent configuration shows:
  - 2 Large Tents
  - 3 Small Tents
  - 1 Entertainment Tent
- ✅ Entertainment Tent displays NEW amenities:
  - 🏓 Ping-Pong Table badge
  - ⚽ Foosball Table badge
  - 🏒 Air Hockey Table badge
  - 🏐 Volleyball Field badge
  - ⚽ Football Field badge
- ✅ All selected amenities display
- ✅ Description, special features, rules display

**Actual Results:**
- [ ] Pass
- [ ] Fail - Details: ___________

**Critical Checks:**
- [ ] All 5 new amenities display with correct icons/emojis
- [ ] Amenities are clearly visible and formatted nicely

---

### Phase 2: Guest Booking Flow

#### Test 2.1: Sign Up as Guest
**Steps:**
1. Sign out from host account
2. Navigate to `/signup`
3. Create account with guest@test.com
4. Sign in

**Expected Results:**
- ✅ Account created successfully
- ✅ No "Host" badge on profile
- ✅ "Become a Host" card appears

**Actual Results:**
- [ ] Pass
- [ ] Fail - Details: ___________

---

#### Test 2.2: Search and View Camp (Multi-User Test)
**Steps:**
1. Navigate to home page `/`
2. Look for "Golden Sands Desert Camp" (created by host@test.com)

**Expected Results:**
- ✅ Camp from different user (host@test.com) is visible
- ✅ All camp details are accessible
- ✅ Can click to view full details

**Actual Results:**
- [ ] Pass
- [ ] Fail - Details: ___________

**Critical Check:**
- [ ] **MULTI-USER FUNCTIONALITY WORKS** - Guest can see Host's camps

---

#### Test 2.3: Make Booking
**Steps:**
1. From camp details, click "Reserve Now"
2. Fill in booking details:
   - Check-in: Tomorrow's date
   - Check-in time: 14:00
   - Check-out: Day after tomorrow
   - Check-out time: 11:00
   - Guests: 4
   - Phone: +973 1234 5678
   - Special requests: "Please prepare vegetarian meals"
3. Verify booking summary shows:
   - 50 BD × 4 guests × 1 night = 200 BD
4. Click "Confirm Reservation"

**Expected Results:**
- ✅ Success toast appears
- ✅ Redirected to Bookings page
- ✅ New booking appears with all details
- ✅ Total price is correct (200 BD)

**Actual Results:**
- [ ] Pass
- [ ] Fail - Details: ___________

---

#### Test 2.4: View Bookings
**Steps:**
1. Navigate to `/bookings`
2. Review booking details

**Expected Results:**
- ✅ Booking displays with:
  - Camp photo
  - Camp title
  - Location
  - Check-in/out dates and times
  - Number of guests
  - Total price (200 BD)
- ✅ "View Camp" button works

**Actual Results:**
- [ ] Pass
- [ ] Fail - Details: ___________

---

### Phase 3: Profile Management

#### Test 3.1: Update Profile (Guest Account)
**Steps:**
1. Navigate to Profile page
2. Click "Edit Profile"
3. Update:
   - Name: "Ahmed Al-Khalifa"
   - Phone: "+973 9876 5432"
   - Bio: "Love desert camping and adventure"
4. Click "Save"
5. Refresh page

**Expected Results:**
- ✅ Success toast appears
- ✅ Changes persist after refresh
- ✅ Name displays in profile header
- ✅ Phone and bio display correctly

**Actual Results:**
- [ ] Pass
- [ ] Fail - Details: ___________

---

### Phase 4: Host Management

#### Test 4.1: Switch Back to Host Account
**Steps:**
1. Sign out from guest account
2. Sign in with host@test.com
3. Navigate to My Listings

**Expected Results:**
- ✅ "Golden Sands Desert Camp" appears
- ✅ All camp details are correct
- ✅ Can view and delete camp

**Actual Results:**
- [ ] Pass
- [ ] Fail - Details: ___________

---

#### Test 4.2: Create Second Camp with Different Location Method
**Steps:**
1. Click "New Listing"
2. Fill in:
   - Title: "Sunset Oasis Camp"
   - Location: "Zallaq, Bahrain"
   - Price: 60
3. **Test Google Maps URL method:**
   - Paste: `https://www.google.com/maps/@26.0667,50.5577,15z`
   - Verify coordinates extracted
4. Set max guests: 15
5. Add tents with different amenities
6. Submit

**Expected Results:**
- ✅ Google Maps URL parsing works
- ✅ Coordinates extracted correctly
- ✅ Camp created successfully
- ✅ Both camps appear in My Listings
- ✅ Both camps appear in Search

**Actual Results:**
- [ ] Pass
- [ ] Fail - Details: ___________

---

#### Test 4.3: Delete Camp
**Steps:**
1. From My Listings
2. Click delete button on "Sunset Oasis Camp"
3. Confirm deletion
4. Check Search page

**Expected Results:**
- ✅ Confirmation dialog appears
- ✅ Success toast after deletion
- ✅ Camp removed from My Listings
- ✅ Camp removed from Search page
- ✅ "Golden Sands Desert Camp" still exists

**Actual Results:**
- [ ] Pass
- [ ] Fail - Details: ___________

---

### Phase 5: Edge Cases & Error Handling

#### Test 5.1: Location Validation
**Steps:**
1. Try to create camp without setting location
2. Click "Create Camp Listing"

**Expected Results:**
- ✅ Error toast appears
- ✅ Form doesn't submit
- ✅ Clear message: "Please set your location..."

**Actual Results:**
- [ ] Pass
- [ ] Fail - Details: ___________

---

#### Test 5.2: Invalid Google Maps URL
**Steps:**
1. Paste invalid URL: "https://example.com"
2. Check for error

**Expected Results:**
- ✅ Error toast: "Could not extract coordinates..."
- ✅ Coordinates not set
- ✅ Form cannot be submitted

**Actual Results:**
- [ ] Pass
- [ ] Fail - Details: ___________

---

#### Test 5.3: Booking Without Auth
**Steps:**
1. Sign out
2. Navigate to a camp
3. Try to click "Reserve Now"

**Expected Results:**
- ✅ Redirected to sign-in page
- ✅ Error toast: "Please sign in to make a reservation"

**Actual Results:**
- [ ] Pass
- [ ] Fail - Details: ___________

---

### Phase 6: Cross-Browser & Device Testing

#### Test 6.1: Mobile Responsiveness
**Steps:**
1. Open app on mobile device or use browser dev tools
2. Test all pages
3. Test all forms

**Expected Results:**
- ✅ All pages display correctly on mobile
- ✅ Forms are usable on mobile
- ✅ Buttons are tappable
- ✅ Images scale correctly

**Actual Results:**
- [ ] Pass
- [ ] Fail - Details: ___________

---

#### Test 6.2: Different Browsers
**Test on:**
- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Edge

**Expected Results:**
- ✅ App works consistently across browsers
- ✅ No console errors
- ✅ All features functional

**Actual Results:**
- [ ] Pass
- [ ] Fail - Details: ___________

---

## Critical Success Criteria

### Must Pass (Blocking Issues)
- [ ] ✅ Multi-user functionality: Guest can see Host's camps
- [ ] ✅ Create camp saves to Firestore and appears in Search immediately
- [ ] ✅ Bookings save to Firestore and appear in Bookings page
- [ ] ✅ Location input is required and works (GPS or URL)
- [ ] ✅ All 5 new tent amenities display correctly
- [ ] ✅ Profile updates persist in Firestore
- [ ] ✅ Delete camp removes from Firestore and Search

### Should Pass (Important but not blocking)
- [ ] All loading states display correctly
- [ ] All error messages are clear and helpful
- [ ] Navigation works smoothly without loops
- [ ] Mobile responsive design works well

### Nice to Have
- [ ] Smooth animations and transitions
- [ ] Fast load times
- [ ] No console warnings

---

## Test Results Summary

**Date Tested:** ___________
**Tested By:** ___________
**Environment:** Production / Staging / Local

**Overall Status:** 
- [ ] ✅ All tests passed
- [ ] ⚠️ Some tests failed (see details above)
- [ ] ❌ Critical failures - not ready for production

**Critical Issues Found:**
1. ___________
2. ___________
3. ___________

**Minor Issues Found:**
1. ___________
2. ___________
3. ___________

**Notes:**
___________
___________
___________

---

## Sign-off

**Developer:** ___________
**Date:** ___________

**QA Tester:** ___________
**Date:** ___________

**Product Owner:** ___________
**Date:** ___________