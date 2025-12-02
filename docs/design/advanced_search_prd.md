# Product Requirements Document: Advanced Search & Review System

**Project:** Sahra Desert Camp Booking Platform  
**Version:** 1.0  
**Date:** November 12, 2025  
**Author:** Emma (Product Manager)  
**Status:** Draft for Review

---

## Executive Summary

This PRD outlines a comprehensive upgrade to the Sahra platform's search and discovery experience, introducing advanced filtering capabilities, a rating and review system, and enhanced UI/UX. The goal is to transform the basic search page into a powerful, user-friendly discovery tool that helps users find their perfect desert camp while building trust through authentic reviews.

### Key Objectives
- Increase booking conversion rate by 40% through better search relevance
- Improve user satisfaction scores by 35% with advanced filtering
- Build trust and transparency through verified reviews
- Reduce time-to-booking by 50% with intuitive filters

---

## 1. Feature Overview

### 1.1 Advanced Search & Filtering System
A multi-criteria filtering system that allows users to narrow down camp options based on:
- **Price Range**: Min/max price slider (0-500 BD)
- **Location**: Bahrain regions (Northern, Southern, Central, Eastern, Western)
- **Guest Capacity**: Number of guests (1-20+)
- **Tent Types**: Traditional, Luxury, Family, Glamping, Budget
- **Amenities**: WiFi, BBQ, Parking, Bathrooms, Kitchen, AC, Heating, Electricity
- **Special Features**: Pet-friendly, Wheelchair accessible, Family-friendly, Romantic getaway
- **Availability**: Date range picker for specific dates

### 1.2 Rating & Review System
A comprehensive review system featuring:
- **5-Star Rating**: Overall rating with half-star precision
- **Category Ratings**: Cleanliness, Location, Value, Host, Amenities (each 1-5 stars)
- **Written Reviews**: Text reviews with 50-1000 character limit
- **Review Photos**: Optional photo uploads (up to 5 per review)
- **Verified Bookings**: Only users who completed stays can review
- **Review Responses**: Hosts can respond to reviews
- **Helpful Votes**: Users can mark reviews as helpful

### 1.3 Enhanced UI/UX
- **Responsive Filter Sidebar**: Desktop sidebar, mobile bottom sheet
- **Improved Camp Cards**: Show ratings, reviews count, key amenities
- **Sort Options**: Price (low/high), Rating (high/low), Newest, Most reviewed
- **Infinite Scroll**: Smooth loading of results as user scrolls
- **Loading States**: Skeleton screens during data fetch
- **Empty States**: Helpful messages when no results found
- **Filter Chips**: Active filters displayed as removable chips

---

## 2. User Stories

### 2.1 Search & Discovery
**As a user searching for camps**, I want to:
- Filter camps by price range so I can find options within my budget
- Filter by location so I can find camps near my preferred area
- Filter by amenities so I can ensure the camp has facilities I need
- See how many camps match my filters so I know if I need to adjust criteria
- Sort results by rating so I can see the best-reviewed camps first
- Save my filter preferences so I don't have to re-enter them

**Acceptance Criteria:**
- Filters update results in real-time without page reload
- Filter combinations work correctly (AND logic)
- Results count updates as filters change
- Sort options work independently of filters
- Mobile filter experience is smooth and intuitive

### 2.2 Rating & Reviews
**As a user who completed a booking**, I want to:
- Rate my experience with 5 stars so others know my overall satisfaction
- Rate specific aspects (cleanliness, location, etc.) so my review is detailed
- Write a text review so I can share my experience in detail
- Upload photos of the camp so others can see real images
- Edit my review within 30 days so I can correct mistakes
- See my review displayed on the camp page so I know it was published

**Acceptance Criteria:**
- Review form only appears for users with completed bookings
- All rating categories are required
- Text review has minimum 50 characters
- Photos are optional but limited to 5
- Reviews appear immediately after submission
- Users receive confirmation after submitting review

**As a host viewing reviews**, I want to:
- See all reviews for my camps so I understand guest feedback
- Respond to reviews so I can address concerns or thank guests
- See average ratings broken down by category so I know what to improve
- Be notified when I receive a new review so I can respond promptly

**Acceptance Criteria:**
- Hosts can only respond to reviews for their own camps
- Response character limit is 500
- Hosts can edit responses within 7 days
- Email notification sent to host for new reviews

### 2.3 Review Browsing
**As a user browsing camps**, I want to:
- See average rating and review count on camp cards so I can quickly assess quality
- Read reviews on the camp details page so I can make informed decisions
- Filter reviews by rating (e.g., only 5-star) so I can see specific feedback
- Sort reviews by most recent or most helpful so I see relevant reviews first
- See verified booking badges on reviews so I trust the authenticity

**Acceptance Criteria:**
- Average rating displayed prominently with star icons
- Review count shown next to rating
- Reviews section easily accessible on camp details page
- Review filtering and sorting work smoothly
- Verified badge appears on all reviews from actual bookings

---

## 3. Functional Requirements

### 3.1 Search & Filter Specifications

#### 3.1.1 Price Range Filter
- **Type**: Dual-handle range slider
- **Range**: 0 BD - 500 BD
- **Step**: 5 BD increments
- **Default**: Full range (0-500)
- **Behavior**: Updates results in real-time as slider moves
- **Display**: Shows current min/max values above slider

