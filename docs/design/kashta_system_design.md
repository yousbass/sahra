# Kashta Feature - System Design Document

## 1. Overview

This document outlines the system architecture for adding **Kashta** (beachfront sitting areas) as a new listing type to the Sahra platform, alongside existing **Camps** (desert camping sites).

### 1.1 Design Goals
- Support two distinct listing types: Camp and Kashta
- Maintain backward compatibility with existing camp listings
- Provide type-specific attributes, amenities, and validation
- Enable efficient filtering and searching by listing type
- Ensure bilingual support (English/Arabic) for all new features

---

## 2. Database Schema Design

### 2.1 Firestore Collections Structure

#### **listings** Collection (Updated)

```typescript
interface Listing {
  // Existing fields
  id: string;
  hostId: string;
  title: string;
  description: string;
  location: string;
  latitude: number;
  longitude: number;
  googleMapsUrl: string;
  price: number;
  status: 'active' | 'inactive' | 'pending';
  createdAt: Timestamp;
  updatedAt: Timestamp;
  
  // NEW: Listing type field
  listingType: 'camp' | 'kashta';  // Required field
  
  // Common fields for both types
  maxGuests: number;
  checkInTime: string;
  checkOutTime: string;
  images: ImageData[];
  cancellationPolicy: 'flexible' | 'moderate' | 'strict';
  rules: string;
  specialFeatures: string;
  
  // Type-specific fields (conditional based on listingType)
  
  // Camp-specific fields (when listingType === 'camp')
  campArea?: number;  // in square meters
  tents?: TentConfig[];
  campAmenities?: string[];  // Desert-specific amenities
  
  // Kashta-specific fields (when listingType === 'kashta')
  beachfrontAccess?: boolean;
  seatingCapacity?: number;  // Number of people for sitting area
  shadeType?: 'tent' | 'umbrella' | 'pergola' | 'natural';
  kashtaAmenities?: string[];  // Beach-specific amenities
  waterActivities?: string[];  // Swimming, fishing, etc.
  viewType?: 'sea' | 'beach' | 'mixed';
}

interface TentConfig {
  id: string;
  type: 'large' | 'small' | 'entertainment';
  furnished: boolean;
  carpeted: boolean;
  tv: boolean;
  sofas: boolean;
  teaSets: boolean;
}

interface ImageData {
  id: string;
  url: string;
  isMain: boolean;
}
```

### 2.2 Amenities Structure

```typescript
// Camp Amenities (Desert-focused)
const CAMP_AMENITIES = {
  essential: ['Restrooms', 'Kitchen', 'Electricity', 'Lighting', 'Water Supply'],
  cooking: ['Fire Pit', 'BBQ Grill', 'Cooking Equipment', 'Dining Area'],
  entertainment: ['Sound System', 'TV Available', 'Volleyball Court', 'Soccer Court', 'Bouncy Castle'],
  comfort: ['Furnished Tents', 'Carpeted Tents', 'Sofas & Seating', 'Tea Sets', 'Air Conditioning'],
  activities: ['Dune Buggies', 'Desert Tours', 'Camel Rides', 'Stargazing Area', 'Biking']
};

// Kashta Amenities (Beach-focused)
const KASHTA_AMENITIES = {
  essential: ['Restrooms', 'Fresh Water', 'Lighting', 'Parking Area'],
  seating: ['Cushioned Seating', 'Beach Chairs', 'Umbrellas', 'Pergola', 'Tent Shade'],
  cooking: ['BBQ Grill', 'Cooking Area', 'Dining Setup', 'Ice Cooler'],
  entertainment: ['Sound System', 'Beach Volleyball', 'Water Sports Equipment'],
  comfort: ['Fans', 'Misting System', 'Privacy Screens', 'Beach Mats'],
  activities: ['Swimming Area', 'Fishing Spot', 'Boat Access', 'Snorkeling Gear']
};
```

### 2.3 Migration Strategy

**Phase 1: Add listingType field to existing documents**
```typescript
// Migration script to update existing listings
async function migrateExistingListings() {
  const listingsRef = collection(db, 'listings');
  const snapshot = await getDocs(listingsRef);
  
  const batch = writeBatch(db);
  
  snapshot.forEach((doc) => {
    // All existing listings are camps
    batch.update(doc.ref, {
      listingType: 'camp',
      updatedAt: serverTimestamp()
    });
  });
  
  await batch.commit();
}
```

**Phase 2: Validate data integrity**
- Ensure all existing listings have `listingType: 'camp'`
- Verify camp-specific fields are present
- Update indexes for efficient querying

---

## 3. API Design

### 3.1 Firestore Query Updates

