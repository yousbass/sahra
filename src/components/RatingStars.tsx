import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RatingStarsProps {
  rating: number;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  onChange?: (rating: number) => void;
  showValue?: boolean;
  className?: string;
}

export default function RatingStars({
  rating,
  size = 'md',
  interactive = false,
  onChange,
  showValue = false,
  className
}: RatingStarsProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const handleClick = (starRating: number) => {
    if (interactive && onChange) {
      onChange(starRating);
    }
  };

  const renderStar = (index: number) => {
    const starValue = index + 1;
    const filled = rating >= starValue;
    const halfFilled = !filled && rating > index && rating < starValue;

    return (
      <button
        key={index}
        type="button"
        onClick={() => handleClick(starValue)}
        disabled={!interactive}
        className={cn(
          'relative',
          interactive && 'cursor-pointer hover:scale-110 transition-transform',
          !interactive && 'cursor-default'
        )}
      >
        {/* Background star (empty) */}
        <Star
          className={cn(
            sizeClasses[size],
            'text-gray-300'
          )}
        />
        
        {/* Foreground star (filled) */}
        <Star
          className={cn(
            sizeClasses[size],
            'absolute top-0 left-0 text-amber-500',
            filled && 'fill-amber-500',
            halfFilled && 'fill-amber-500'
          )}
          style={
            halfFilled
              ? {
                  clipPath: 'inset(0 50% 0 0)'
                }
              : undefined
          }
        />
      </button>
    );
  };

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <div className="flex items-center">
        {[0, 1, 2, 3, 4].map(renderStar)}
      </div>
      {showValue && (
        <span className="text-sm font-medium text-gray-700 ml-1">
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
}