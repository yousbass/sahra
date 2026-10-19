import { useCallback, useSyncExternalStore } from 'react';

/**
 * Browser-only favorites (no account needed).
 * Stored per-site in localStorage; module-level cache + subscribers keep
 * every mounted component (cards, Search filter, Home rail) in sync.
 */
const STORAGE_KEY = 'mukhymat_favorites';

function load(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

let cache: string[] = load();
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): string[] {
  return cache;
}

export function toggleFavoriteId(id: string) {
  cache = cache.includes(id) ? cache.filter(f => f !== id) : [...cache, id];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // Private mode / quota — favorites simply won't persist this session.
  }
  listeners.forEach(l => l());
}

export function useFavorites() {
  const favorites = useSyncExternalStore(subscribe, getSnapshot);
  const isFavorite = useCallback((id: string) => favorites.includes(id), [favorites]);
  return { favorites, isFavorite, toggleFavorite: toggleFavoriteId };
}
