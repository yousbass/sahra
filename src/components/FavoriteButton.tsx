import { Heart } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useFavorites } from '@/hooks/useFavorites';
import { cn } from '@/lib/utils';

interface FavoriteButtonProps {
  campId: string;
  className?: string;
  size?: 'sm' | 'md';
}

/** Heart toggle for listing cards. Stops propagation so the card click doesn't fire. */
export function FavoriteButton({ campId, className, size = 'md' }: FavoriteButtonProps) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const { t } = useTranslation();
  const active = isFavorite(campId);

  return (
    <button
      type="button"
      aria-label={t('home.favoritesFilter')}
      aria-pressed={active}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        toggleFavorite(campId);
      }}
      className={cn(
        'inline-flex items-center justify-center rounded-full bg-white/85 backdrop-blur-sm shadow-sm border border-black/5 transition-all hover:scale-110 active:scale-95',
        size === 'md' ? 'h-9 w-9' : 'h-8 w-8',
        className
      )}
    >
      <Heart
        className={cn(
          size === 'md' ? 'w-[18px] h-[18px]' : 'w-4 h-4',
          'transition-colors',
          active ? 'fill-red-500 text-red-500' : 'text-gray-700'
        )}
      />
    </button>
  );
}
