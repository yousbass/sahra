import { useSyncExternalStore, useCallback } from 'react';

const FAVORITES_KEY = 'mukhymat_v2_favorites';

let memoryCache: string[] | null = null;
const listeners = new Set<() => void>();

function getFavorites(): string[] {
  if (memoryCache !== null) return memoryCache;
  try {
    const data = localStorage.getItem(FAVORITES_KEY);
    if (data) {
      memoryCache = JSON.parse(data);
      if (Array.isArray(memoryCache)) return memoryCache;
    }
  } catch (error) {
    console.error('Failed to parse favorites', error);
  }
  memoryCache = [];
  return memoryCache;
}

function setFavorites(favorites: string[]) {
  memoryCache = favorites;
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  } catch (error) {
    console.error('Failed to save favorites', error);
  }
  listeners.forEach(listener => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener('storage', handleStorageEvent);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      window.removeEventListener('storage', handleStorageEvent);
    }
  };
}

function handleStorageEvent(e: StorageEvent) {
  if (e.key === FAVORITES_KEY) {
    memoryCache = null; // force reload
    listeners.forEach(listener => listener());
  }
}

export function useFavorites() {
  const favorites = useSyncExternalStore(subscribe, getFavorites);

  const isFavorite = useCallback((id: string) => {
    return favorites.includes(id);
  }, [favorites]);

  const toggleFavorite = useCallback((id: string) => {
    const current = getFavorites();
    if (current.includes(id)) {
      setFavorites(current.filter(favId => favId !== id));
    } else {
      setFavorites([...current, id]);
    }
  }, []);

  return { favorites, isFavorite, toggleFavorite };
}
