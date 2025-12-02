# Advanced Search & Review System - System Design Document

## 1. Architecture Overview

### 1.1 High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend Layer                           │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Index Page   │  │ CampDetails  │  │ Bookings     │          │
│  │ (Search)     │  │ Page         │  │ Page         │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                  │                  │                  │
│  ┌──────▼──────────────────▼──────────────────▼───────┐         │
│  │         Component Layer                             │         │
│  │  ┌─────────────┐  ┌─────────────┐  ┌────────────┐ │         │
│  │  │FilterSidebar│  │ReviewsList  │  │ReviewForm  │ │         │
│  │  └─────────────┘  └─────────────┘  └────────────┘ │         │
│  │  ┌─────────────┐  ┌─────────────┐  ┌────────────┐ │         │
│  │  │CampCard     │  │ReviewCard   │  │RatingStars │ │         │
│  │  └─────────────┘  └─────────────┘  └────────────┘ │         │
│  └─────────────────────────────────────────────────────┘         │
├─────────────────────────────────────────────────────────────────┤
│                      Service Layer                               │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              firestore.ts (API Layer)                     │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │   │
│  │  │Camp Services │  │Review        │  │Booking       │   │   │
│  │  │              │  │Services      │  │Services      │   │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘   │   │
│  └──────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│                      State Management                            │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  React Query / SWR for Caching & State                   │   │
│  │  - Camp list cache (5min TTL)                            │   │
│  │  - Review cache (10min TTL)                              │   │
│  │  - Filter state (local)                                  │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Firebase/Firestore                            │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   camps      │  │   reviews    │  │   bookings   │          │
│  │  collection  │  │  collection  │  │  collection  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                  │
│  Composite Indexes:                                             │
│  - camps: location + price                                      │
│  - camps: averageRating (desc)                                  │
│  - reviews: campId + createdAt (desc)                           │
│  - reviews: userId + createdAt (desc)                           │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Component Relationship Diagram

```
Index Page (Search)
├── FilterSidebar
│   ├── PriceRangeSlider
│   ├── LocationSelect
│   ├── GuestCountInput
│   ├── AmenitiesCheckboxGroup
│   ├── TentTypeFilter
│   └── SortBySelect
├── SearchResultsGrid
│   └── CampCard (multiple)
│       └── RatingStars (display-only)
└── LoadingState / EmptyState

CampDetails Page
├── CampInfo
│   └── RatingStars (display-only)
├── ReviewsSummary
│   ├── RatingDistributionChart
│   └── OverallRating
├── ReviewsList
│   ├── ReviewCard (multiple)
│   │   ├── RatingStars (display-only)
│   │   ├── ReviewText
│   │   ├── UserInfo
│   │   └── HelpfulButton
│   └── LoadMoreButton
└── WriteReviewButton
    └── ReviewFormModal
        ├── RatingStars (interactive)
        ├── ReviewTextArea
        └── SubmitButton

Bookings Page
└── BookingCard (multiple)
    └── WriteReviewButton (if eligible)
```

### 1.3 Data Flow Overview

**Search & Filter Flow:**
```
User Input → FilterState Update → Debounce (300ms) → 
Firestore Query → Results → Cache → UI Update
```

**Review Submission Flow:**
```
User Completes Booking → Eligible to Review → 
User Writes Review → Validation → Create Review Document → 
Update Camp Rating → Invalidate Cache → UI Update
```

---

## 2. Database Schema

### 2.1 Reviews Collection

```typescript
interface Review {
  id: string;                    // Auto-generated Firestore ID
  campId: string;                // Reference to camp
  userId: string;                // Reference to user
  bookingId: string;             // Reference to booking (ensures one review per booking)
  rating: number;                // 1-5 stars (integer)
  reviewText: string;            // Min 20 chars, max 1000 chars
  userName: string;              // Cached from user profile
  userPhoto?: string;            // Optional user avatar URL
  checkInDate: string;           // ISO date string (YYYY-MM-DD)
  checkOutDate: string;          // ISO date string (YYYY-MM-DD)
  createdAt: Timestamp;          // Firestore server timestamp
  updatedAt?: Timestamp;         // For edits (future feature)
  helpful: number;               // Count of helpful votes (default: 0)
  reported: boolean;             // Flag for moderation (default: false)
  verified: boolean;             // True if booking completed (default: true)
}
```

**Validation Rules:**
- `rating`: Required, integer between 1-5
- `reviewText`: Required, 20-1000 characters
- `bookingId`: Must reference a completed booking
- One review per `userId + campId + bookingId` combination

### 2.2 Updated Camp Schema

```typescript
interface Camp {
  // Existing fields
  id: string;
  slug: string;
  title: string;
  photo: string;
  price: number;
  location: string;
  description?: string;
  amenities?: string[];
  maxGuests?: number;
  campArea?: number;
  coordinates?: { lat: number; lng: number };
  tents?: TentConfig[];
  tentConfiguration?: { large: number; small: number; entertainment: number };
  specialFeatures?: string;
  rules?: string;
  hostId: string;
  hostName?: string;
  createdAt: string | Timestamp;
  
  // NEW FIELDS for Review System
  averageRating: number;         // Calculated average (0-5, 1 decimal)
  reviewCount: number;           // Total number of reviews
  ratingDistribution: {          // Count of each star rating
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}
```

**Default Values for New Camps:**
```typescript
{
  averageRating: 0,
  reviewCount: 0,
  ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
}
```

### 2.3 Updated Booking Schema

```typescript
interface Booking {
  // Existing fields
  id: string;
  campId: string;
  campTitle: string;
  campPhoto: string;
  campLocation: string;
  checkIn: string;
  checkOut: string;
  checkInDate: string;
  checkOutDate: string;
  guests: number;
  totalPrice: number;
  userId: string;
  userName?: string;
  userEmail?: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  createdAt: string | Timestamp;
  cancelledAt?: string;
  
  // NEW FIELDS for Review System
  reviewId?: string;             // Reference to review (if written)
  completedAt?: string;          // ISO timestamp when booking completed
  eligibleForReview: boolean;    // True after checkout date passes
}
```

