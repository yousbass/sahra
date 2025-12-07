// Core listing types for Sahra platform
// Supports both Camp (desert camping) and Kashta (beachfront sitting areas)

import { Timestamp } from 'firebase/firestore';

export type ListingType = 'camp' | 'kashta';
export type ShadeType = 'tent' | 'umbrella' | 'pergola' | 'natural';
export type ViewType = 'beach' | 'mixed'; // UPDATED: Removed 'sea' - Beach View covers both sea and beach
export type CancellationPolicy = 'flexible' | 'moderate' | 'strict';

export interface ImageData {
  id: string;
  url: string;
  isMain: boolean;
}

export interface TentConfig {
  id: string;
  type: 'large' | 'small' | 'entertainment';
  furnished: boolean;
  carpeted: boolean;
  tv: boolean;
  sofas: boolean;
  teaSets: boolean;
  pingPongTable: boolean;
  foosballTable: boolean;
  airHockeyTable: boolean;
  volleyballField: boolean;
  footballField: boolean;
  description?: string;
}

// Base interface with common fields for all listing types
export interface BaseListing {
  id: string;
  hostId: string;
  hostName: string;
  hostEmail?: string;
  hostPhone?: string;
  title: string;
  description: string;
  location: string;
  latitude: number;
  longitude: number;
  googleMapsUrl?: string;
  price: number;
  status: 'active' | 'inactive' | 'pending';
  listingType: ListingType;
  maxGuests: number;
  checkInTime: string;
  checkOutTime: string;
  images: ImageData[];
  cancellationPolicy: CancellationPolicy;
  rules: string;
  specialFeatures: string; // Note: This is now used as "Description" in UI
  createdAt: string | Timestamp;
  updatedAt?: string | Timestamp;
  
  // Optional common fields
  rating?: number;
  reviewCount?: number;
  views?: number;
  bookingCount?: number;
  featured?: boolean;
  verificationStatus?: 'pending' | 'verified' | 'rejected';
  verificationNotes?: string;
  flagged?: boolean;
  flagReason?: string;
}

// Camp-specific listing interface
export interface CampListing extends BaseListing {
  listingType: 'camp';
  campArea: number;
  tents: TentConfig[];
  campAmenities: string[];
  
  // Legacy compatibility fields
  tentConfig?: {
    largeTents: number;
    smallTents: number;
    entertainmentTents: number;
  };
  pricing?: {
    largeTent: number;
    smallTent: number;
    entertainmentTent: number;
  };
  pricePerNight?: number;
  amenities?: string[];
}

// Kashta-specific listing interface
export interface KashtaListing extends BaseListing {
  listingType: 'kashta';
  beachfrontAccess: boolean;
  seatingCapacity: number;
  shadeType: ShadeType;
  kashtaAmenities: string[];
  waterActivities: string[];
  viewType: ViewType;
}

// Union type for all listings
export type Listing = CampListing | KashtaListing;

// Type guards
export function isCampListing(listing: Listing): listing is CampListing {
  return listing.listingType === 'camp';
}

export function isKashtaListing(listing: Listing): listing is KashtaListing {
  return listing.listingType === 'kashta';
}

// Filter state interface
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

// Form state for creating/editing listings
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
  specialFeatures: string; // UI shows this as "Description" for kashta
  
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

// Amenities structure
export const CAMP_AMENITIES = {
  essential: ['Restrooms', 'Kitchen', 'Electricity', 'Lighting', 'Water Supply'],
  cooking: ['Fire Pit', 'BBQ Grill', 'Cooking Equipment', 'Dining Area'],
  entertainment: ['Sound System', 'TV Available', 'Volleyball Court', 'Soccer Court', 'Bouncy Castle'],
  comfort: ['Furnished Tents', 'Carpeted Tents', 'Sofas & Seating', 'Tea Sets', 'Air Conditioning'],
  activities: ['Dune Buggies', 'Desert Tours', 'Camel Rides', 'Stargazing Area', 'Biking'],
  other: ['Parking', 'Pet Friendly', 'Family Friendly', 'Security/Guards', 'Food Truck Access']
};

export const KASHTA_AMENITIES = {
  essential: ['Restrooms', 'Fresh Water', 'Lighting', 'Parking Area'],
  seating: ['Cushioned Seating', 'Beach Chairs', 'Umbrellas', 'Pergola', 'Tent Shade'],
  cooking: ['BBQ Grill', 'Cooking Area', 'Dining Setup', 'Ice Cooler'],
  entertainment: ['Sound System', 'Beach Volleyball', 'Water Sports Equipment'],
  comfort: ['Fans', 'Misting System', 'Privacy Screens', 'Beach Mats'],
  activities: ['Swimming Area', 'Fishing Spot', 'Boat Access', 'Snorkeling Gear']
};

// Validation helper functions
export function validateCampFields(data: Partial<CampListing>): string[] {
  const errors: string[] = [];
  
  if (!data.campArea || data.campArea <= 0) {
    errors.push('Camp area is required and must be positive');
  }
  
  if (!data.tents || data.tents.length === 0) {
    errors.push('At least one tent configuration is required');
  }
  
  return errors;
}

export function validateKashtaFields(data: Partial<KashtaListing>): string[] {
  const errors: string[] = [];
  
  if (data.beachfrontAccess === undefined) {
    errors.push('Beachfront access status is required');
  }
  
  if (!data.seatingCapacity || data.seatingCapacity <= 0) {
    errors.push('Seating capacity is required and must be positive');
  }
  
  if (!data.shadeType) {
    errors.push('Shade type is required');
  }
  
  if (!data.viewType) {
    errors.push('View type is required');
  }
  
  return errors;
}