#### 3.1.2 Location Filter
- **Type**: Multi-select checkbox list
- **Options**: 
  - Northern Bahrain
  - Southern Bahrain
  - Central Bahrain
  - Eastern Bahrain
  - Western Bahrain
- **Behavior**: OR logic (shows camps from any selected location)
- **Default**: All locations selected

#### 3.1.3 Guest Capacity Filter
- **Type**: Number input with +/- buttons
- **Range**: 1-20+ guests
- **Default**: 2 guests
- **Behavior**: Shows camps that can accommodate at least the selected number

#### 3.1.4 Tent Type Filter
- **Type**: Multi-select checkbox list
- **Options**: Traditional, Luxury, Family, Glamping, Budget
- **Behavior**: OR logic (shows camps with any selected tent type)
- **Default**: All types selected

#### 3.1.5 Amenities Filter
- **Type**: Multi-select checkbox grid (2 columns on desktop, 1 on mobile)
- **Options**: WiFi, BBQ, Parking, Bathrooms, Kitchen, AC, Heating, Electricity, Fire Pit, Seating Area
- **Behavior**: AND logic (camps must have ALL selected amenities)
- **Default**: None selected
- **Icons**: Each amenity has an icon for visual recognition

#### 3.1.6 Special Features Filter
- **Type**: Multi-select checkbox list
- **Options**: Pet-friendly, Wheelchair accessible, Family-friendly, Romantic getaway, Adventure activities
- **Behavior**: AND logic
- **Default**: None selected

#### 3.1.7 Availability Filter
- **Type**: Date range picker (same as booking calendar)
- **Behavior**: Shows only camps available for the selected dates
- **Default**: Not applied (shows all camps)
- **Integration**: Checks against existing bookings in Firestore

#### 3.1.8 Sort Options
- **Type**: Dropdown select
- **Options**:
  - Recommended (default - algorithm based on rating, reviews, popularity)
  - Price: Low to High
  - Price: High to Low
  - Rating: High to Low
  - Most Reviewed
  - Newest First
- **Behavior**: Applies after filters, updates results immediately

### 3.2 Rating System Rules

#### 3.2.1 Who Can Rate
- Only users who have completed a booking (checkout date has passed)
- One review per booking
- Cannot review own camps (if user is also a host)

#### 3.2.2 Rating Categories
1. **Overall Rating** (required, 1-5 stars, 0.5 increments)
2. **Cleanliness** (required, 1-5 stars)
3. **Location** (required, 1-5 stars)
4. **Value for Money** (required, 1-5 stars)
5. **Host Communication** (required, 1-5 stars)
6. **Amenities & Facilities** (required, 1-5 stars)

#### 3.2.3 Rating Calculation
- **Camp Average Rating**: Mean of all overall ratings, rounded to 1 decimal
- **Category Averages**: Mean of each category across all reviews
- **Weighted Score**: For "Recommended" sort, use formula:
  ```
  Score = (Average Rating × 0.7) + (Review Count × 0.2) + (Recency Factor × 0.1)
  ```

#### 3.2.4 Rating Display
- Stars displayed with filled/half-filled/empty icons
- Average rating shown as number (e.g., "4.7")
- Review count in parentheses (e.g., "(23 reviews)")
- Category breakdown shown on camp details page as horizontal bars

### 3.3 Review System Rules

#### 3.3.1 Review Submission
- **Eligibility**: Booking must be completed (checkout date passed)
- **Timing**: Can review anytime after checkout, no expiration
- **Frequency**: One review per booking
- **Required Fields**: All rating categories, text review (50-1000 chars)
- **Optional Fields**: Photos (up to 5, max 5MB each, JPG/PNG)

#### 3.3.2 Review Content Guidelines
- Minimum 50 characters, maximum 1000 characters
- No profanity or offensive language (basic filter)
- No personal contact information (email, phone)
- No external links
- Must be about the specific camp and booking experience

#### 3.3.3 Review Moderation
- Auto-publish immediately (no pre-moderation)
- Hosts can flag inappropriate reviews for admin review
- Admins can hide/remove reviews that violate guidelines
- Users notified if their review is removed with reason

#### 3.3.4 Review Editing
- Users can edit review within 30 days of submission
- Edit history tracked but not displayed publicly
- Cannot change review after host has responded (to prevent manipulation)

#### 3.3.5 Host Responses
- Hosts can respond to any review on their camps
- One response per review
- Maximum 500 characters
- Can edit response within 7 days
- Response displayed directly under review

#### 3.3.6 Helpful Votes
- Any logged-in user can mark reviews as helpful
- One vote per user per review
- Reviews sorted by helpfulness show vote count
- No downvoting (only positive reinforcement)

---

## 4. Technical Requirements

### 4.1 Database Schema