### 2.4 Firestore Indexes Required

**Single-Field Indexes:**
```
camps:
  - averageRating (descending)
  - price (ascending, descending)
  - reviewCount (descending)
  - location (ascending)
  - maxGuests (ascending)

reviews:
  - campId (ascending)
  - userId (ascending)
  - createdAt (descending)
  - rating (descending)

bookings:
  - eligibleForReview (ascending)
  - completedAt (descending)
```

**Composite Indexes:**
```
camps:
  1. location (asc) + price (asc)
  2. location (asc) + price (desc)
  3. location (asc) + averageRating (desc)
  4. maxGuests (asc) + price (asc)
  5. averageRating (desc) + price (asc)

reviews:
  1. campId (asc) + createdAt (desc)
  2. campId (asc) + rating (desc)
  3. userId (asc) + createdAt (desc)
  4. campId (asc) + helpful (desc)

bookings:
  1. userId (asc) + eligibleForReview (asc) + completedAt (desc)
  2. campId (asc) + status (asc) + checkInDate (asc)
```

### 2.5 Data Relationships Diagram

```
┌──────────────┐         ┌──────────────┐
│    users     │         │    camps     │
│              │         │              │
│ - id (PK)    │         │ - id (PK)    │
│ - email      │         │ - hostId (FK)│
│ - name       │         │ - rating     │
└──────┬───────┘         └──────┬───────┘
       │                        │
       │ 1:N                    │ 1:N
       │                        │
       ▼                        ▼
┌──────────────┐         ┌──────────────┐
│   bookings   │◄────────│   reviews    │
│              │  1:1    │              │
│ - id (PK)    │         │ - id (PK)    │
│ - userId (FK)│         │ - campId (FK)│
│ - campId (FK)│         │ - userId (FK)│
│ - reviewId   │         │ - bookingId  │
└──────────────┘         └──────────────┘
```

---

## 3. Component Specifications

### 3.1 Component Hierarchy Tree

```
src/components/
├── search/
│   ├── FilterSidebar.tsx
│   ├── PriceRangeSlider.tsx
│   ├── LocationSelect.tsx
│   ├── GuestCountInput.tsx
│   ├── AmenitiesCheckboxGroup.tsx
│   ├── TentTypeFilter.tsx
│   └── SortBySelect.tsx
├── reviews/
│   ├── RatingStars.tsx
│   ├── ReviewCard.tsx
│   ├── ReviewForm.tsx
│   ├── ReviewsList.tsx
│   ├── ReviewsSummary.tsx
│   └── RatingDistributionChart.tsx
└── camps/
    ├── CampCard.tsx (updated)
    └── CampGrid.tsx
```

### 3.2 FilterSidebar Component

**File:** `src/components/search/FilterSidebar.tsx`

```typescript
interface FilterSidebarProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  campCount: number;
  isLoading: boolean;
  onReset: () => void;
}

interface FilterState {
  priceRange: [number, number];           // [min, max] in BD
  locations: string[];                    // Array of selected locations
  minGuests: number;                      // Minimum guest capacity
  amenities: string[];                    // Selected amenities
  tentTypes: ('large' | 'small' | 'entertainment')[];
  minRating: number;                      // 0-5, filter camps >= this rating
  sortBy: 'price_asc' | 'price_desc' | 'rating' | 'newest';
}

// Component State
const [localFilters, setLocalFilters] = useState<FilterState>(filters);
const [isExpanded, setIsExpanded] = useState(true);

// Behavior
- Desktop: Sticky sidebar, always visible
- Mobile: Bottom sheet modal, opens on "Filters" button click
- Apply button triggers onFilterChange with debounce
- Reset button clears all filters to defaults
- Show active filter count badge
```

**Default Filter Values:**
```typescript
const DEFAULT_FILTERS: FilterState = {
  priceRange: [0, 200],
  locations: [],
  minGuests: 1,
  amenities: [],
  tentTypes: [],
  minRating: 0,
  sortBy: 'newest'
};
```

### 3.3 RatingStars Component

**File:** `src/components/reviews/RatingStars.tsx`

```typescript
interface RatingStarsProps {
  rating: number;                         // 0-5, supports decimals for display
  size?: 'sm' | 'md' | 'lg';             // Icon size
  interactive?: boolean;                  // Enable click to rate
  onChange?: (rating: number) => void;    // Callback for interactive mode
  showValue?: boolean;                    // Show numeric value next to stars
  className?: string;
}

// Variants
- Display Mode: Shows filled/half/empty stars based on rating
  - 4.7 → ★★★★☆ (4 full, 1 half)
- Interactive Mode: Hover preview, click to select
  - Highlights stars on hover
  - Click to set rating (1-5 only, no decimals)
  
// Styling
- sm: 16px icons
- md: 20px icons (default)
- lg: 24px icons
- Color: #D97706 (terracotta-600) for filled
- Color: #E5E7EB (gray-200) for empty
```

### 3.4 ReviewCard Component

**File:** `src/components/reviews/ReviewCard.tsx`

```typescript
interface ReviewCardProps {
  review: Review;
  showCampName?: boolean;                 // Show camp name (for user's reviews page)
  onHelpful?: (reviewId: string) => void; // Callback for helpful button
  currentUserId?: string;                 // To disable helpful on own reviews
}

// Layout
┌─────────────────────────────────────────────────┐
│ [Avatar] UserName          ★★★★☆ 4.0           │
│          Stayed: Jan 15-17, 2024                │
├─────────────────────────────────────────────────┤
│ Review text goes here...                        │
│ Multiple lines supported.                       │
├─────────────────────────────────────────────────┤
│ [👍 Helpful (12)]  [Report]    2 days ago      │
└─────────────────────────────────────────────────┘

// Features
- Verified badge if review.verified === true
- Truncate long reviews with "Read more" link
- Helpful button (disabled if user already voted or is author)
- Report button (opens modal for abuse reporting)
- Relative date display (e.g., "2 days ago")
```

