import { auth } from './firebase';
import type { Booking, Camp, Review } from './firestore';

export type CampAdminStatus = Camp['status'];
export type AdminReview = Review & { flagged?: boolean; flagReason?: string; helpful?: number; reported?: boolean };

/** Keep rating aggregates mathematically consistent after moderation changes. */
export function ratingAfterRemoving(rating: number, count: number, removedRating: number) {
  const nextCount = Math.max(0, Math.floor(count) - 1);
  if (!nextCount) return { rating: 0, reviewCount: 0 };
  return {
    rating: Math.min(5, Math.max(0, (rating * count - removedRating) / nextCount)),
    reviewCount: nextCount,
  };
}

export function ratingAfterRecalculation(ratings: number[]) {
  const valid = ratings.filter(value => Number.isFinite(value) && value >= 0 && value <= 5);
  return { rating: valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : 0, reviewCount: valid.length };
}

/** Authenticated server call. Payment fields intentionally have no client mutation helper. */
export async function adminRequest(path: string, method = 'GET', body?: Record<string, unknown>) {
  const token = await auth?.currentUser?.getIdToken();
  if (!token) throw new Error('You must be signed in as an administrator');
  const response = await fetch(`https://${process.env.EXPO_PUBLIC_DOMAIN}/api/sahra${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.success === false) throw new Error(data?.error || `Request failed (${response.status})`);
  return data;
}