#### 4.1.1 Reviews Collection
```typescript
interface Review {
  id: string;                          // Auto-generated document ID
  campId: string;                      // Reference to camps collection
  userId: string;                      // Reference to users collection
  bookingId: string;                   // Reference to bookings collection
  
  // Ratings (1-5, 0.5 increments)
  overallRating: number;
  cleanlinessRating: number;
  locationRating: number;
  valueRating: number;
  hostRating: number;
  amenitiesRating: number;
  
  // Review content
  reviewText: string;                  // 50-1000 characters
  photos: string[];                    // Array of photo URLs (max 5)
  
  // Metadata
  createdAt: string;                   // ISO timestamp
  updatedAt?: string;                  // ISO timestamp
  editedAt?: string;                   // ISO timestamp if edited
  
  // Host response
  hostResponse?: {
    text: string;                      // Max 500 characters
    respondedAt: string;               // ISO timestamp
    editedAt?: string;                 // ISO timestamp if edited
  };
  
  // Engagement
  helpfulVotes: number;                // Count of helpful votes
  helpfulVoters: string[];             // Array of user IDs who voted
  
  // Status
  status: 'published' | 'hidden' | 'removed';
  flagged: boolean;
  flagReason?: string;
}
```

#### 4.1.2 Updated Camp Schema
```typescript
interface Camp {
  // ... existing fields ...
  
  // New rating fields
  averageRating: number;               // 0-5, 1 decimal place
  reviewCount: number;                 // Total number of reviews
  ratingBreakdown: {
    cleanliness: number;
    location: number;
    value: number;
    host: number;
    amenities: number;
  };
  
  // For filtering
  tentTypes: string[];                 // ['Traditional', 'Luxury', etc.]
  specialFeatures: string[];           // ['Pet-friendly', 'Wheelchair accessible', etc.]
  
  // Existing amenities field should be array
  amenities: string[];                 // ['WiFi', 'BBQ', 'Parking', etc.]
}
```

#### 4.1.3 Updated Booking Schema
```typescript
interface Booking {
  // ... existing fields ...
  
  // New review tracking
  reviewId?: string;                   // Reference to review if submitted
  reviewEligible: boolean;             // True after checkout date passes
  reviewReminderSent: boolean;         // Email reminder tracking
}
```

### 4.2 Firestore Indexes Required

```javascript
// Composite indexes for filtering
camps:
  - (averageRating DESC, reviewCount DESC)
  - (pricePerNight ASC, averageRating DESC)
  - (location ASC, pricePerNight ASC)
  - (amenities ARRAY, averageRating DESC)
  - (tentTypes ARRAY, pricePerNight ASC)

reviews:
  - (campId ASC, createdAt DESC)
  - (campId ASC, helpfulVotes DESC)
  - (campId ASC, overallRating DESC)
  - (userId ASC, createdAt DESC)
  - (bookingId ASC)
  - (status ASC, createdAt DESC)

bookings:
  - (userId ASC, reviewEligible ASC, checkOutDate DESC)
```

### 4.3 New Firestore Functions

```typescript
// In /workspace/shadcn-ui/src/lib/firestore.ts

// Get camps with filters
export const getCampsWithFilters = async (filters: CampFilters): Promise<Camp[]> => {
  // Complex query with multiple where clauses
  // Implement client-side filtering for complex combinations
};

// Create review
export const createReview = async (review: Omit<Review, 'id' | 'createdAt'>): Promise<string> => {
  // Validate booking eligibility
  // Create review document
  // Update camp ratings
  // Update booking with reviewId
};

// Update camp ratings
export const updateCampRatings = async (campId: string): Promise<void> => {
  // Fetch all reviews for camp
  // Calculate averages
  // Update camp document
};

// Get reviews for camp
export const getReviewsByCamp = async (
  campId: string,
  sortBy: 'recent' | 'helpful' | 'rating'
): Promise<Review[]> => {
  // Query reviews with sorting
};

// Add host response
export const addHostResponse = async (
  reviewId: string,
  responseText: string
): Promise<void> => {
  // Validate host owns the camp
  // Update review with response
};

// Vote review as helpful
export const voteReviewHelpful = async (
  reviewId: string,
  userId: string
): Promise<void> => {
  // Check if user already voted
  // Update helpfulVotes and helpfulVoters
};
```

### 4.4 API Integration Points

#### 4.4.1 Photo Upload
- Use Firebase Storage for review photos
- Path: `/reviews/{reviewId}/{photoIndex}.jpg`
- Resize images to max 1920x1080 on upload
- Generate thumbnails (400x300) for gallery view

#### 4.4.2 Email Notifications
- Send review reminder 3 days after checkout
- Notify host of new review
- Notify user when host responds
- Use Firebase Cloud Functions for email triggers

---

## 5. UI/UX Specifications

### 5.1 Search Page Layout