### 3.5 ReviewForm Component

**File:** `src/components/reviews/ReviewForm.tsx`

```typescript
interface ReviewFormProps {
  campId: string;
  campName: string;
  bookingId: string;
  checkInDate: string;
  checkOutDate: string;
  onSubmit: (reviewData: ReviewFormData) => Promise<void>;
  onCancel: () => void;
}

interface ReviewFormData {
  rating: number;
  reviewText: string;
}

// Validation
- Rating: Required, 1-5 stars
- Review Text: Required, 20-1000 characters
- Show character count (e.g., "45/1000")
- Disable submit until valid

// Layout (Modal)
┌─────────────────────────────────────────────────┐
│ Write a Review for [Camp Name]           [X]   │
├─────────────────────────────────────────────────┤
│ Your Stay: Jan 15-17, 2024                      │
│                                                  │
│ Overall Rating *                                │
│ ☆☆☆☆☆ (Click to rate)                          │
│                                                  │
│ Your Review *                                   │
│ ┌─────────────────────────────────────────────┐ │
│ │ Share your experience...                    │ │
│ │                                             │ │
│ │                                             │ │
│ └─────────────────────────────────────────────┘ │
│ 45/1000 characters (minimum 20)                 │
│                                                  │
│ [Cancel]                    [Submit Review]     │
└─────────────────────────────────────────────────┘
```

### 3.6 ReviewsList Component

**File:** `src/components/reviews/ReviewsList.tsx`

```typescript
interface ReviewsListProps {
  campId: string;
  initialReviews?: Review[];
  sortBy?: 'newest' | 'highest' | 'lowest' | 'helpful';
  limit?: number;                         // Reviews per page
}

// Features
- Pagination: Show 5 reviews initially, load more on button click
- Sort options: Newest, Highest rated, Lowest rated, Most helpful
- Loading skeleton while fetching
- Empty state: "No reviews yet. Be the first to review!"
- Error state with retry button

// State Management
const [reviews, setReviews] = useState<Review[]>(initialReviews || []);
const [loading, setLoading] = useState(false);
const [hasMore, setHasMore] = useState(true);
const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
```

### 3.7 ReviewsSummary Component

**File:** `src/components/reviews/ReviewsSummary.tsx`

```typescript
interface ReviewsSummaryProps {
  campId: string;
  averageRating: number;
  reviewCount: number;
  ratingDistribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

// Layout
┌─────────────────────────────────────────────────┐
│         4.7 ★★★★☆                               │
│     Based on 128 reviews                        │
├─────────────────────────────────────────────────┤
│ 5 ★ ████████████████████████░░ 85              │
│ 4 ★ ████████░░░░░░░░░░░░░░░░░░ 28              │
│ 3 ★ ███░░░░░░░░░░░░░░░░░░░░░░░ 10              │
│ 2 ★ ██░░░░░░░░░░░░░░░░░░░░░░░░  3              │
│ 1 ★ █░░░░░░░░░░░░░░░░░░░░░░░░░  2              │
└─────────────────────────────────────────────────┘

// Features
- Large average rating display
- Visual bar chart for distribution
- Clickable bars to filter reviews by rating
- Responsive: stacks vertically on mobile
```

---

## 4. API Specifications

### 4.1 Camp Services (Extended)

**File:** `src/lib/firestore.ts`

```typescript
/**
 * Get camps with advanced filtering
 * Supports price range, location, guests, amenities, rating, and sorting
 */
export const getCampsWithFilters = async (
  filters: FilterState
): Promise<Camp[]> => {
  console.log('=== GET CAMPS WITH FILTERS ===');
  console.log('Filters:', filters);
  
  if (!db) {
    throw new Error('Firestore is not initialized');
  }
  
  try {
    let q = query(collection(db, 'camps'));
    
    // Apply location filter
    if (filters.locations.length > 0) {
      q = query(q, where('location', 'in', filters.locations));
    }
    
    // Apply minimum guests filter
    if (filters.minGuests > 1) {
      q = query(q, where('maxGuests', '>=', filters.minGuests));
    }
    
    // Apply minimum rating filter
    if (filters.minRating > 0) {
      q = query(q, where('averageRating', '>=', filters.minRating));
    }
    
    // Apply sorting
    switch (filters.sortBy) {
      case 'price_asc':
        q = query(q, orderBy('price', 'asc'));
        break;
      case 'price_desc':
        q = query(q, orderBy('price', 'desc'));
        break;
      case 'rating':
        q = query(q, orderBy('averageRating', 'desc'));
        break;
      case 'newest':
      default:
        q = query(q, orderBy('createdAt', 'desc'));
    }
    
    const snapshot = await getDocs(q);
    let camps = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Camp[];
    
    // Client-side filtering for complex conditions
    
    // Filter by price range
    camps = camps.filter(camp => 
      camp.price >= filters.priceRange[0] && 
      camp.price <= filters.priceRange[1]
    );
    
    // Filter by amenities (camp must have ALL selected amenities)
    if (filters.amenities.length > 0) {
      camps = camps.filter(camp => 
        filters.amenities.every(amenity => 
          camp.amenities?.includes(amenity)
        )
      );
    }
    
    // Filter by tent types
    if (filters.tentTypes.length > 0) {
      camps = camps.filter(camp => {
        if (!camp.tentConfiguration) return false;
        return filters.tentTypes.some(type => 
          camp.tentConfiguration![type] > 0
        );
      });
    }
    
    console.log(`✅ Found ${camps.length} camps matching filters`);
    return camps;
    
  } catch (error) {
    console.error('❌ Error filtering camps:', error);
    throw error;
  }
};

/**
 * Get unique locations from all camps
 * Used to populate location filter dropdown
 */
export const getCampLocations = async (): Promise<string[]> => {
  try {
    const camps = await getCamps();
    const locations = [...new Set(camps.map(camp => camp.location))];
    return locations.sort();
  } catch (error) {
    console.error('❌ Error fetching locations:', error);
    throw error;
  }
};

/**
 * Get unique amenities from all camps
 * Used to populate amenities filter checkboxes
 */
export const getCampAmenities = async (): Promise<string[]> => {
  try {
    const camps = await getCamps();
    const amenitiesSet = new Set<string>();
    camps.forEach(camp => {
      camp.amenities?.forEach(amenity => amenitiesSet.add(amenity));
    });
    return Array.from(amenitiesSet).sort();
  } catch (error) {
    console.error('❌ Error fetching amenities:', error);
    throw error;
  }
};
```

