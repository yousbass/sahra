import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { subscribeToHostBookings } from '@/lib/firestore';

interface UnreadBookingsContextType {
  unreadCount: number;
  /** Call with true on focus, false on blur, from the bookings screen. */
  setBookingsFocused: (focused: boolean) => void;
}

const UnreadBookingsContext = createContext<UnreadBookingsContextType>({
  unreadCount: 0,
  setBookingsFocused: () => {},
});

export const useUnreadBookings = () => useContext(UnreadBookingsContext);

function storageKey(uid: string) {
  return `unread_bookings_seen_${uid}`;
}

export function UnreadBookingsProvider({ children }: { children: React.ReactNode }) {
  const { user, userData } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  /**
   * Mutable set of booking IDs the host has already seen.
   * Stored in a ref so the Firestore snapshot callback always reads the
   * latest value — not a stale closure copy.
   */
  const seenIdsRef = useRef<Set<string>>(new Set());

  /**
   * Latest set of booking IDs received from Firestore.
   * Used by setBookingsFocused so markAllRead always captures the current list,
   * even if it arrives before or after the screen focuses.
   */
  const currentIdsRef = useRef<Set<string>>(new Set());

  /**
   * Whether the host is currently on the Bookings screen.
   * When true, every incoming snapshot is immediately marked as seen.
   */
  const isFocusedRef = useRef(false);

  // Helper: persist seenIds and reset the badge count.
  const persistSeen = useCallback(
    (uid: string, ids: string[]) => {
      seenIdsRef.current = new Set(ids);
      setUnreadCount(0);
      AsyncStorage.setItem(storageKey(uid), JSON.stringify(ids)).catch(() => {});
    },
    []
  );

  useEffect(() => {
    if (!user || !userData?.isHost) {
      setUnreadCount(0);
      return;
    }

    const uid = user.uid;
    let unsubscribe: (() => void) | undefined;
    let alive = true;

    const init = async () => {
      // Restore the previously-seen set from storage.
      try {
        const raw = await AsyncStorage.getItem(storageKey(uid));
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            seenIdsRef.current = new Set(parsed as string[]);
          }
        }
      } catch {
        // Non-critical – start with an empty seen set.
      }

      if (!alive) return;

      unsubscribe = subscribeToHostBookings(
        uid,
        (bookings) => {
          if (!alive) return;

          const ids = (bookings as Array<{ id: string }>).map((b) => b.id);
          currentIdsRef.current = new Set(ids);

          if (isFocusedRef.current) {
            // Host is actively viewing the Bookings screen — mark all as seen
            // immediately so the snapshot never resurfaces a cleared badge.
            persistSeen(uid, ids);
          } else {
            const unseen = ids.filter((id) => !seenIdsRef.current.has(id)).length;
            setUnreadCount(unseen);
          }
        },
        (err) => {
          console.error('[UnreadBookingsContext] listener error', err);
        }
      );
    };

    init();

    return () => {
      alive = false;
      unsubscribe?.();
    };
  }, [user?.uid, userData?.isHost, persistSeen]);

  /**
   * Called by the Bookings screen via useFocusEffect.
   * - focused=true : marks all current bookings as seen; any snapshot that
   *   arrives while the screen is open is also immediately marked as seen.
   * - focused=false: stops the auto-seen behaviour on incoming snapshots.
   */
  const setBookingsFocused = useCallback(
    (focused: boolean) => {
      isFocusedRef.current = focused;
      if (focused && user) {
        const ids = Array.from(currentIdsRef.current);
        persistSeen(user.uid, ids);
      }
    },
    [user?.uid, persistSeen]
  );

  return (
    <UnreadBookingsContext.Provider value={{ unreadCount, setBookingsFocused }}>
      {children}
    </UnreadBookingsContext.Provider>
  );
}