#### **getCampsWithFilters** → **getListingsWithFilters**

```typescript
interface FilterState {
  location: string;
  minPrice: number;
  maxPrice: number;
  minGuests: number;
  maxGuests: number;
  amenities: string[];
  bookingDate: Date | null;
  listingType: 'all' | 'camp' | 'kashta';  // NEW filter
}

async function getListingsWithFilters(filters: FilterState): Promise<Listing[]> {
  let q = query(collection(db, 'listings'), where('status', '==', 'active'));
  
  // Filter by listing type
  if (filters.listingType !== 'all') {
    q = query(q, where('listingType', '==', filters.listingType));
  }
  
  // Apply other filters (location, price, guests, amenities)
  // ... existing filter logic
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Listing));
}
```

### 3.2 New API Functions

```typescript
// Get listings by type
async function getListingsByType(type: 'camp' | 'kashta'): Promise<Listing[]> {
  const q = query(
    collection(db, 'listings'),
    where('status', '==', 'active'),
    where('listingType', '==', type)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Listing));
}

// Create listing with type validation
async function createListing(listingData: Partial<Listing>): Promise<string> {
  // Validate required fields based on listingType
  if (listingData.listingType === 'camp') {
    validateCampFields(listingData);
  } else if (listingData.listingType === 'kashta') {
    validateKashtaFields(listingData);
  }
  
  const docRef = await addDoc(collection(db, 'listings'), {
    ...listingData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  
  return docRef.id;
}

// Validation functions
function validateCampFields(data: Partial<Listing>): void {
  if (!data.campArea || data.campArea <= 0) {
    throw new Error('Camp area is required and must be positive');
  }
  if (!data.tents || data.tents.length === 0) {
    throw new Error('At least one tent configuration is required');
  }
}

function validateKashtaFields(data: Partial<Listing>): void {
  if (data.beachfrontAccess === undefined) {
    throw new Error('Beachfront access status is required');
  }
  if (!data.seatingCapacity || data.seatingCapacity <= 0) {
    throw new Error('Seating capacity is required and must be positive');
  }
  if (!data.shadeType) {
    throw new Error('Shade type is required');
  }
}
```

---

## 4. Frontend Architecture

### 4.1 Component Hierarchy

```
App
├── Header (with ListingTypeFilter)
├── Routes
│   ├── Index (Home Page)
│   │   ├── ListingTypeSelector (NEW)
│   │   ├── SearchBar
│   │   ├── FilterSidebar (updated with type filter)
│   │   └── ListingGrid
│   │       ├── CampListingCard (existing)
│   │       └── KashtaListingCard (NEW)
│   │
│   ├── CreateListing (updated)
│   │   ├── ListingTypeSelector (NEW)
│   │   ├── BasicInfoForm (common)
│   │   ├── CampSpecificForm (conditional)
│   │   └── KashtaSpecificForm (NEW, conditional)
│   │
│   ├── EditListing (updated)
│   │   └── (same structure as CreateListing)
│   │
│   ├── ListingDetails (updated)
│   │   ├── CampDetailsView (conditional)
│   │   └── KashtaDetailsView (NEW, conditional)
│   │
│   └── (other existing routes)
```

### 4.2 New Components

#### **ListingTypeSelector Component**

```typescript
// src/components/ListingTypeSelector.tsx
interface ListingTypeSelectorProps {
  value: 'camp' | 'kashta';
  onChange: (type: 'camp' | 'kashta') => void;
  disabled?: boolean;
}

export function ListingTypeSelector({ value, onChange, disabled }: ListingTypeSelectorProps) {
  const { t } = useTranslation();
  
  return (
    <div className="grid grid-cols-2 gap-4">
      <button
        onClick={() => onChange('camp')}
        disabled={disabled}
        className={cn(
          "p-6 border-2 rounded-lg transition-all",
          value === 'camp' 
            ? "border-primary bg-primary/10" 
            : "border-gray-200 hover:border-gray-300"
        )}
      >
        <Tent className="w-12 h-12 mx-auto mb-2" />
        <h3 className="font-semibold">{t('listingType.camp.title')}</h3>
        <p className="text-sm text-gray-600">{t('listingType.camp.description')}</p>
      </button>
      
      <button
        onClick={() => onChange('kashta')}
        disabled={disabled}
        className={cn(
          "p-6 border-2 rounded-lg transition-all",
          value === 'kashta' 
            ? "border-primary bg-primary/10" 
            : "border-gray-200 hover:border-gray-300"
        )}
      >
        <Waves className="w-12 h-12 mx-auto mb-2" />
        <h3 className="font-semibold">{t('listingType.kashta.title')}</h3>
        <p className="text-sm text-gray-600">{t('listingType.kashta.description')}</p>
      </button>
    </div>
  );
}
```

