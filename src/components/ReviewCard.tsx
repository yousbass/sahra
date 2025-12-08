import { ThumbsUp, Flag } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import RatingStars from './RatingStars';
import { Review } from '@/lib/firestore';
import { formatRelativeTime } from '@/lib/firestore';
import { useState } from 'react';

interface ReviewCardProps {
  review: Review;
  showCampName?: boolean;
  onHelpful?: (reviewId: string) => void;
  currentUserId?: string;
}

export default function ReviewCard({
  review,
  showCampName = false,
  onHelpful,
  currentUserId
}: ReviewCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isLongReview = review.reviewText.length > 200;
  const displayText = isExpanded || !isLongReview 
    ? review.reviewText 
    : review.reviewText.substring(0, 200) + '...';

  const canVote = currentUserId && currentUserId !== review.userId && 
    !review.helpfulVoters.includes(currentUserId);

  const handleHelpful = () => {
    if (canVote && onHelpful) {
      onHelpful(review.id);
    }
  };

  return (
    <Card className="p-6 bg-white hover:shadow-lg transition-shadow">
      <div className="flex items-start gap-4">
        {/* User Avatar */}
        <div className="flex-shrink-0">
          {review.userPhoto ? (
            <img
              src={review.userPhoto}
              alt={review.userName}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-terracotta-400 to-#6B4423 flex items-center justify-center text-white font-bold text-lg">
              {review.userName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Review Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold text-gray-900">{review.userName}</h4>
                {review.verified && (
                  <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-300">
                    ✓ Verified
                  </Badge>
                )}
              </div>
              <p className="text-sm text-gray-600">
                Stayed: {new Date(review.checkInDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(review.checkOutDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <RatingStars rating={review.rating} size="sm" showValue />
              <span className="text-xs text-gray-500">
                {formatRelativeTime(review.createdAt)}
              </span>
            </div>
          </div>

          {/* Review Text */}
          <div className="mb-4">
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
              {displayText}
            </p>
            {isLongReview && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-#6B4423 hover:text-#5A3820 font-medium text-sm mt-2"
              >
                {isExpanded ? 'Show less' : 'Read more'}
              </button>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleHelpful}
              disabled={!canVote}
              className={cn(
                'text-gray-600 hover:text-#6B4423',
                !canVote && 'opacity-50 cursor-not-allowed'
              )}
            >
              <ThumbsUp className="w-4 h-4 mr-1" />
              Helpful ({review.helpful})
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-600 hover:text-red-600"
            >
              <Flag className="w-4 h-4 mr-1" />
              Report
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}