#### 5.1.1 Desktop Layout (≥1024px)
```
┌─────────────────────────────────────────────────────────┐
│ Header (Logo, Nav, User Menu)                          │
├──────────┬──────────────────────────────────────────────┤
│          │ ┌──────────────────────────────────────────┐ │
│          │ │ Search Bar with Date Picker              │ │
│          │ └──────────────────────────────────────────┘ │
│          │ ┌──────────────────────────────────────────┐ │
│ Filter   │ │ Active Filter Chips                      │ │
│ Sidebar  │ └──────────────────────────────────────────┘ │
│ (280px)  │ ┌──────────────────────────────────────────┐ │
│          │ │ Sort Dropdown    |    X Results Found    │ │
│ - Price  │ └──────────────────────────────────────────┘ │
│ - Location│ ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│ - Guests │ │ Camp    │ │ Camp    │ │ Camp    │       │
│ - Tents  │ │ Card 1  │ │ Card 2  │ │ Card 3  │       │
│ - Amenities│ │ ⭐4.8   │ │ ⭐4.5   │ │ ⭐4.9   │       │
│ - Features│ │ (12)    │ │ (8)     │ │ (23)    │       │
│          │ └─────────┘ └─────────┘ └─────────┘       │
│ [Apply]  │ ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│ [Reset]  │ │ Camp    │ │ Camp    │ │ Camp    │       │
│          │ │ Card 4  │ │ Card 5  │ │ Card 6  │       │
│          │ └─────────┘ └─────────┘ └─────────┘       │
│          │ [Load More / Infinite Scroll]              │
└──────────┴──────────────────────────────────────────────┘
```

#### 5.1.2 Mobile Layout (<768px)
```
┌─────────────────────────────────┐
│ Header (Hamburger, Logo, User)  │
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │ Search Bar                  │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ [🔍 Filters (3)] [Sort ▼]  │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ Active Filter Chips         │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │                             │ │
│ │ Camp Card 1                 │ │
│ │ ⭐4.8 (12 reviews)          │ │
│ │                             │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ Camp Card 2                 │ │
│ └─────────────────────────────┘ │
│ [Infinite Scroll]               │
└─────────────────────────────────┘

[Filter Bottom Sheet - Slides up when clicked]
```

### 5.2 Filter Sidebar Design

#### 5.2.1 Desktop Sidebar
- **Width**: 280px fixed
- **Background**: White with subtle shadow
- **Sections**: Collapsible accordion sections
- **Sticky**: Scrolls with page but header stays visible
- **Buttons**: "Apply Filters" (primary) and "Reset All" (secondary) at bottom

#### 5.2.2 Filter Sections
Each section has:
- **Header**: Bold title with expand/collapse icon
- **Content**: Appropriate input type (slider, checkboxes, etc.)
- **Default State**: All expanded except "Special Features"

**Section Order:**
1. Price Range (always expanded)
2. Location
3. Guest Capacity
4. Tent Types
5. Amenities (grid layout)
6. Special Features (collapsed by default)

#### 5.2.3 Mobile Filter Bottom Sheet
- **Trigger**: Floating button showing filter count
- **Animation**: Slide up from bottom
- **Height**: 80% of screen
- **Header**: "Filters" with close button
- **Content**: Same sections as desktop, scrollable
- **Footer**: Sticky buttons - "Show X Results" (primary), "Clear All" (text button)

### 5.3 Camp Card Design

#### 5.3.1 Card Structure
```
┌─────────────────────────────────────┐
│ ┌─────────────────────────────────┐ │
│ │                                 │ │
│ │ Featured Image (16:9 ratio)    │ │
│ │ [Wishlist Heart Icon]           │ │
│ │                                 │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ Camp Name              50 BD/nt │ │
│ │ ⭐⭐⭐⭐⭐ 4.8 (23 reviews)      │ │
│ │ 📍 Northern Bahrain             │ │
│ │ 👥 Up to 8 guests               │ │
│ │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │ │
│ │ [WiFi] [BBQ] [Parking] [+3]    │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

#### 5.3.2 Card Elements
- **Image**: High-quality photo with 16:9 aspect ratio, lazy loading
- **Wishlist Icon**: Heart outline, fills on click (future feature)
- **Camp Name**: Bold, 18px, truncate if too long
- **Price**: Right-aligned, bold, with "/night" suffix
- **Rating**: 5 filled/empty stars + numeric rating + review count in gray
- **Location**: Icon + text, gray color
- **Capacity**: Icon + text, gray color
- **Amenities**: Icon badges, show first 3-4, "+X more" if additional
- **Hover State**: Subtle shadow increase, slight scale (1.02)

### 5.4 Camp Details Page - Reviews Section

#### 5.4.1 Reviews Summary
```
┌─────────────────────────────────────────────────────────┐
│ Reviews                                                  │
│ ┌───────────────┬───────────────────────────────────┐   │
│ │               │ Cleanliness        ████████░░ 4.7 │   │
│ │     4.8       │ Location           █████████░ 4.9 │   │
│ │   ⭐⭐⭐⭐⭐    │ Value              ███████░░░ 4.5 │   │
│ │  23 reviews   │ Host               █████████░ 4.9 │   │
│ │               │ Amenities          ████████░░ 4.6 │   │
│ └───────────────┴───────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