### 4.2 Review Services (New)

```typescript
/**
 * Create a new review
 * Automatically updates camp rating after creation
 */
export const createReview = async (
  reviewData: Omit<Review, 'id' | 'createdAt' | 'helpful' | 'reported' | 'verified'>,
  userId: string
): Promise<string> => {
  console.log('=== CREATE REVIEW ===');
  console.log('Review data:', reviewData);
  
  if (!db) {
    throw new Error('Firestore is not initialized');
  }
  
  try {
    // Validate user can review this booking
    const canReview = await canUserReview(userId, reviewData.campId, reviewData.bookingId);
    if (!canReview) {
      throw new Error('You are not eligible to review this camp');
    }
    
    // Check if review already exists for this booking
    const existingReview = await getReviewByBooking(reviewData.bookingId);
    if (existingReview) {
      throw new Error('You have already reviewed this booking');
    }
    
    // Create review document
    const review = {
      ...reviewData,
      userId,
      helpful: 0,
      reported: false,
      verified: true,
      createdAt: serverTimestamp()
    };
    
    const docRef = await addDoc(collection(db, 'reviews'), review);
    console.log('✅ Review created with ID:', docRef.id);
    
    // Update booking with reviewId
    await updateDoc(doc(db, 'bookings', reviewData.bookingId), {
      reviewId: docRef.id
    });
    
    // Update camp rating
    await updateCampRating(reviewData.campId);
    
    return docRef.id;
    
  } catch (error) {
    console.error('❌ Error creating review:', error);
    throw error;
  }
};

/**
 * Get reviews for a specific camp with pagination
 */
export const getReviewsByCamp = async (
  campId: string,
  limitCount: number = 5,
  lastDoc?: DocumentSnapshot
): Promise<{ reviews: Review[]; lastDoc: DocumentSnapshot | null }> => {
  console.log('=== GET REVIEWS BY CAMP ===');
  console.log('Camp ID:', campId);
  
  if (!db) {
    throw new Error('Firestore is not initialized');
  }
  
  try {
    let q = query(
      collection(db, 'reviews'),
      where('campId', '==', campId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    
    if (lastDoc) {
      q = query(q, startAfter(lastDoc));
    }
    
    const snapshot = await getDocs(q);
    const reviews = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Review[];
    
    const lastVisible = snapshot.docs[snapshot.docs.length - 1] || null;
    
    console.log(`✅ Fetched ${reviews.length} reviews`);
    return { reviews, lastDoc: lastVisible };
    
  } catch (error) {
    console.error('❌ Error fetching reviews:', error);
    throw error;
  }
};

/**
 * Get all reviews by a specific user
 */
export const getReviewsByUser = async (userId: string): Promise<Review[]> => {
  console.log('=== GET REVIEWS BY USER ===');
  
  if (!db) {
    throw new Error('Firestore is not initialized');
  }
  
  try {
    const q = query(
      collection(db, 'reviews'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const reviews = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Review[];
    
    console.log(`✅ Fetched ${reviews.length} reviews for user`);
    return reviews;
    
  } catch (error) {
    console.error('❌ Error fetching user reviews:', error);
    throw error;
  }
};

/**
 * Get review by booking ID
 */
export const getReviewByBooking = async (
  bookingId: string
): Promise<Review | null> => {
  if (!db) {
    throw new Error('Firestore is not initialized');
  }
  
  try {
    const q = query(
      collection(db, 'reviews'),
      where('bookingId', '==', bookingId),
      limit(1)
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return null;
    }
    
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as Review;
    
  } catch (error) {
    console.error('❌ Error fetching review by booking:', error);
    throw error;
  }
};

/**
 * Update camp rating based on all reviews
 * Recalculates average and distribution
 */
export const updateCampRating = async (campId: string): Promise<void> => {
  console.log('=== UPDATE CAMP RATING ===');
  console.log('Camp ID:', campId);
  
  if (!db) {
    throw new Error('Firestore is not initialized');
  }
  
  try {
    // Get all reviews for this camp
    const q = query(
      collection(db, 'reviews'),
      where('campId', '==', campId)
    );
    
    const snapshot = await getDocs(q);
    const reviews = snapshot.docs.map(doc => doc.data()) as Review[];
    
    if (reviews.length === 0) {
      // No reviews, set to defaults
      await updateDoc(doc(db, 'camps', campId), {
        averageRating: 0,
        reviewCount: 0,
        ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
      });
      return;
    }
    
    // Calculate average rating
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = Math.round((totalRating / reviews.length) * 10) / 10;
    
    // Calculate distribution
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(review => {
      distribution[review.rating as keyof typeof distribution]++;
    });
    
    // Update camp document
    await updateDoc(doc(db, 'camps', campId), {
      averageRating,
      reviewCount: reviews.length,
      ratingDistribution: distribution
    });
    
    console.log(`✅ Updated camp rating: ${averageRating} (${reviews.length} reviews)`);
    
  } catch (error) {
    console.error('❌ Error updating camp rating:', error);
    throw error;
  }
};

/**
 * Check if user can review a camp
 * User must have a completed booking for this camp
 */
export const canUserReview = async (
  userId: string,
  campId: string,
  bookingId?: string
): Promise<boolean> => {
  console.log('=== CHECK CAN USER REVIEW ===');
  
  if (!db) {
    throw new Error('Firestore is not initialized');
  }
  
  try {
    // If bookingId provided, check that specific booking
    if (bookingId) {
      const bookingRef = doc(db, 'bookings', bookingId);
      const bookingSnap = await getDoc(bookingRef);
      
      if (!bookingSnap.exists()) {
        return false;
      }
      
      const booking = bookingSnap.data() as Booking;
      
      // Check if booking belongs to user and is for this camp
      if (booking.userId !== userId || booking.campId !== campId) {
        return false;
      }
      
      // Check if booking is completed
      const checkOutDate = new Date(booking.checkOutDate);
      const today = new Date();
      
      return checkOutDate < today && booking.status !== 'cancelled';
    }
    
    // Otherwise, check if user has any completed booking for this camp
    const q = query(
      collection(db, 'bookings'),
      where('userId', '==', userId),
      where('campId', '==', campId)
    );
    
    const snapshot = await getDocs(q);
    
    const today = new Date();
    const hasCompletedBooking = snapshot.docs.some(doc => {
      const booking = doc.data() as Booking;
      const checkOutDate = new Date(booking.checkOutDate);
      return checkOutDate < today && booking.status !== 'cancelled';
    });
    
    return hasCompletedBooking;
    
  } catch (error) {
    console.error('❌ Error checking review eligibility:', error);
    return false;
  }
};

/**
 * Increment helpful count for a review
 */
export const markReviewHelpful = async (reviewId: string): Promise<void> => {
  console.log('=== MARK REVIEW HELPFUL ===');
  
  if (!db) {
    throw new Error('Firestore is not initialized');
  }
  
  try {
    const reviewRef = doc(db, 'reviews', reviewId);
    const reviewSnap = await getDoc(reviewRef);
    
    if (!reviewSnap.exists()) {
      throw new Error('Review not found');
    }
    
    const review = reviewSnap.data() as Review;
    await updateDoc(reviewRef, {
      helpful: review.helpful + 1
    });
    
    console.log('✅ Review marked as helpful');
    
  } catch (error) {
    console.error('❌ Error marking review helpful:', error);
    throw error;
  }
};
```