#### **KashtaListingCard Component**

```typescript
// src/components/KashtaListingCard.tsx
interface KashtaListingCardProps {
  listing: Listing;
  onClick: () => void;
}

export function KashtaListingCard({ listing, onClick }: KashtaListingCardProps) {
  const { t } = useTranslation();
  
  return (
    <Card onClick={onClick} className="cursor-pointer hover:shadow-lg transition-shadow">
      <CardContent className="p-0">
        {/* Main image */}
        <div className="relative h-48">
          <img src={listing.images[0]?.url} alt={listing.title} className="w-full h-full object-cover" />
          <Badge className="absolute top-2 right-2 bg-blue-500">
            <Waves className="w-3 h-3 mr-1" />
            {t('listingType.kashta.badge')}
          </Badge>
        </div>
        
        {/* Listing details */}
        <div className="p-4">
          <h3 className="font-semibold text-lg mb-2">{listing.title}</h3>
          
          <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {t('kashta.seatingCapacity', { count: listing.seatingCapacity })}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {listing.location}
            </span>
          </div>
          
          {/* Beach-specific features */}
          <div className="flex gap-2 mb-3">
            {listing.beachfrontAccess && (
              <Badge variant="secondary">{t('kashta.beachfront')}</Badge>
            )}
            {listing.shadeType && (
              <Badge variant="secondary">{t(`kashta.shade.${listing.shadeType}`)}</Badge>
            )}
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold">
              {listing.price} {t('common.currency')}
              <span className="text-sm font-normal text-gray-600">/{t('common.night')}</span>
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

#### **KashtaSpecificForm Component**

```typescript
// src/components/KashtaSpecificForm.tsx
interface KashtaSpecificFormProps {
  data: Partial<Listing>;
  onChange: (field: string, value: any) => void;
}