#### 5.4.2 Review List
```
┌─────────────────────────────────────────────────────────┐
│ [Sort: Most Recent ▼] [Filter: All Ratings ▼]          │
├─────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────┐ │
│ │ [Avatar] Ahmed K.        ⭐⭐⭐⭐⭐ 5.0              │ │
│ │ November 2025            ✓ Verified Booking         │ │
│ │                                                     │ │
│ │ "Amazing experience! The camp was spotless and the │ │
│ │ host was very welcoming. Highly recommend..."      │ │
│ │                                                     │ │
│ │ [Photo] [Photo] [Photo]                            │ │
│ │                                                     │ │
│ │ 👍 Helpful (12)    [Report]                        │ │
│ │                                                     │ │
│ │ ┌─────────────────────────────────────────────────┐│ │
│ │ │ 💬 Response from Host:                          ││ │
│ │ │ "Thank you Ahmed! We're glad you enjoyed..."   ││ │
│ │ └─────────────────────────────────────────────────┘│ │
│ └─────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ [Next Review]                                       │ │
│ └─────────────────────────────────────────────────────┘ │
│ [Load More Reviews]                                     │
└─────────────────────────────────────────────────────────┘
```

### 5.5 Review Submission Form

#### 5.5.1 Form Layout
```
┌─────────────────────────────────────────────────────────┐
│ Write a Review for [Camp Name]                          │
├─────────────────────────────────────────────────────────┤
│ Overall Rating *                                        │
│ ☆☆☆☆☆ (Click to rate)                                  │
│                                                         │
│ Rate Your Experience *                                  │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Cleanliness          ☆☆☆☆☆                         │ │
│ │ Location             ☆☆☆☆☆                         │ │
│ │ Value for Money      ☆☆☆☆☆                         │ │
│ │ Host Communication   ☆☆☆☆☆                         │ │
│ │ Amenities            ☆☆☆☆☆                         │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ Your Review * (50-1000 characters)                      │
│ ┌─────────────────────────────────────────────────────┐ │
│ │                                                     │ │
│ │ [Text area - 5 rows]                                │ │
│ │                                                     │ │
│ └─────────────────────────────────────────────────────┘ │
│ 0/1000 characters                                       │
│                                                         │
│ Add Photos (Optional - Max 5)                           │
│ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐                         │
│ │ + │ │   │ │   │ │   │ │   │                         │
│ └───┘ └───┘ └───┘ └───┘ └───┘                         │
│                                                         │
│ [Cancel]                    [Submit Review]             │
└─────────────────────────────────────────────────────────┘
```

#### 5.5.2 Form Validation
- All star ratings required (show error if missing)
- Text review minimum 50 characters (show character count)
- Photos optional but validate file type (JPG/PNG) and size (max 5MB)
- Show loading state on submit
- Success message after submission
- Redirect to camp details page with review visible

### 5.6 Responsive Breakpoints

- **Mobile**: < 768px (single column, bottom sheet filters)
- **Tablet**: 768px - 1023px (2 column grid, bottom sheet filters)
- **Desktop**: ≥ 1024px (3 column grid, sidebar filters)
- **Large Desktop**: ≥ 1440px (4 column grid, wider sidebar)

### 5.7 Loading & Empty States

#### 5.7.1 Loading State
- Skeleton screens for camp cards (show 6 skeletons)
- Shimmer animation effect
- Filter sidebar shows but is disabled
- "Loading camps..." text

#### 5.7.2 Empty State - No Results
```
┌─────────────────────────────────┐
│                                 │
│        🏕️                       │
│                                 │
│   No camps match your filters   │
│                                 │
│   Try adjusting your search     │
│   criteria or reset filters     │
│                                 │
│   [Reset All Filters]           │
│                                 │
└─────────────────────────────────┘
```

#### 5.7.3 Empty State - No Reviews Yet
```
┌─────────────────────────────────┐
│                                 │
│        ⭐                        │
│                                 │
│   No reviews yet                │
│                                 │
│   Be the first to review this   │
│   camp after your stay!         │
│                                 │
└─────────────────────────────────┘
```

---

## 6. Implementation Phases

### Phase 1: Database & Backend (Week 1)
**Duration**: 5 days  
**Team**: Alex (Engineer)

**Tasks:**
1. Create Reviews collection schema in Firestore
2. Update Camp schema with rating fields
3. Update Booking schema with review tracking
4. Create Firestore indexes
5. Implement Firestore functions:
   - `createReview()`
   - `getReviewsByCamp()`
   - `updateCampRatings()`
   - `addHostResponse()`
   - `voteReviewHelpful()`
6. Set up Firebase Storage for review photos
7. Create Cloud Functions for email notifications
8. Write unit tests for all functions

**Deliverables:**
- Working Firestore collections
- All CRUD operations functional
- Photo upload working
- Email notifications configured

**Success Criteria:**
- All functions pass unit tests
- Can create, read, update reviews via console
- Camp ratings update correctly
- Photos upload successfully

### Phase 2: UI Components (Week 2)
**Duration**: 5 days  
**Team**: Alex (Engineer)

**Tasks:**
1. Create reusable components:
   - `StarRating.tsx` - Interactive star rating component
   - `RatingDisplay.tsx` - Read-only star display
   - `FilterSidebar.tsx` - Desktop filter sidebar
   - `FilterBottomSheet.tsx` - Mobile filter sheet
   - `CampCard.tsx` - Enhanced camp card with ratings
   - `ReviewCard.tsx` - Individual review display
   - `ReviewForm.tsx` - Review submission form
   - `ReviewSummary.tsx` - Rating breakdown display
2. Create filter input components:
   - `PriceRangeSlider.tsx`
   - `LocationFilter.tsx`
   - `AmenitiesFilter.tsx`
   - `TentTypeFilter.tsx`