### 4.3 Helper Functions

```typescript
/**
 * Calculate average rating from array of reviews
 */
export const calculateAverageRating = (reviews: Review[]): number => {
  if (reviews.length === 0) return 0;
  const total = reviews.reduce((sum, review) => sum + review.rating, 0);
  return Math.round((total / reviews.length) * 10) / 10;
};

/**
 * Get rating distribution from array of reviews
 */
export const getRatingDistribution = (reviews: Review[]): {
  5: number;
  4: number;
  3: number;
  2: number;
  1: number;
} => {
  const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  reviews.forEach(review => {
    distribution[review.rating as keyof typeof distribution]++;
  });
  return distribution;
};

/**
 * Format relative time (e.g., "2 days ago")
 */
export const formatRelativeTime = (date: Date | string): string => {
  const now = new Date();
  const reviewDate = typeof date === 'string' ? new Date(date) : date;
  const diffMs = now.getTime() - reviewDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
};
```

### 4.4 Error Handling Strategy

```typescript
// Custom error types
export class FirestoreError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'FirestoreError';
  }
}

// Error handling wrapper
export const handleFirestoreError = (error: any): never => {
  console.error('Firestore error:', error);
  
  if (error.code === 'permission-denied') {
    throw new FirestoreError(
      'You do not have permission to perform this action',
      'PERMISSION_DENIED'
    );
  }
  
  if (error.code === 'not-found') {
    throw new FirestoreError(
      'The requested resource was not found',
      'NOT_FOUND'
    );
  }
  
  if (error.code === 'already-exists') {
    throw new FirestoreError(
      'This resource already exists',
      'ALREADY_EXISTS'
    );
  }
  
  throw new FirestoreError(
    'An unexpected error occurred',
    'UNKNOWN',
    error
  );
};
```

---

## 5. State Management

### 5.1 Filter State Structure

```typescript
// Global filter state (can use Context or React Query)
interface FilterState {
  priceRange: [number, number];           // Default: [0, 200]
  locations: string[];                    // Default: []
  minGuests: number;                      // Default: 1
  amenities: string[];                    // Default: []
  tentTypes: ('large' | 'small' | 'entertainment')[];  // Default: []
  minRating: number;                      // Default: 0
  sortBy: 'price_asc' | 'price_desc' | 'rating' | 'newest';  // Default: 'newest'
}

// Filter context provider
export const FilterContext = createContext<{
  filters: FilterState;
  setFilters: (filters: FilterState) => void;
  resetFilters: () => void;
  activeFilterCount: number;
} | null>(null);

export const useFilters = () => {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error('useFilters must be used within FilterProvider');
  }
  return context;
};
```

### 5.2 React Query Configuration

```typescript
// src/lib/queryClient.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,           // 5 minutes
      cacheTime: 10 * 60 * 1000,          // 10 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Query keys
export const queryKeys = {
  camps: (filters?: FilterState) => ['camps', filters],
  campDetails: (campId: string) => ['camp', campId],
  reviews: (campId: string) => ['reviews', campId],
  userReviews: (userId: string) => ['userReviews', userId],
  locations: ['locations'],
  amenities: ['amenities'],
};
```

### 5.3 Custom Hooks