export function KashtaSpecificForm({ data, onChange }: KashtaSpecificFormProps) {
  const { t } = useTranslation();
  
  return (
    <div className="space-y-6">
      {/* Seating Capacity */}
      <div>
        <Label>{t('kashta.form.seatingCapacity')}</Label>
        <Input
          type="number"
          value={data.seatingCapacity || ''}
          onChange={(e) => onChange('seatingCapacity', parseInt(e.target.value))}
          placeholder={t('kashta.form.seatingCapacityPlaceholder')}
        />
      </div>
      
      {/* Beachfront Access */}
      <div className="flex items-center gap-2">
        <Switch
          checked={data.beachfrontAccess || false}
          onCheckedChange={(checked) => onChange('beachfrontAccess', checked)}
        />
        <Label>{t('kashta.form.beachfrontAccess')}</Label>
      </div>
      
      {/* Shade Type */}
      <div>
        <Label>{t('kashta.form.shadeType')}</Label>
        <Select
          value={data.shadeType || ''}
          onValueChange={(value) => onChange('shadeType', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder={t('kashta.form.shadeTypePlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tent">{t('kashta.shade.tent')}</SelectItem>
            <SelectItem value="umbrella">{t('kashta.shade.umbrella')}</SelectItem>
            <SelectItem value="pergola">{t('kashta.shade.pergola')}</SelectItem>
            <SelectItem value="natural">{t('kashta.shade.natural')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* View Type */}
      <div>
        <Label>{t('kashta.form.viewType')}</Label>
        <RadioGroup
          value={data.viewType || 'sea'}
          onValueChange={(value) => onChange('viewType', value)}
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="sea" id="sea" />
            <Label htmlFor="sea">{t('kashta.view.sea')}</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="beach" id="beach" />
            <Label htmlFor="beach">{t('kashta.view.beach')}</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="mixed" id="mixed" />
            <Label htmlFor="mixed">{t('kashta.view.mixed')}</Label>
          </div>
        </RadioGroup>
      </div>
      
      {/* Kashta Amenities */}
      <div>
        <Label>{t('kashta.form.amenities')}</Label>
        <AmenitiesSelector
          amenities={KASHTA_AMENITIES}
          selected={data.kashtaAmenities || []}
          onChange={(amenities) => onChange('kashtaAmenities', amenities)}
        />
      </div>
      
      {/* Water Activities */}
      <div>
        <Label>{t('kashta.form.waterActivities')}</Label>
        <MultiSelect
          options={[
            { value: 'swimming', label: t('kashta.activities.swimming') },
            { value: 'fishing', label: t('kashta.activities.fishing') },
            { value: 'snorkeling', label: t('kashta.activities.snorkeling') },
            { value: 'boating', label: t('kashta.activities.boating') }
          ]}
          selected={data.waterActivities || []}
          onChange={(activities) => onChange('waterActivities', activities)}
        />
      </div>
    </div>
  );
}
```

### 4.3 Updated Components

#### **FilterSidebar Component (Updated)**

```typescript
// Add listing type filter
<div className="space-y-2">
  <Label>{t('filters.listingType')}</Label>
  <RadioGroup
    value={filters.listingType}
    onValueChange={(value) => setFilters({ ...filters, listingType: value })}
  >
    <div className="flex items-center gap-2">
      <RadioGroupItem value="all" id="all" />
      <Label htmlFor="all">{t('filters.allTypes')}</Label>
    </div>
    <div className="flex items-center gap-2">
      <RadioGroupItem value="camp" id="camp" />
      <Label htmlFor="camp">{t('listingType.camp.title')}</Label>
    </div>
    <div className="flex items-center gap-2">
      <RadioGroupItem value="kashta" id="kashta" />
      <Label htmlFor="kashta">{t('listingType.kashta.title')}</Label>
    </div>
  </RadioGroup>
</div>
```

#### **CreateListing Page (Updated)**

```typescript
// Add listing type selection at the beginning
const [listingType, setListingType] = useState<'camp' | 'kashta'>('camp');
const [canChangeType, setCanChangeType] = useState(true);

// Disable type change after user starts filling form
useEffect(() => {
  if (title || description || uploadedImages.length > 0) {
    setCanChangeType(false);
  }
}, [title, description, uploadedImages]);

return (
  <div className="container mx-auto p-6">
    {/* Step 1: Select Listing Type */}
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>{t('createListing.selectType')}</CardTitle>
      </CardHeader>
      <CardContent>
        <ListingTypeSelector
          value={listingType}
          onChange={setListingType}
          disabled={!canChangeType}
        />
        {!canChangeType && (
          <Alert className="mt-4">
            <AlertDescription>
              {t('createListing.typeLockedWarning')}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
    
    {/* Step 2: Basic Information (common for both types) */}
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>{t('createListing.basicInfo')}</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Title, location, price, description, images */}
      </CardContent>
    </Card>
    
    {/* Step 3: Type-Specific Fields */}
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>
          {listingType === 'camp' 
            ? t('createListing.campDetails') 
            : t('createListing.kashtaDetails')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {listingType === 'camp' ? (
          <CampSpecificForm data={formData} onChange={handleFieldChange} />
        ) : (
          <KashtaSpecificForm data={formData} onChange={handleFieldChange} />
        )}
      </CardContent>
    </Card>
    
    {/* Step 4: Additional Details (common) */}
    {/* Step 5: Submit */}
  </div>
);
```

---

## 5. Data Flow Diagrams

### 5.1 User Search Flow

```
User visits homepage
  ↓
Selects listing type filter (All/Camp/Kashta)
  ↓
Applies additional filters (location, price, guests, amenities)
  ↓
System queries Firestore with filters
  ↓
Results displayed in grid:
  - CampListingCard for camps
  - KashtaListingCard for kashtas
  ↓
User clicks on listing
  ↓
Navigate to details page with type-specific view
```

### 5.2 Host Create Listing Flow

```
Host clicks "Create Listing"
  ↓
Step 1: Select listing type (Camp or Kashta)
  ↓
Step 2: Fill basic information (common fields)
  ↓
Step 3: Fill type-specific fields
  - If Camp: tents, camp area, camp amenities
  - If Kashta: seating capacity, shade type, beach amenities
  ↓
Step 4: Upload images
  ↓
Step 5: Set rules and cancellation policy
  ↓
Validate form based on listing type
  ↓
Submit to Firestore with listingType field
  ↓
Redirect to "My Listings" page
```

### 5.3 Booking Flow (Type-Aware)

```
User views listing details
  ↓
System displays type-specific information:
  - Camp: tent configurations, desert amenities
  - Kashta: seating capacity, beach amenities, water activities
  ↓
User selects dates and guest count
  ↓
System validates capacity based on listing type:
  - Camp: maxGuests based on tent configurations
  - Kashta: seatingCapacity
  ↓
User proceeds to payment
  ↓
Booking created with listing type reference
```

---

## 6. TypeScript Interfaces & Types

### 6.1 Core Types

```typescript
// src/types/listing.ts

export type ListingType = 'camp' | 'kashta';

export type ShadeType = 'tent' | 'umbrella' | 'pergola' | 'natural';

export type ViewType = 'sea' | 'beach' | 'mixed';

export interface BaseListing {
  id: string;
  hostId: string;
  title: string;
  description: string;
  location: string;
  latitude: number;
  longitude: number;
  googleMapsUrl: string;
  price: number;
  status: 'active' | 'inactive' | 'pending';
  listingType: ListingType;
  maxGuests: number;
  checkInTime: string;
  checkOutTime: string;
  images: ImageData[];
  cancellationPolicy: CancellationPolicy;
  rules: string;
  specialFeatures: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CampListing extends BaseListing {
  listingType: 'camp';
  campArea: number;
  tents: TentConfig[];
  campAmenities: string[];
}

export interface KashtaListing extends BaseListing {
  listingType: 'kashta';
  beachfrontAccess: boolean;
  seatingCapacity: number;
  shadeType: ShadeType;
  kashtaAmenities: string[];
  waterActivities: string[];
  viewType: ViewType;
}

export type Listing = CampListing | KashtaListing;

// Type guards
export function isCampListing(listing: Listing): listing is CampListing {
  return listing.listingType === 'camp';
}

export function isKashtaListing(listing: Listing): listing is KashtaListing {
  return listing.listingType === 'kashta';
}
```

### 6.2 Form State Types

```typescript
// src/types/forms.ts

export interface CreateListingFormState {
  // Common fields
  listingType: ListingType;
  title: string;
  description: string;
  location: string;
  latitude: string;
  longitude: string;
  googleMapsUrl: string;
  price: string;
  maxGuests: string;
  checkInTime: string;
  checkOutTime: string;
  images: ImageData[];
  cancellationPolicy: CancellationPolicy;
  rules: string;
  specialFeatures: string;
  
  // Camp-specific fields
  campArea?: string;
  tents?: TentConfig[];
  campAmenities?: string[];
  
  // Kashta-specific fields
  beachfrontAccess?: boolean;
  seatingCapacity?: string;
  shadeType?: ShadeType;
  kashtaAmenities?: string[];
  waterActivities?: string[];
  viewType?: ViewType;
}

export interface FilterState {
  location: string;
  minPrice: number;
  maxPrice: number;
  minGuests: number;
  maxGuests: number;
  amenities: string[];
  bookingDate: Date | null;
  listingType: 'all' | 'camp' | 'kashta';
}
```

### 6.3 Validation Schemas

```typescript
// src/lib/validation.ts

import { z } from 'zod';

const baseListingSchema = z.object({
  title: z.string().min(10, 'Title must be at least 10 characters'),
  description: z.string().min(50, 'Description must be at least 50 characters'),
  location: z.string().min(1, 'Location is required'),
  latitude: z.number(),
  longitude: z.number(),
  price: z.number().positive('Price must be positive'),
  maxGuests: z.number().int().positive('Max guests must be positive'),
  checkInTime: z.string(),
  checkOutTime: z.string(),
  images: z.array(z.object({
    id: z.string(),
    url: z.string().url(),
    isMain: z.boolean()
  })).min(1, 'At least one image is required'),
  cancellationPolicy: z.enum(['flexible', 'moderate', 'strict']),
  rules: z.string(),
  specialFeatures: z.string()
});

export const campListingSchema = baseListingSchema.extend({
  listingType: z.literal('camp'),
  campArea: z.number().positive('Camp area must be positive'),
  tents: z.array(z.object({
    id: z.string(),
    type: z.enum(['large', 'small', 'entertainment']),
    furnished: z.boolean(),
    carpeted: z.boolean(),
    tv: z.boolean(),
    sofas: z.boolean(),
    teaSets: z.boolean()
  })).min(1, 'At least one tent is required'),
  campAmenities: z.array(z.string())
});

export const kashtaListingSchema = baseListingSchema.extend({
  listingType: z.literal('kashta'),
  beachfrontAccess: z.boolean(),
  seatingCapacity: z.number().int().positive('Seating capacity must be positive'),
  shadeType: z.enum(['tent', 'umbrella', 'pergola', 'natural']),
  kashtaAmenities: z.array(z.string()),
  waterActivities: z.array(z.string()),
  viewType: z.enum(['sea', 'beach', 'mixed'])
});

export const listingSchema = z.discriminatedUnion('listingType', [
  campListingSchema,
  kashtaListingSchema
]);
```

---

## 7. Translation Keys

### 7.1 New Translation Keys Required

```typescript
// English translations
const enTranslations = {
  listingType: {
    camp: {
      title: 'Camp',
      description: 'Desert camping experience with tents',
      badge: 'Camp'
    },
    kashta: {
      title: 'Kashta',
      description: 'Beachfront sitting area by the sea',
      badge: 'Kashta'
    }
  },
  
  kashta: {
    seatingCapacity: '{{count}} seats',
    beachfront: 'Beachfront',
    shade: {
      tent: 'Tent Shade',
      umbrella: 'Beach Umbrella',
      pergola: 'Pergola',
      natural: 'Natural Shade'
    },
    view: {
      sea: 'Sea View',
      beach: 'Beach View',
      mixed: 'Mixed View'
    },
    activities: {
      swimming: 'Swimming',
      fishing: 'Fishing',
      snorkeling: 'Snorkeling',
      boating: 'Boating'
    },
    form: {
      seatingCapacity: 'Seating Capacity',
      seatingCapacityPlaceholder: 'Number of people',
      beachfrontAccess: 'Direct Beachfront Access',
      shadeType: 'Shade Type',
      shadeTypePlaceholder: 'Select shade type',
      viewType: 'View Type',
      amenities: 'Kashta Amenities',
      waterActivities: 'Water Activities'
    }
  },
  
  createListing: {
    selectType: 'Select Listing Type',
    typeLockedWarning: 'Listing type cannot be changed after you start filling the form',
    campDetails: 'Camp Details',
    kashtaDetails: 'Kashta Details'
  },
  
  filters: {
    listingType: 'Listing Type',
    allTypes: 'All Types'
  }
};

// Arabic translations
const arTranslations = {
  listingType: {
    camp: {
      title: 'مخيم',
      description: 'تجربة تخييم صحراوية مع خيام',
      badge: 'مخيم'
    },
    kashta: {
      title: 'كشتة',
      description: 'منطقة جلوس على شاطئ البحر',
      badge: 'كشتة'
    }
  },
  
  kashta: {
    seatingCapacity: '{{count}} مقعد',
    beachfront: 'على الشاطئ',
    shade: {
      tent: 'خيمة ظل',
      umbrella: 'مظلة شاطئ',
      pergola: 'برجولا',
      natural: 'ظل طبيعي'
    },
    view: {
      sea: 'إطلالة بحرية',
      beach: 'إطلالة على الشاطئ',
      mixed: 'إطلالة مختلطة'
    },
    activities: {
      swimming: 'سباحة',
      fishing: 'صيد السمك',
      snorkeling: 'غطس',
      boating: 'قوارب'
    },
    form: {
      seatingCapacity: 'سعة الجلوس',
      seatingCapacityPlaceholder: 'عدد الأشخاص',
      beachfrontAccess: 'وصول مباشر للشاطئ',
      shadeType: 'نوع الظل',
      shadeTypePlaceholder: 'اختر نوع الظل',
      viewType: 'نوع الإطلالة',
      amenities: 'مرافق الكشتة',
      waterActivities: 'الأنشطة المائية'
    }
  },
  
  createListing: {
    selectType: 'اختر نوع القائمة',
    typeLockedWarning: 'لا يمكن تغيير نوع القائمة بعد بدء ملء النموذج',
    campDetails: 'تفاصيل المخيم',
    kashtaDetails: 'تفاصيل الكشتة'
  },
  
  filters: {
    listingType: 'نوع القائمة',
    allTypes: 'جميع الأنواع'
  }
};
```

---

## 8. Implementation Phases

### Phase 1: Database & Backend (Week 1)
**Goal:** Update data layer to support listing types

**Tasks:**
1. Add `listingType` field to Firestore schema
2. Create migration script for existing listings
3. Update `campService.ts` → `listingService.ts`
4. Implement type-specific validation functions
5. Add Firestore indexes for efficient querying
6. Update API functions to handle both types
7. Test database operations

**Deliverables:**
- Updated Firestore schema
- Migration script executed successfully
- All existing camps have `listingType: 'camp'`
- New API functions tested

### Phase 2: TypeScript Types & Validation (Week 1)
**Goal:** Define type-safe interfaces and validation

**Tasks:**
1. Create `src/types/listing.ts` with all interfaces
2. Implement type guards (isCampListing, isKashtaListing)
3. Create validation schemas using Zod
4. Update existing components to use new types
5. Add TypeScript strict mode checks

**Deliverables:**
- Complete type definitions
- Validation schemas
- Zero TypeScript errors

### Phase 3: UI Components (Week 2)
**Goal:** Build reusable UI components

**Tasks:**
1. Create `ListingTypeSelector` component
2. Create `KashtaListingCard` component
3. Create `KashtaSpecificForm` component
4. Create `KashtaDetailsView` component
5. Update `FilterSidebar` with type filter
6. Add kashta-specific icons and badges
7. Implement responsive design

**Deliverables:**
- All new components built and tested
- Storybook stories for each component
- Mobile-responsive design

### Phase 4: Page Updates (Week 2-3)
**Goal:** Integrate components into existing pages

**Tasks:**
1. Update `Index.tsx` (home page)
   - Add listing type filter
   - Render appropriate card based on type
2. Update `CreateListing.tsx`
   - Add type selector at top
   - Conditional rendering of type-specific forms
   - Type-based validation
3. Update `EditListing.tsx`
   - Same as CreateListing
   - Disable type change for existing listings
4. Update `CampDetails.tsx` → `ListingDetails.tsx`
   - Conditional rendering based on type
   - Type-specific information display
5. Update `MyListings.tsx`
   - Display type badge on each listing
   - Filter by type

**Deliverables:**
- All pages updated and functional
- Type-specific flows working
- No breaking changes to existing functionality

### Phase 5: Search & Filtering (Week 3)
**Goal:** Enable type-aware search and filtering

**Tasks:**
1. Update `FilterState` interface
2. Modify `getListingsWithFilters` function
3. Add type filter to `FilterSidebar`
4. Update search results rendering
5. Implement type-specific sorting
6. Add type-based analytics tracking

**Deliverables:**
- Search works for both types
- Filters apply correctly
- Performance optimized

### Phase 6: Translation & Localization (Week 3)
**Goal:** Add bilingual support for all new features

**Tasks:**
1. Add all kashta-related translation keys
2. Update `i18n.ts` with English translations
3. Add Arabic translations
4. Test RTL layout for Arabic
5. Verify all text displays correctly
6. Add missing translation keys

**Deliverables:**
- Complete English/Arabic translations
- RTL layout working
- No raw translation keys visible

### Phase 7: Testing & QA (Week 4)
**Goal:** Ensure quality and stability

**Tasks:**
1. Unit tests for validation functions
2. Integration tests for API functions
3. Component tests using React Testing Library
4. E2E tests using Playwright
5. Manual testing of all flows
6. Cross-browser testing
7. Mobile device testing
8. Performance testing

**Deliverables:**
- 80%+ test coverage
- All critical paths tested
- No major bugs

### Phase 8: Deployment & Monitoring (Week 4)
**Goal:** Launch feature to production

**Tasks:**
1. Deploy to staging environment
2. Run migration script on production data
3. Monitor Firestore usage and performance
4. Deploy to production
5. Monitor error logs
6. Collect user feedback
7. Create documentation

**Deliverables:**
- Feature live in production
- Monitoring dashboards set up
- User documentation published

---

## 9. Performance Considerations

### 9.1 Firestore Indexing

**Required Composite Indexes:**
```
Collection: listings
Fields:
  - status (Ascending)
  - listingType (Ascending)
  - location (Ascending)
  - price (Ascending)

Collection: listings
Fields:
  - status (Ascending)
  - listingType (Ascending)
  - maxGuests (Ascending)
```

### 9.2 Query Optimization

- Use pagination for large result sets (limit 20 per page)
- Cache frequently accessed data (popular listings)
- Implement lazy loading for images
- Use Firestore's `startAfter` for infinite scroll

### 9.3 Bundle Size

- Code-split type-specific components
- Lazy load kashta components only when needed
- Optimize images (WebP format, responsive sizes)
- Tree-shake unused dependencies

---

## 10. Error Handling

### 10.1 Validation Errors

```typescript
try {
  const validatedData = listingSchema.parse(formData);
  await createListing(validatedData);
} catch (error) {
  if (error instanceof z.ZodError) {
    // Display field-specific errors
    error.errors.forEach(err => {
      toast.error(`${err.path.join('.')}: ${err.message}`);
    });
  }
}
```

### 10.2 Firestore Errors

```typescript
try {
  await getListingsWithFilters(filters);
} catch (error) {
  if (error.code === 'permission-denied') {
    toast.error('You do not have permission to view listings');
  } else if (error.code === 'unavailable') {
    toast.error('Service temporarily unavailable. Please try again.');
  } else {
    toast.error('An unexpected error occurred');
    console.error('Firestore error:', error);
  }
}
```

### 10.3 User Feedback

- Display loading states during data fetching
- Show success messages after successful operations
- Provide clear error messages with actionable steps
- Implement retry mechanisms for failed requests

---

## 11. Security Considerations

### 11.1 Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /listings/{listingId} {
      // Anyone can read active listings
      allow read: if resource.data.status == 'active';
      
      // Only authenticated users can create listings
      allow create: if request.auth != null
        && request.resource.data.hostId == request.auth.uid
        && request.resource.data.listingType in ['camp', 'kashta']
        && validateListingType(request.resource.data);
      
      // Only the host can update their own listings
      allow update: if request.auth != null
        && resource.data.hostId == request.auth.uid
        && request.resource.data.listingType == resource.data.listingType // Cannot change type
        && validateListingType(request.resource.data);
      
      // Only the host can delete their own listings
      allow delete: if request.auth != null
        && resource.data.hostId == request.auth.uid;
    }
    
    // Validation function for listing type
    function validateListingType(data) {
      return (data.listingType == 'camp' && validateCamp(data))
        || (data.listingType == 'kashta' && validateKashta(data));
    }
    
    function validateCamp(data) {
      return data.campArea > 0
        && data.tents.size() > 0;
    }
    
    function validateKashta(data) {
      return data.seatingCapacity > 0
        && data.shadeType in ['tent', 'umbrella', 'pergola', 'natural']
        && data.beachfrontAccess is bool;
    }
  }
}
```

### 11.2 Input Sanitization

- Sanitize all user inputs before storing
- Validate image URLs
- Prevent XSS attacks in descriptions
- Limit file upload sizes

---

## 12. Monitoring & Analytics

### 12.1 Key Metrics to Track

- **Listing Type Distribution:** Percentage of camps vs kashtas
- **Search Behavior:** Most searched listing type
- **Conversion Rate:** Bookings per listing type
- **User Preferences:** Filter usage by type
- **Performance:** Page load times for type-specific pages

### 12.2 Analytics Events

```typescript
// Track listing type selection
analytics.logEvent('listing_type_selected', {
  type: 'kashta',
  user_id: user.uid
});

// Track listing creation
analytics.logEvent('listing_created', {
  type: 'kashta',
  host_id: user.uid,
  price: listing.price
});

// Track search filters
analytics.logEvent('search_filtered', {
  listing_type: filters.listingType,
  location: filters.location,
  price_range: `${filters.minPrice}-${filters.maxPrice}`
});
```

---

## 13. Future Enhancements

### 13.1 Phase 2 Features (Post-Launch)

1. **Advanced Filtering:**
   - Filter kashtas by water activities
   - Filter by shade type
   - Filter by view type

2. **Map Integration:**
   - Show kashtas and camps on interactive map
   - Cluster markers by type
   - Type-specific map icons

3. **Recommendations:**
   - Suggest kashtas to users who booked camps
   - Personalized recommendations based on preferences

4. **Reviews:**
   - Type-specific review questions
   - Beach experience ratings for kashtas
   - Desert experience ratings for camps

### 13.2 Long-Term Vision

1. **Additional Listing Types:**
   - Chalets
   - Farms
   - Event spaces

2. **Dynamic Pricing:**
   - Type-based pricing algorithms
   - Seasonal adjustments

3. **Host Analytics:**
   - Performance comparison by type
   - Revenue insights

---

## 14. Conclusion

This system design provides a comprehensive architecture for adding Kashta as a new listing type to the Sahra platform. The design prioritizes:

- **Type Safety:** Strong TypeScript types and validation
- **Scalability:** Extensible to support future listing types
- **User Experience:** Intuitive type selection and filtering
- **Performance:** Optimized queries and caching
- **Maintainability:** Clean separation of concerns

The phased implementation approach ensures minimal disruption to existing functionality while delivering value incrementally.

---

## Appendix A: File Structure

```
sahra/
├── src/
│   ├── components/
│   │   ├── ListingTypeSelector.tsx (NEW)
│   │   ├── KashtaListingCard.tsx (NEW)
│   │   ├── KashtaSpecificForm.tsx (NEW)
│   │   ├── CampSpecificForm.tsx (NEW - extracted from CreateListing)
│   │   ├── FilterSidebar.tsx (UPDATED)
│   │   └── ...
│   ├── pages/
│   │   ├── Index.tsx (UPDATED)
│   │   ├── CreateListing.tsx (UPDATED)
│   │   ├── EditListing.tsx (UPDATED)
│   │   ├── ListingDetails.tsx (UPDATED - renamed from CampDetails)
│   │   └── ...
│   ├── lib/
│   │   ├── listingService.ts (UPDATED - renamed from campService)
│   │   ├── validation.ts (NEW)
│   │   ├── i18n.ts (UPDATED)
│   │   └── ...
│   ├── types/
│   │   ├── listing.ts (NEW)
│   │   ├── forms.ts (UPDATED)
│   │   └── ...
│   └── ...
├── docs/
│   ├── prd/
│   │   └── kashta_feature.md
│   └── design/
│       └── kashta_system_design.md (THIS FILE)
└── ...
```

---

**Document Version:** 1.0  
**Last Updated:** 2025-12-07  
**Author:** Bob (System Architect)  
**Status:** Ready for Review