3. Style all components with Tailwind CSS
4. Ensure mobile responsiveness
5. Add loading and empty states

**Deliverables:**
- 15+ reusable components
- Storybook documentation for each component
- Mobile-responsive designs
- Accessible (ARIA labels, keyboard navigation)

**Success Criteria:**
- Components render correctly in isolation
- Mobile layouts work on various screen sizes
- Accessibility audit passes
- Design matches specifications

### Phase 3: Search & Filter Logic (Week 3)
**Duration**: 5 days  
**Team**: Alex (Engineer)

**Tasks:**
1. Update Index.tsx (search page):
   - Integrate FilterSidebar/FilterBottomSheet
   - Implement filter state management
   - Add filter application logic
   - Implement sort functionality
   - Add infinite scroll or pagination
2. Create filter utility functions:
   - `applyFilters()` - Client-side filtering
   - `buildFirestoreQuery()` - Server-side query building
   - `sortCamps()` - Sort logic
3. Optimize performance:
   - Debounce filter changes
   - Implement result caching
   - Lazy load images
4. Add URL parameter support (shareable filter links)
5. Implement filter persistence (localStorage)

**Deliverables:**
- Fully functional search page with filters
- All filter combinations working
- Sort options working
- Smooth scrolling experience
- Shareable filter URLs

**Success Criteria:**
- Filters update results in <500ms
- Can apply multiple filters simultaneously
- Sort works independently of filters
- No performance issues with 100+ camps
- Filter state persists on page reload

### Phase 4: Rating & Review Features (Week 4)
**Duration**: 7 days  
**Team**: Alex (Engineer)

**Tasks:**
1. Update CampDetails.tsx:
   - Add ReviewSummary section
   - Add ReviewList section
   - Integrate review filtering/sorting
   - Add "Write Review" button (conditional)
2. Create ReviewSubmission.tsx page:
   - Integrate ReviewForm component
   - Add photo upload functionality
   - Implement form validation
   - Add submission logic
3. Update Bookings.tsx:
   - Add "Write Review" button for eligible bookings
   - Link to ReviewSubmission page
4. Implement review eligibility check
5. Add host response functionality
6. Implement helpful votes
7. Create review moderation (admin panel - basic)

**Deliverables:**
- Complete review submission flow
- Reviews display on camp details
- Host can respond to reviews
- Users can vote reviews helpful
- Basic moderation tools

**Success Criteria:**
- Only eligible users can submit reviews
- All rating categories required
- Photos upload successfully
- Reviews appear immediately
- Host responses work correctly
- Helpful votes increment properly

### Phase 5: Testing & Polish (Week 5)
**Duration**: 5 days  
**Team**: Full team

**Tasks:**
1. Comprehensive testing:
   - Test all filter combinations
   - Test review submission flow
   - Test rating calculations
   - Test responsive layouts
   - Test accessibility
   - Test performance with large datasets
2. Bug fixes and refinements
3. UI/UX polish:
   - Animation improvements
   - Loading state refinements
   - Error message improvements
   - Mobile UX optimization
4. Documentation:
   - User guide for filters
   - Host guide for responding to reviews
   - Admin guide for moderation
5. Performance optimization:
   - Image optimization
   - Query optimization
   - Bundle size reduction

**Deliverables:**
- Bug-free application
- Polished UI/UX
- Complete documentation
- Performance benchmarks met

**Success Criteria:**
- Zero critical bugs
- All user flows work smoothly
- Page load time < 3 seconds
- Mobile experience is excellent
- Accessibility score > 90

---

## 7. Testing Requirements

### 7.1 Filter Testing

#### 7.1.1 Single Filter Tests
- **Price Range**: Test min/max boundaries, mid-range
- **Location**: Test each location individually
- **Guest Capacity**: Test 1, 2, 5, 10, 20+ guests
- **Tent Types**: Test each type individually
- **Amenities**: Test each amenity individually
- **Special Features**: Test each feature individually

#### 7.1.2 Combined Filter Tests
- Price + Location
- Price + Amenities
- Location + Tent Type + Amenities
- All filters applied simultaneously
- Filters with no results (verify empty state)

#### 7.1.3 Sort Testing
- Sort by price (ascending/descending) with various filters
- Sort by rating with various filters
- Sort by review count
- Sort by newest

#### 7.1.4 Edge Cases
- No camps in database (empty state)
- All camps filtered out (no results state)
- Single camp matches filters
- All camps match filters
- Rapid filter changes (debouncing)

### 7.2 Rating Calculation Tests

#### 7.2.1 Average Rating Tests
- Single review: Verify average equals review rating
- Multiple reviews: Verify correct average calculation
- Mixed ratings (1-5 stars): Verify accurate average
- Decimal precision: Verify rounding to 1 decimal place

#### 7.2.2 Category Rating Tests
- Verify each category average calculated correctly
- Test with missing category ratings (should not happen, but handle gracefully)
- Verify category ratings update when new review added

#### 7.2.3 Review Count Tests
- Verify count increments with new review
- Verify count doesn't change when review edited
- Verify count doesn't include cancelled/hidden reviews

### 7.3 Review Submission Tests