```typescript
// src/hooks/useCamps.ts
export const useCamps = (filters: FilterState) => {
  return useQuery({
    queryKey: queryKeys.camps(filters),
    queryFn: () => getCampsWithFilters(filters),
    staleTime: 5 * 60 * 1000,
  });
};

// src/hooks/useReviews.ts
export const useReviews = (campId: string) => {
  return useInfiniteQuery({
    queryKey: queryKeys.reviews(campId),
    queryFn: ({ pageParam }) => getReviewsByCamp(campId, 5, pageParam),
    getNextPageParam: (lastPage) => lastPage.lastDoc,
    staleTime: 10 * 60 * 1000,
  });
};

// src/hooks/useCreateReview.ts
export const useCreateReview = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ reviewData, userId }: { 
      reviewData: Omit<Review, 'id' | 'createdAt' | 'helpful' | 'reported' | 'verified'>;
      userId: string;
    }) => createReview(reviewData, userId),
    onSuccess: (_, variables) => {
      // Invalidate camp reviews
      queryClient.invalidateQueries(queryKeys.reviews(variables.reviewData.campId));
      // Invalidate camp details (to update rating)
      queryClient.invalidateQueries(queryKeys.campDetails(variables.reviewData.campId));
      // Invalidate camps list (to update rating in cards)
      queryClient.invalidateQueries(queryKeys.camps());
    },
  });
};
```

### 5.4 Optimistic Updates

```typescript
// Optimistic update for marking review helpful
export const useMarkHelpful = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: markReviewHelpful,
    onMutate: async (reviewId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['reviews'] });
      
      // Snapshot previous value
      const previousReviews = queryClient.getQueryData(['reviews']);
      
      // Optimistically update
      queryClient.setQueryData(['reviews'], (old: any) => {
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            reviews: page.reviews.map((review: Review) =>
              review.id === reviewId
                ? { ...review, helpful: review.helpful + 1 }
                : review
            ),
          })),
        };
      });
      
      return { previousReviews };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousReviews) {
        queryClient.setQueryData(['reviews'], context.previousReviews);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
    },
  });
};
```

---

## 6. Performance Strategy

### 6.1 Query Optimization

**Firestore Best Practices:**

1. **Use Composite Indexes:**
   - Create indexes for common filter combinations
   - Example: `location + price`, `averageRating + price`

2. **Limit Query Results:**
   - Initial load: 12 camps (fits 3x4 grid)
   - Load more: 12 camps per page
   - Reviews: 5 per page

3. **Cursor-Based Pagination:**
   ```typescript
   // Good: Cursor-based
   const { reviews, lastDoc } = await getReviewsByCamp(campId, 5, lastDocSnapshot);
   
   // Bad: Offset-based (slow for large datasets)
   const reviews = await getReviewsByCamp(campId, 5, offset);
   ```

4. **Selective Field Retrieval:**
   ```typescript
   // Only fetch needed fields for camp cards
   const q = query(
     collection(db, 'camps'),
     select('id', 'title', 'photo', 'price', 'location', 'averageRating', 'reviewCount')
   );
   ```

### 6.2 Caching Strategy

**React Query Configuration:**

```typescript
// Cache hierarchy
{
  camps: {
    staleTime: 5 * 60 * 1000,      // 5 minutes
    cacheTime: 10 * 60 * 1000,     // 10 minutes
  },
  reviews: {
    staleTime: 10 * 60 * 1000,     // 10 minutes
    cacheTime: 30 * 60 * 1000,     // 30 minutes
  },
  filterOptions: {
    staleTime: 60 * 60 * 1000,     // 1 hour
    cacheTime: 24 * 60 * 60 * 1000, // 24 hours
  }
}
```

**Cache Invalidation Rules:**

- Invalidate camps list when:
  - New camp created
  - Camp updated
  - New review added (affects rating)

- Invalidate reviews when:
  - New review submitted
  - Review marked helpful
  - Review reported

### 6.3 Loading States

**Skeleton Loaders:**

```typescript
// Camp card skeleton
<div className="animate-pulse">
  <div className="h-48 bg-gray-200 rounded-t-lg" />
  <div className="p-4 space-y-3">
    <div className="h-4 bg-gray-200 rounded w-3/4" />
    <div className="h-4 bg-gray-200 rounded w-1/2" />
    <div className="h-8 bg-gray-200 rounded" />
  </div>
</div>

// Review card skeleton
<div className="animate-pulse space-y-3">
  <div className="flex items-center gap-3">
    <div className="w-10 h-10 bg-gray-200 rounded-full" />
    <div className="flex-1">
      <div className="h-4 bg-gray-200 rounded w-1/4" />
      <div className="h-3 bg-gray-200 rounded w-1/3 mt-2" />
    </div>
  </div>
  <div className="space-y-2">
    <div className="h-3 bg-gray-200 rounded" />
    <div className="h-3 bg-gray-200 rounded w-5/6" />
  </div>
</div>
```

**Progressive Image Loading:**

```typescript
import { useState } from 'react';

const CampImage = ({ src, alt }: { src: string; alt: string }) => {
  const [loaded, setLoaded] = useState(false);
  
  return (
    <div className="relative">
      {!loaded && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
      )}
      <img
        src={src}
        alt={alt}
        onLoad={() => setLoaded(true)}
        className={`transition-opacity duration-300 ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
};
```

### 6.4 Debouncing

```typescript
// Debounce filter changes
import { useDebouncedCallback } from 'use-debounce';

const FilterSidebar = ({ onFilterChange }: FilterSidebarProps) => {
  const [localFilters, setLocalFilters] = useState<FilterState>(initialFilters);
  
  const debouncedFilterChange = useDebouncedCallback(
    (filters: FilterState) => {
      onFilterChange(filters);
    },
    300 // 300ms delay
  );
  
  const handleFilterChange = (newFilters: FilterState) => {
    setLocalFilters(newFilters);
    debouncedFilterChange(newFilters);
  };
  
  // ...
};
```

### 6.5 Bundle Size Optimization

**Code Splitting:**

```typescript
// Lazy load review components
const ReviewForm = lazy(() => import('@/components/reviews/ReviewForm'));
const ReviewsList = lazy(() => import('@/components/reviews/ReviewsList'));

// Use in component
<Suspense fallback={<ReviewsListSkeleton />}>
  <ReviewsList campId={campId} />
