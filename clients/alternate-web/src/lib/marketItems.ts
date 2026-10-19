import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type { MarketCategory, MarketItem } from './marketplace';

/**
 * Marketplace items published by approved sellers (Firestore-backed).
 * These surface in the same browse-only marketplace as the static catalog —
 * there is still no ordering or delivery on the platform.
 */
export interface SellerMarketItem {
  id: string;
  sellerId: string;
  sellerNameEn: string;
  sellerNameAr: string;
  category: MarketCategory;
  nameEn: string;
  nameAr: string;
  descEn: string;
  descAr: string;
  price: number;
  unitEn: string;
  unitAr: string;
  image: string;
  status: 'active' | 'hidden';
  createdAt?: string | Timestamp;
  updatedAt?: string | Timestamp;
}

export interface NewMarketItemInput {
  sellerId: string;
  sellerNameEn: string;
  sellerNameAr: string;
  category: MarketCategory;
  nameEn: string;
  nameAr: string;
  descEn: string;
  descAr: string;
  price: number;
  unitEn: string;
  unitAr: string;
  image: string;
}

const COLLECTION = 'marketItems';

const isCategory = (v: unknown): v is MarketCategory =>
  v === 'food' || v === 'firewood' || v === 'gear';

const mapDoc = (id: string, data: Record<string, unknown>): SellerMarketItem => {
  if (!isCategory(data.category)) throw new Error('Invalid category');
  const price = typeof data.price === 'number' ? data.price : Number(data.price);
  if (!isFinite(price)) throw new Error('Invalid price');
  return {
    id,
    sellerId: (data.sellerId as string) || '',
    sellerNameEn: (data.sellerNameEn as string) || '',
    sellerNameAr: (data.sellerNameAr as string) || '',
    category: data.category,
    nameEn: (data.nameEn as string) || '',
    nameAr: (data.nameAr as string) || '',
    descEn: (data.descEn as string) || '',
    descAr: (data.descAr as string) || '',
    price,
    unitEn: (data.unitEn as string) || '',
    unitAr: (data.unitAr as string) || '',
    image: (data.image as string) || '',
    status: data.status === 'hidden' ? 'hidden' : 'active',
    createdAt: data.createdAt as string | Timestamp | undefined,
    updatedAt: data.updatedAt as string | Timestamp | undefined,
  };
};

const toMillis = (v: string | Timestamp | undefined): number => {
  if (!v) return 0;
  if (v instanceof Timestamp) return v.toMillis();
  const t = new Date(v).getTime();
  return isNaN(t) ? 0 : t;
};

export const createMarketItem = async (input: NewMarketItemInput): Promise<string> => {
  if (!db) throw new Error('Firestore is not initialized');

  const docRef = await addDoc(collection(db, COLLECTION), {
    ...input,
    status: 'active',
    createdAt: serverTimestamp(),
  });
  return docRef.id;
};

export const updateMarketItem = async (
  itemId: string,
  updates: Partial<Omit<SellerMarketItem, 'id' | 'sellerId' | 'createdAt'>>
): Promise<void> => {
  if (!db) throw new Error('Firestore is not initialized');

  await updateDoc(doc(db, COLLECTION, itemId), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
};

export const deleteMarketItem = async (itemId: string): Promise<void> => {
  if (!db) throw new Error('Firestore is not initialized');
  await deleteDoc(doc(db, COLLECTION, itemId));
};

/** All items (any status) belonging to one seller — for the My Shop page. */
export const getMarketItemsBySeller = async (
  sellerId: string
): Promise<SellerMarketItem[]> => {
  if (!db) throw new Error('Firestore is not initialized');

  const q = query(collection(db, COLLECTION), where('sellerId', '==', sellerId));
  const snapshot = await getDocs(q);
  const items: SellerMarketItem[] = [];
  snapshot.forEach((d) => {
    try {
      items.push(mapDoc(d.id, d.data()));
    } catch (error) {
      console.error('Skipping malformed market item', d.id, error);
    }
  });
  items.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
  return items;
};

/** Publicly visible seller items for the marketplace browse pages. */
export const getActiveMarketItems = async (): Promise<SellerMarketItem[]> => {
  if (!db) throw new Error('Firestore is not initialized');

  const q = query(collection(db, COLLECTION), where('status', '==', 'active'));
  const snapshot = await getDocs(q);
  const items: SellerMarketItem[] = [];
  snapshot.forEach((d) => {
    try {
      items.push(mapDoc(d.id, d.data()));
    } catch (error) {
      console.error('Skipping malformed market item', d.id, error);
    }
  });
  items.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
  return items;
};

/** Normalize a seller item into the static-catalog card shape used by the market UI. */
export const toMarketItem = (item: SellerMarketItem): MarketItem => ({
  id: `seller_${item.id}`,
  category: item.category,
  nameEn: item.nameEn,
  nameAr: item.nameAr,
  descEn: item.descEn,
  descAr: item.descAr,
  price: item.price,
  unitEn: item.unitEn,
  unitAr: item.unitAr,
  image: item.image,
  sellerEn: item.sellerNameEn,
  sellerAr: item.sellerNameAr,
});