#### 7.3.1 Eligibility Tests
- User with completed booking can review ✅
- User with pending booking cannot review ❌
- User with cancelled booking cannot review ❌
- User who hasn't booked cannot review ❌
- User can only review once per booking ✅
- Host cannot review own camp ❌

#### 7.3.2 Validation Tests
- All rating categories required (test missing each one)
- Text review minimum 50 characters (test 49, 50, 51)
- Text review maximum 1000 characters (test 999, 1000, 1001)
- Photo upload: Valid formats (JPG, PNG) ✅
- Photo upload: Invalid formats (GIF, BMP) ❌
- Photo upload: Size limit (test 4.9MB ✅, 5.1MB ❌)
- Photo upload: Maximum 5 photos (test 5 ✅, 6 ❌)

#### 7.3.3 Submission Tests
- Successful submission shows success message
- Review appears immediately on camp details page
- Camp rating updates after submission
- User receives confirmation email
- Host receives notification email
- Booking marked with reviewId

#### 7.3.4 Edit Tests
- User can edit within 30 days ✅
- User cannot edit after 30 days ❌
- User cannot edit after host responds ❌
- Edit updates review content
- Edit doesn't change rating averages incorrectly

### 7.4 Host Response Tests

#### 7.4.1 Response Submission
- Host can respond to reviews on their camps ✅
- Host cannot respond to reviews on other camps ❌
- Response maximum 500 characters (test 499 ✅, 501 ❌)
- Response appears under review immediately
- User receives notification email

#### 7.4.2 Response Editing
- Host can edit within 7 days ✅
- Host cannot edit after 7 days ❌
- Edit updates response text
- Edit timestamp recorded

### 7.5 Helpful Votes Tests

#### 7.5.1 Voting Tests
- Logged-in user can vote ✅
- Anonymous user cannot vote ❌
- User can vote once per review ✅
- Second vote from same user doesn't increment ❌
- Vote count displays correctly
- Reviews sorted by helpful votes correctly

### 7.6 Performance Tests

#### 7.6.1 Load Time Tests
- Initial page load < 3 seconds
- Filter application < 500ms
- Review submission < 2 seconds
- Photo upload < 5 seconds per photo

#### 7.6.2 Scalability Tests
- Search page with 100 camps loads smoothly
- Search page with 500 camps loads smoothly
- Camp with 100 reviews displays properly
- Filter with 1000+ camps performs well

#### 7.6.3 Mobile Performance
- Mobile page load < 4 seconds
- Filter bottom sheet opens smoothly
- Infinite scroll works without lag
- Photo upload works on mobile

### 7.7 Accessibility Tests

#### 7.7.1 Keyboard Navigation
- Can navigate filters with keyboard only
- Can submit review with keyboard only
- Can vote helpful with keyboard only
- Tab order is logical

#### 7.7.2 Screen Reader Tests
- Filter labels read correctly
- Star ratings announced properly
- Review content accessible
- Form validation errors announced

#### 7.7.3 ARIA Tests
- All interactive elements have ARIA labels
- Form inputs have proper ARIA attributes
- Error messages associated with inputs
- Loading states announced

### 7.8 Cross-Browser Tests

Test on:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile Safari (iOS)
- Mobile Chrome (Android)

Verify:
- Filters work correctly
- Reviews display properly
- Forms submit successfully
- Styles render correctly

---

## 8. Success Metrics

### 8.1 User Engagement Metrics
- **Search Usage**: 80%+ of users use filters before booking
- **Filter Adoption**: Average 3+ filters applied per search
- **Review Submission Rate**: 40%+ of completed bookings get reviewed
- **Review Reading**: 90%+ of users view reviews before booking
- **Helpful Votes**: Average 5+ helpful votes per review

### 8.2 Business Metrics
- **Booking Conversion Rate**: Increase from 15% to 21% (+40%)
- **Time to Booking**: Decrease from 8 minutes to 4 minutes (-50%)
- **User Satisfaction**: Increase NPS score from 60 to 81 (+35%)
- **Return Visitors**: Increase from 30% to 45% (+50%)
- **Host Satisfaction**: 85%+ hosts satisfied with review system

### 8.3 Technical Metrics
- **Page Load Time**: < 3 seconds (desktop), < 4 seconds (mobile)
- **Filter Response Time**: < 500ms
- **Review Submission Success Rate**: > 98%
- **Photo Upload Success Rate**: > 95%
- **API Error Rate**: < 1%

### 8.4 Quality Metrics
- **Review Quality**: Average review length > 150 characters
- **Review Authenticity**: 100% reviews from verified bookings
- **Host Response Rate**: > 70% of reviews get host response
- **Moderation Rate**: < 2% of reviews flagged/removed

---

## 9. Risk Assessment

### 9.1 Technical Risks

#### 9.1.1 Firestore Query Limitations
**Risk**: Firestore has limited support for complex queries (e.g., multiple array-contains)  
**Impact**: High - May not be able to filter by multiple amenities efficiently  
**Mitigation**: 
- Implement client-side filtering for complex combinations
- Use Algolia or Elasticsearch for advanced search (future enhancement)
- Optimize queries with proper indexing
- Cache results for common filter combinations