</Suspense>
```

**Tree Shaking:**

```typescript
// Good: Import only what you need
import { query, where, orderBy } from 'firebase/firestore';

// Bad: Import entire module
import * as firestore from 'firebase/firestore';
```

---

## 7. Mobile Responsiveness

### 7.1 Breakpoint Strategy

```typescript
// Tailwind breakpoints
const breakpoints = {
  sm: '640px',   // Mobile landscape
  md: '768px',   // Tablet
  lg: '1024px',  // Desktop
  xl: '1280px',  // Large desktop
};

// Usage in components
<div className="
  grid 
  grid-cols-1           /* Mobile: 1 column */
  md:grid-cols-2        /* Tablet: 2 columns */
  lg:grid-cols-3        /* Desktop: 3 columns */
  gap-4 
  md:gap-6
">
  {camps.map(camp => <CampCard key={camp.id} camp={camp} />)}
</div>
```

### 7.2 Filter UI Responsive Design

**Desktop (≥1024px):**
```typescript
<div className="flex gap-6">
  {/* Sticky sidebar */}
  <aside className="hidden lg:block w-80 sticky top-20 h-fit">
    <FilterSidebar />
  </aside>
  
  {/* Main content */}
  <main className="flex-1">
    <CampGrid />
  </main>
</div>
```

**Mobile (<1024px):**
```typescript
<div>
  {/* Filter button */}
  <Button 
    onClick={() => setShowFilters(true)}
    className="fixed bottom-4 right-4 z-50 lg:hidden"
  >
    <Filter className="w-5 h-5 mr-2" />
    Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
  </Button>
  
  {/* Bottom sheet modal */}
  <Sheet open={showFilters} onOpenChange={setShowFilters}>
    <SheetContent side="bottom" className="h-[90vh]">
      <FilterSidebar onApply={() => setShowFilters(false)} />
    </SheetContent>
  </Sheet>
  
  {/* Main content */}
  <CampGrid />
</div>
```

### 7.3 Touch Interaction Patterns

**Minimum Touch Targets:**
```css
/* All interactive elements */
.touch-target {
  min-width: 44px;
  min-height: 44px;
  padding: 12px;
}

/* Buttons */
button {
  @apply min-h-[44px] px-4 py-3;
}

/* Checkboxes and radio buttons */
input[type="checkbox"],
input[type="radio"] {
  @apply w-6 h-6;
}
```

**Swipe Gestures:**
```typescript
// Swipe to close filter modal
import { useSwipeable } from 'react-swipeable';

const FilterModal = () => {
  const handlers = useSwipeable({
    onSwipedDown: () => setShowFilters(false),
    trackMouse: false,
  });
  
  return (
    <div {...handlers}>
      {/* Filter content */}
    </div>
  );
};
```

### 7.4 Mobile-Specific Optimizations

**Virtual Scrolling for Long Lists:**
```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

const ReviewsList = ({ reviews }: { reviews: Review[] }) => {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: reviews.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 200, // Estimated review card height
    overscan: 5,
  });
  
  return (
    <div ref={parentRef} className="h-[600px] overflow-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            <ReviewCard review={reviews[virtualRow.index]} />
          </div>
        ))}
      </div>
    </div>
  );
};
```

**Responsive Images:**
```typescript
<img
  src={camp.photo}
  srcSet={`
    ${camp.photo}?w=400 400w,
    ${camp.photo}?w=800 800w,
    ${camp.photo}?w=1200 1200w
  `}
  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
  alt={camp.title}
  loading="lazy"
