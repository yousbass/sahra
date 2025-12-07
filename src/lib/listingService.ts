/**
 * Listing Service
 * Handles all listing operations for both Camp and Kashta types
 */

import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  query,
  where,
  orderBy,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  writeBatch,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';
import type {
  Listing,
  CampListing,
  KashtaListing,
  ListingType,
  FilterState,
  isCampListing,
  isKashtaListing,
  validateCampFields,
  validateKashtaFields
} from '@/types/listing';

// Get all active listings
export async function getActiveListings(): Promise<Listing[]> {
  if (!db) throw new Error('Firestore is not initialized');
  
  try {
    const listingsRef = collection(db, 'camps');
    const q = query(listingsRef, where('status', '==', 'active'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Listing));
  } catch (error) {
    console.error('Error getting active listings:', error);
    throw error;
  }
}

// Get listings by type
export async function getListingsByType(
  type: 'camp' | 'kashta'
): Promise<Listing[]> {
  if (!db) throw new Error('Firestore is not initialized');
  
  try {
    const listingsRef = collection(db, 'camps');
    const q = query(
      listingsRef,
      where('status', '==', 'active'),
      where('listingType', '==', type)
    );
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Listing));
  } catch (error) {
    console.error(`Error getting ${type} listings:`, error);
    throw error;
  }
}

// Get listings with filters
export async function getListingsWithFilters(
  filters: FilterState
): Promise<Listing[]> {
  if (!db) throw new Error('Firestore is not initialized');
  
  try {
    const listingsRef = collection(db, 'camps');
    let q = query(listingsRef, where('status', '==', 'active'));
    
    // Filter by listing type
    if (filters.listingType !== 'all') {
      q = query(q, where('listingType', '==', filters.listingType));
    }
    
    const snapshot = await getDocs(q);
    let listings = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Listing));
    
    // Apply client-side filters
    if (filters.location) {
      listings = listings.filter(listing =>
        listing.location.toLowerCase().includes(filters.location.toLowerCase())
      );
    }
    
    if (filters.minPrice > 0 || filters.maxPrice < Infinity) {
      listings = listings.filter(listing =>
        listing.price >= filters.minPrice && listing.price <= filters.maxPrice
      );
    }
    
    if (filters.minGuests > 0 || filters.maxGuests < Infinity) {
      listings = listings.filter(listing =>
        listing.maxGuests >= filters.minGuests && listing.maxGuests <= filters.maxGuests
      );
    }
    
    if (filters.amenities.length > 0) {
      listings = listings.filter(listing => {
        const listingAmenities = isCampListing(listing)
          ? listing.campAmenities || []
          : listing.kashtaAmenities || [];
        return filters.amenities.every(amenity =>
          listingAmenities.includes(amenity)
        );
      });
    }
    
    return listings;
  } catch (error) {
    console.error('Error getting listings with filters:', error);
    throw error;
  }
}

// Get single listing by ID
export async function getListingById(id: string): Promise<Listing | null> {
  if (!db) throw new Error('Firestore is not initialized');
  
  try {
    const docRef = doc(db, 'camps', id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      } as Listing;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting listing:', error);
    throw error;
  }
}

// Create new listing with type validation
export async function createListing(
  listingData: Partial<Listing>
): Promise<string> {
  if (!db) throw new Error('Firestore is not initialized');
  
  try {
    // Validate based on listing type
    if (listingData.listingType === 'camp') {
      const errors = validateCampFields(listingData as Partial<CampListing>);
      if (errors.length > 0) {
        throw new Error(`Camp validation failed: ${errors.join(', ')}`);
      }
    } else if (listingData.listingType === 'kashta') {
      const errors = validateKashtaFields(listingData as Partial<KashtaListing>);
      if (errors.length > 0) {
        throw new Error(`Kashta validation failed: ${errors.join(', ')}`);
      }
    }
    
    const listingsRef = collection(db, 'camps');
    const docRef = await addDoc(listingsRef, {
      ...listingData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      status: 'pending',
      views: 0,
      bookingCount: 0,
      rating: 0,
      reviewCount: 0
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Error creating listing:', error);
    throw error;
  }
}

// Update existing listing
export async function updateListing(
  id: string,
  updates: Partial<Listing>
): Promise<void> {
  if (!db) throw new Error('Firestore is not initialized');
  
  try {
    // Get existing listing to check type
    const existing = await getListingById(id);
    if (!existing) {
      throw new Error('Listing not found');
    }
    
    // Prevent changing listing type
    if (updates.listingType && updates.listingType !== existing.listingType) {
      throw new Error('Cannot change listing type after creation');
    }
    
    // Validate based on listing type
    if (existing.listingType === 'camp') {
      const errors = validateCampFields({ ...existing, ...updates } as CampListing);
      if (errors.length > 0) {
        throw new Error(`Camp validation failed: ${errors.join(', ')}`);
      }
    } else if (existing.listingType === 'kashta') {
      const errors = validateKashtaFields({ ...existing, ...updates } as KashtaListing);
      if (errors.length > 0) {
        throw new Error(`Kashta validation failed: ${errors.join(', ')}`);
      }
    }
    
    const docRef = doc(db, 'camps', id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating listing:', error);
    throw error;
  }
}

// Delete listing
export async function deleteListing(id: string): Promise<void> {
  if (!db) throw new Error('Firestore is not initialized');
  
  try {
    const docRef = doc(db, 'camps', id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting listing:', error);
    throw error;
  }
}

// Get listings by host
export async function getListingsByHost(hostId: string): Promise<Listing[]> {
  if (!db) throw new Error('Firestore is not initialized');
  
  try {
    const listingsRef = collection(db, 'camps');
    const q = query(listingsRef, where('hostId', '==', hostId));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Listing));
  } catch (error) {
    console.error('Error getting host listings:', error);
    throw error;
  }
}

// Migration function: Add listingType to existing camps
export async function migrateExistingListings(): Promise<void> {
  if (!db) throw new Error('Firestore is not initialized');
  
  try {
    console.log('Starting migration: Adding listingType to existing listings...');
    
    const listingsRef = collection(db, 'camps');
    const snapshot = await getDocs(listingsRef);
    
    const batch = writeBatch(db);
    let updateCount = 0;
    
    snapshot.docs.forEach((docSnap) => {
      const data = docSnap.data();
      
      // Only update if listingType doesn't exist
      if (!data.listingType) {
        batch.update(docSnap.ref, {
          listingType: 'camp',
          updatedAt: serverTimestamp()
        });
        updateCount++;
      }
    });
    
    if (updateCount > 0) {
      await batch.commit();
      console.log(`✅ Migration complete: Updated ${updateCount} listings`);
    } else {
      console.log('✅ No listings needed migration');
    }
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Get listing statistics by type
export async function getListingStatsByType(): Promise<{
  camps: number;
  kashtas: number;
  total: number;
}> {
  if (!db) throw new Error('Firestore is not initialized');
  
  try {
    const listingsRef = collection(db, 'camps');
    const snapshot = await getDocs(listingsRef);
    
    let camps = 0;
    let kashtas = 0;
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.listingType === 'camp') camps++;
      else if (data.listingType === 'kashta') kashtas++;
    });
    
    return {
      camps,
      kashtas,
      total: camps + kashtas
    };
  } catch (error) {
    console.error('Error getting listing stats:', error);
    throw error;
  }
}