#### 9.1.2 Performance with Large Datasets
**Risk**: Slow performance with 1000+ camps and 10,000+ reviews  
**Impact**: Medium - User experience degrades  
**Mitigation**:
- Implement pagination or infinite scroll
- Use Firestore query limits (50 results per page)
- Lazy load images and reviews
- Implement result caching
- Consider CDN for images

#### 9.1.3 Photo Storage Costs
**Risk**: High storage costs if many users upload review photos  
**Impact**: Medium - Increased operational costs  
**Mitigation**:
- Compress images on upload
- Limit to 5 photos per review
- Implement image cleanup for removed reviews
- Consider image CDN with optimization (Cloudinary, Imgix)

### 9.2 User Experience Risks

#### 9.2.1 Filter Complexity
**Risk**: Too many filters may overwhelm users  
**Impact**: Medium - Users may abandon search  
**Mitigation**:
- Use progressive disclosure (collapsible sections)
- Provide smart defaults
- Add "Popular Filters" quick access
- Include helpful tooltips
- Track filter usage and simplify if needed

#### 9.2.2 Review Manipulation
**Risk**: Fake reviews or review bombing by competitors  
**Impact**: High - Damages trust and platform reputation  
**Mitigation**:
- Only verified bookings can review
- Implement basic profanity filter
- Allow flagging inappropriate reviews
- Admin moderation tools
- Track review patterns for suspicious activity
- Consider review verification (photo requirement)

#### 9.2.3 Negative Reviews Impact
**Risk**: Hosts may be discouraged by negative reviews  
**Impact**: Medium - Host churn  
**Mitigation**:
- Allow host responses to all reviews
- Provide host education on handling feedback
- Show balanced view (positive and negative)
- Implement host support system
- Consider minimum review threshold before public display

### 9.3 Business Risks

#### 9.3.1 Low Review Adoption
**Risk**: Users don't submit reviews after stays  
**Impact**: High - System lacks content, trust not built  
**Mitigation**:
- Send review reminder emails (3 days after checkout)
- Offer incentives (discount on next booking, loyalty points)
- Make review process quick and easy
- Show social proof ("Join 500+ reviewers")
- Gamification (badges for reviewers)

#### 9.3.2 Host Resistance
**Risk**: Hosts uncomfortable with public reviews  
**Impact**: Medium - Host churn or reluctance to join  
**Mitigation**:
- Educate hosts on benefits of reviews
- Provide tools to respond to reviews
- Show data on bookings increase with reviews
- Implement grace period (first 5 bookings before reviews public)
- Offer host support for managing feedback

---

## 10. Future Enhancements (Post-Launch)

### 10.1 Advanced Search Features
- **Saved Searches**: Users can save filter combinations
- **Search Alerts**: Email when new camps match saved search
- **Map View**: Interactive map showing camp locations
- **Nearby Search**: Find camps near a specific location
- **Date Flexibility**: "Flexible dates" option showing cheaper alternatives

### 10.2 Enhanced Review Features
- **Review Photos Gallery**: Dedicated photo gallery from all reviews
- **Review Highlights**: AI-extracted key phrases from reviews
- **Review Sentiment Analysis**: Automatic categorization (positive/negative)
- **Review Translation**: Auto-translate reviews to user's language
- **Video Reviews**: Allow short video reviews (30 seconds)

### 10.3 Social Features
- **Wishlist**: Save favorite camps for later
- **Share Camps**: Share camps on social media
- **Friend Recommendations**: See what friends have reviewed
- **User Profiles**: Public profiles showing reviews and bookings
- **Follow Hosts**: Get notified of new camps from favorite hosts

### 10.4 Personalization
- **Recommended Camps**: ML-based recommendations
- **Personalized Filters**: Remember user's common filters
- **Price Alerts**: Notify when camp price drops
- **Similar Camps**: "You may also like" suggestions
- **Booking History**: Quick rebook previous camps

### 10.5 Host Tools
- **Review Analytics**: Detailed breakdown of review trends
- **Competitor Analysis**: Compare ratings with similar camps
- **Response Templates**: Quick response options for common feedback
- **Review Insights**: AI suggestions for improvement areas
- **Performance Dashboard**: Track rating changes over time

---

## 11. Appendices

### Appendix A: Wireframes
[To be created by design team - detailed wireframes for all screens]

### Appendix B: API Documentation
[Detailed API documentation for all Firestore functions]

### Appendix C: Database Schema Diagram
[Visual diagram showing relationships between collections]

### Appendix D: User Flow Diagrams
[Step-by-step user flows for key interactions]

### Appendix E: Competitive Analysis
[Detailed comparison with Airbnb, Booking.com, Glamping Hub]

---

## 12. Approval & Sign-off

**Product Manager**: Emma  
**Engineering Lead**: Alex  
**Project Manager**: Mike  

**Approval Date**: _________________  
**Target Launch Date**: 5 weeks from approval  

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Nov 12, 2025 | Emma | Initial PRD creation |

---

**Next Steps:**
1. Review PRD with full team
2. Estimate effort for each phase
3. Finalize timeline and resource allocation
4. Begin Phase 1: Database & Backend implementation
5. Schedule weekly progress reviews

---

*This PRD is a living document and will be updated as requirements evolve during implementation.*