/>
```

---

## 8. Implementation Roadmap

### Phase 1: Database & Backend Setup (2-3 hours)

**Tasks:**
1. Update `firestore.ts` with Review interface and functions
2. Update Camp interface with rating fields
3. Create Firestore indexes (via Firebase Console)
4. Implement `createReview()`, `getReviewsByCamp()`, `updateCampRating()`
5. Implement `getCampsWithFilters()` with all filter logic
6. Add helper functions: `canUserReview()`, `calculateAverageRating()`

**Testing:**
- Test review creation and camp rating update
- Test complex filtering queries
- Verify indexes are working (check query performance)

**Dependencies:** None

---

### Phase 2: Core UI Components (3-4 hours)

**Tasks:**
1. Create `RatingStars.tsx` (display + interactive modes)
2. Create `ReviewCard.tsx` with all features
3. Create `ReviewForm.tsx` with validation
4. Create `ReviewsList.tsx` with pagination
5. Create `ReviewsSummary.tsx` with distribution chart
6. Update `CampCard.tsx` to show rating

**Testing:**
- Test RatingStars in both modes
- Test ReviewForm validation
- Test ReviewsList pagination
- Verify responsive design on mobile

**Dependencies:** Phase 1 complete

---

### Phase 3: Search & Filter System (4-5 hours)

**Tasks:**
1. Create `FilterSidebar.tsx` with all filter types
2. Create `PriceRangeSlider.tsx`
3. Create `LocationSelect.tsx`, `AmenitiesCheckboxGroup.tsx`
4. Create `TentTypeFilter.tsx`, `SortBySelect.tsx`
5. Implement filter state management (Context or React Query)
6. Update `Index.tsx` to use filters
7. Add mobile bottom sheet for filters

**Testing:**
- Test each filter independently
- Test multiple filters combined
- Test sort options
- Test filter reset
- Verify mobile filter UI

**Dependencies:** Phase 1 complete

---

### Phase 4: Integration & Polish (3-4 hours)

**Tasks:**
1. Integrate reviews into `CampDetails.tsx` page
2. Add "Write Review" button to `Bookings.tsx`
3. Implement React Query for caching
4. Add loading skeletons everywhere
5. Implement optimistic updates for helpful votes
6. Add error boundaries and error handling
7. Test complete user flow end-to-end

**Testing:**
- Complete user journey: Search → View Camp → Book → Review
- Test error scenarios (network failures, permission errors)
- Test performance with large datasets
- Cross-browser testing

**Dependencies:** Phases 1, 2, 3 complete

---

### Phase 5: Performance & Optimization (2-3 hours)

**Tasks:**
1. Implement code splitting for review components
2. Add image lazy loading and optimization
3. Optimize Firestore queries (add missing indexes)
4. Implement virtual scrolling for long review lists
5. Add analytics tracking for filter usage
6. Performance audit with Lighthouse
7. Bundle size analysis and optimization

**Testing:**
- Lighthouse performance score > 90
- First Contentful Paint < 1.5s
- Time to Interactive < 3s
- Bundle size < 500KB gzipped

**Dependencies:** Phase 4 complete

---

### Total Estimated Time: 14-19 hours

**Critical Path:**
Phase 1 → Phase 2 → Phase 4 (minimum viable product)

**Optional Enhancement:**
Phase 3 (advanced filtering) can be done in parallel with Phase 2

**Final Polish:**
Phase 5 should be done last after everything works

---

## 9. Risk Assessment & Mitigation

### 9.1 Technical Risks

**Risk: Firestore query limits**
- Firestore has a limit of 10 inequality filters per query
- Mitigation: Use client-side filtering for complex conditions
- Implement smart query planning to minimize client-side work

**Risk: Large bundle size**
- Adding many new components increases bundle size
- Mitigation: Implement code splitting and lazy loading
- Use tree-shaking for Firebase imports

**Risk: Slow review loading**
- Loading many reviews can be slow
- Mitigation: Implement pagination and virtual scrolling
- Cache reviews aggressively with React Query

### 9.2 UX Risks

**Risk: Filter complexity overwhelms users**
- Too many filters can confuse users
- Mitigation: Use progressive disclosure (show most important filters first)
- Add "Popular Filters" section

**Risk: Mobile filter UI is clunky**
- Desktop sidebar doesn't translate well to mobile
- Mitigation: Use bottom sheet modal with clear "Apply" button
- Test extensively on real mobile devices

### 9.3 Data Integrity Risks

**Risk: Rating manipulation**
- Users might try to game the system
- Mitigation: Only allow reviews from verified bookings
- Implement rate limiting on review submissions

**Risk: Stale camp ratings**
- Camp rating might not update if `updateCampRating()` fails
- Mitigation: Implement retry logic with exponential backoff
- Add background job to recalculate ratings periodically

---

## 10. Success Metrics

**User Engagement:**
- 60%+ of users interact with filters
- 30%+ of completed bookings result in reviews
- Average time on search page increases by 20%

**Performance:**
- Search results load in < 1 second
- Filter changes apply in < 500ms
- Review submission completes in < 2 seconds

**Quality:**
- Average review length > 50 characters
- 80%+ of reviews have 4-5 star ratings
- < 5% of reviews reported as spam

---

## Appendix A: Example Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Reviews collection
    match /reviews/{reviewId} {
      // Anyone can read reviews
      allow read: if true;
      
      // Only authenticated users can create reviews
      allow create: if request.auth != null
        && request.resource.data.userId == request.auth.uid
        && request.resource.data.rating >= 1
        && request.resource.data.rating <= 5
        && request.resource.data.reviewText.size() >= 20
        && request.resource.data.reviewText.size() <= 1000;
      
      // Users can only update their own reviews
      allow update: if request.auth != null
        && resource.data.userId == request.auth.uid;
      
      // Users can only delete their own reviews
      allow delete: if request.auth != null
        && resource.data.userId == request.auth.uid;
    }
    
    // Camps collection
    match /camps/{campId} {
      // Anyone can read camps
      allow read: if true;
      
      // Only authenticated users can create camps
      allow create: if request.auth != null
        && request.resource.data.hostId == request.auth.uid;
      
      // Only camp owners can update their camps
      allow update: if request.auth != null
        && resource.data.hostId == request.auth.uid;
      
      // Only camp owners can delete their camps
      allow delete: if request.auth != null
        && resource.data.hostId == request.auth.uid;
    }
  }
}
```

---

## Appendix B: TypeScript Type Definitions

```typescript
// src/types/index.ts

export interface FilterState {
  priceRange: [number, number];
  locations: string[];
  minGuests: number;
  amenities: string[];
  tentTypes: ('large' | 'small' | 'entertainment')[];
  minRating: number;
  sortBy: 'price_asc' | 'price_desc' | 'rating' | 'newest';
}

export interface Review {
  id: string;
  campId: string;
  userId: string;
  bookingId: string;
  rating: number;
  reviewText: string;
  userName: string;
  userPhoto?: string;
  checkInDate: string;
  checkOutDate: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  helpful: number;
  reported: boolean;
  verified: boolean;
}

export interface Camp {
  id: string;
  slug: string;
  title: string;
  photo: string;
  price: number;
  location: string;
  description?: string;
  amenities?: string[];
  maxGuests?: number;
  campArea?: number;
  coordinates?: { lat: number; lng: number };
  tents?: TentConfig[];
  tentConfiguration?: { large: number; small: number; entertainment: number };
  specialFeatures?: string;
  rules?: string;
  hostId: string;
  hostName?: string;
  createdAt: string | Timestamp;
  averageRating: number;
  reviewCount: number;
  ratingDistribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

export interface Booking {
  id: string;
  campId: string;
  campTitle: string;
  campPhoto: string;
  campLocation: string;
  checkIn: string;
  checkOut: string;
  checkInDate: string;
  checkOutDate: string;
  guests: number;
  totalPrice: number;
  userId: string;
  userName?: string;
  userEmail?: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  createdAt: string | Timestamp;
  cancelledAt?: string;
  reviewId?: string;
  completedAt?: string;
  eligibleForReview: boolean;
}
```

---

**End of System Design Document**

This comprehensive system design provides all the technical specifications needed to implement the advanced search and review system. The design prioritizes performance, user experience, and maintainability while following industry best practices.