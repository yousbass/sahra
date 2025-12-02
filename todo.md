# Sahra - Bahrain Desert Camp Reservations App
## MVP Development Plan

### Overview
Mobile-first desert camp booking app with guest and host features, dark theme, BD currency.

### Core Files to Create/Modify (Max 8 files)

1. **src/pages/Index.tsx** - Main Search tab (default landing page)
   - List of camp cards with photo, title, location, price
   - Navigate to camp details on tap

2. **src/pages/CampDetails.tsx** - Individual camp view
   - Hero image, title, location, price
   - Description and facilities (only selected ones)
   - "Make Reservation" button

3. **src/pages/Reserve.tsx** - Reservation flow
   - Date pickers (check-in/check-out)
   - Price summary
   - Confirm reservation button

4. **src/pages/Bookings.tsx** - Guest bookings list
   - Show user's reservations
   - Handle signed-in/signed-out states

5. **src/pages/Host.tsx** - Host dashboard
   - Become a host CTA
   - Create listing and My Listings buttons

6. **src/pages/CreateListing.tsx** - Host creates new camp
   - Form: title, photo URL, price, location, description
   - Facilities checklist (10 options)
   - Publish camp button

7. **src/pages/Profile.tsx** - Auth and account management
   - Sign up / Sign in forms
   - User profile when signed in
   - Sign out button

8. **src/App.tsx** - Update routing and mobile bottom tabs
   - Bottom tab navigation (Search, Bookings, Host, Profile)
   - Route configuration

### Data Structure (localStorage for MVP)
- camps: { id, slug, title, photo, price, location, description, facilities[], hostId }
- bookings: { id, campId, userId, checkIn, checkOut, status }
- users: { id, email, name, password, isHost }
- currentUser: { id, email, name, isHost } (session)

### Implementation Order
1. Update App.tsx with bottom tab navigation and routes
2. Create Search page (Index.tsx) with camp cards
3. Create CampDetails page with facilities display
4. Create Reserve page with date selection
5. Create Profile page with auth forms
6. Create Bookings page with user reservations
7. Create Host dashboard page
8. Create CreateListing page with facilities checklist
9. Update index.html title to "Sahra"
10. Run lint and build checks

### Design Principles
- Mobile-first: bottom tabs, large touch targets (≥44px)
- Dark theme with high contrast
- Rounded cards (2xl), full-bleed images
- BD currency throughout
- Clear empty states and error messages
- Thumb-reachable navigation