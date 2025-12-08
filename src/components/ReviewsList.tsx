import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ThumbsUp, Flag, Loader2 } from 'lucide-react';
import { getReviewsByCamp, markReviewHelpful, formatRelativeTime } from '@/lib/firestore';
import RatingStars from './RatingStars';
import type { Review } from '@/lib/firestore';
import { toast } from 'sonner';

interface ReviewsListProps {
  campId: string;
  currentUserId?: string;
}

export default function ReviewsList({ campId, currentUserId }: ReviewsListProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadReviews();
  }, [campId]);

  const loadReviews = async () => {
    try {
      setLoading(true);
      setError(null);
      const fetchedReviews = await getReviewsByCamp(campId);
      setReviews(fetchedReviews);
    } catch (err) {
      console.error('Error loading reviews:', err);
      setError('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkHelpful = async (reviewId: string) => {
    if (!currentUserId) {
      toast.error('Please sign in to mark reviews as helpful');
      return;
    }

    try {
      await markReviewHelpful(reviewId, currentUserId);
      await loadReviews();
      toast.success('Marked as helpful');
    } catch (err) {
      console.error('Error marking review as helpful:', err);
      toast.error('Failed to mark review as helpful');
    }
  };

  const handleReport = (reviewId: string) => {
    toast.info('Review reported. Our team will review it shortly.');
  };

  if (loading) {
    return (
      <Card className="p-8 text-center">
        <Loader2 className="w-8 h-8 text-#6B4423 animate-spin mx-auto mb-2" />
        <p className="text-gray-600">Loading reviews...</p>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-8 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <Button
          onClick={loadReviews}
          variant="outline"
          className="border-#8B5A3C text-#6B4423 hover:bg-orange-50"
        >
          Try Again
        </Button>
      </Card>
    );
  }

  if (reviews.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-gray-600 mb-2">No reviews yet</p>
        <p className="text-sm text-gray-500">Be the first to share your experience!</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => {
        const hasVoted = currentUserId && review.helpfulVoters?.includes(currentUserId);
        const userInitials = review.userName
          .split(' ')
          .map(n => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2);

        return (
          <Card key={review.id} className="p-6">
            {/* Header */}
            <div className="flex items-start gap-4 mb-4">
              <Avatar className="w-12 h-12">
                <AvatarImage src={review.userPhoto} alt={review.userName} />
                <AvatarFallback className="bg-terracotta-100 text-#5A3820 font-semibold">
                  {userInitials}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-semibold text-gray-900">{review.userName}</h4>
                  <span className="text-sm text-gray-500">
                    {formatRelativeTime(review.createdAt)}
                  </span>
                </div>
                <RatingStars rating={review.rating} size="sm" />
              </div>
            </div>

            {/* Review Text */}
            <p className="text-gray-700 leading-relaxed mb-4">{review.reviewText}</p>

            {/* Actions */}
            <div className="flex items-center gap-4 pt-4 border-t border-gray-200">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleMarkHelpful(review.id)}
                disabled={hasVoted || !currentUserId}
                className={`gap-2 ${
                  hasVoted
                    ? 'text-#6B4423'
                    : 'text-gray-600 hover:text-#6B4423'
                }`}
              >
                <ThumbsUp className={`w-4 h-4 ${hasVoted ? 'fill-current' : ''}`} />
                <span>Helpful ({review.helpful || 0})</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleReport(review.id)}
                className="gap-2 text-gray-600 hover:text-red-600"
              >
                <Flag className="w-4 h-4" />
                <span>Report</span>
              </Button>
            </div>

            {/* Admin Response */}
            {review.adminResponse && (
              <div className="mt-4 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
                <p className="text-sm font-semibold text-blue-900 mb-1">
                  Response from Camp Host
                </p>
                <p className="text-sm text-blue-800">{review.adminResponse}</p>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}