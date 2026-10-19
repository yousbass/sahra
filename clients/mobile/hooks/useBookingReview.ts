import { useState, useEffect, useRef } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

export interface ExistingReview {
  id: string;
  rating: number;
  text: string;
}

/**
 * Returns:
 *  - `reviewsByBookingId`  Map<bookingId, ExistingReview> — used to pre-fill
 *    the edit sheet and show the "Edit review" strip on history cards.
 *  - `reviewedCampIds`  Set<campId>  — kept for any existing callers that only
 *    need a presence check.
 *
 * Firestore 'in' supports max 10 items — campIds are chunked if needed.
 * Pass a `refreshKey` (bump the number) to force a re-query after a review
 * is submitted / edited / deleted without changing the camp ID list.
 */
export function useBookingReview(campIds: string[], refreshKey = 0) {
  const { user } = useAuth();
  const [reviewsByBookingId, setReviewsByBookingId] = useState<Map<string, ExistingReview>>(new Map());
  const [reviewedCampIds, setReviewedCampIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  // Stable join to detect actual array changes without reference instability
  const idsKey = campIds.slice().sort().join(',');
  const prevKey = useRef('');
  const prevRefreshKey = useRef(-1);

  useEffect(() => {
    const keyChanged = idsKey !== prevKey.current;
    const refreshTriggered = refreshKey !== prevRefreshKey.current;
    if (!user || campIds.length === 0 || !db) return;
    if (!keyChanged && !refreshTriggered) return;
    prevKey.current = idsKey;
    prevRefreshKey.current = refreshKey;

    setLoading(true);

    (async () => {
      try {
        const unique = [...new Set(campIds)];
        const chunks: string[][] = [];
        for (let i = 0; i < unique.length; i += 10) chunks.push(unique.slice(i, i + 10));

        const results = await Promise.all(
          chunks.map(chunk =>
            getDocs(
              query(
                collection(db!, 'reviews'),
                where('userId', '==', user.uid),
                where('campId', 'in', chunk)
              )
            )
          )
        );

        const byBookingId = new Map<string, ExistingReview>();
        const campIdSet = new Set<string>();

        results.forEach(snap =>
          snap.docs.forEach(d => {
            const data = d.data() as Record<string, any>;
            const bookingId = typeof data.bookingId === 'string' ? data.bookingId : '';
            const campId = typeof data.campId === 'string' ? data.campId : '';
            campIdSet.add(campId);
            if (bookingId) {
              byBookingId.set(bookingId, {
                id: d.id,
                rating: typeof data.rating === 'number' ? data.rating : 0,
                text: typeof data.reviewText === 'string' ? data.reviewText : '',
              });
            }
          })
        );

        setReviewsByBookingId(byBookingId);
        setReviewedCampIds(campIdSet);
      } catch {
        // Silently fail — worst case the prompt shows for already-reviewed stays
      } finally {
        setLoading(false);
      }
    })();
  }, [user, idsKey, refreshKey]);

  return { reviewsByBookingId, reviewedCampIds, loading };
}
