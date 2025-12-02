import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import RatingStars from './RatingStars';
import { Loader2 } from 'lucide-react';

interface ReviewFormProps {
  campId: string;
  campName: string;
  bookingId?: string; // Made optional
  checkInDate: string;
  checkOutDate: string;
  onSubmit: (reviewData: { rating: number; reviewText: string }) => Promise<void>;
  onCancel: () => void;
}

export default function ReviewForm({
  campId,
  campName,
  bookingId,
  checkInDate,
  checkOutDate,
  onSubmit,
  onCancel
}: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const charCount = reviewText.length;
  const isValid = rating > 0 && charCount >= 20 && charCount <= 1000;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isValid) {
      setError('Please provide a rating and write at least 20 characters');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await onSubmit({ rating, reviewText });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit review');
      setSubmitting(false);
    }
  };

  return (
    <Card className="p-6 bg-white max-w-2xl mx-auto">
      <form onSubmit={handleSubmit}>
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Write a Review for {campName}
          </h2>
          <p className="text-sm text-gray-600">
            Share your experience with this camp
          </p>
        </div>

        {/* Rating */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-900 mb-3">
            Overall Rating *
          </label>
          <div className="flex items-center gap-4">
            <RatingStars
              rating={rating}
              size="lg"
              interactive
              onChange={setRating}
            />
            {rating > 0 && (
              <span className="text-sm text-gray-600">
                {rating === 1 && 'Poor'}
                {rating === 2 && 'Fair'}
                {rating === 3 && 'Good'}
                {rating === 4 && 'Very Good'}
                {rating === 5 && 'Excellent'}
              </span>
            )}
          </div>
          {rating === 0 && (
            <p className="text-sm text-gray-500 mt-2">Click to rate</p>
          )}
        </div>

        {/* Review Text */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-900 mb-3">
            Your Review *
          </label>
          <Textarea
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            placeholder="Share your experience... What did you like? What could be improved?"
            rows={6}
            className="resize-none"
          />
          <div className="flex items-center justify-between mt-2">
            <p className={`text-sm ${
              charCount < 20 
                ? 'text-red-600' 
                : charCount > 1000 
                ? 'text-red-600' 
                : 'text-gray-500'
            }`}>
              {charCount}/1000 characters {charCount < 20 && `(minimum 20)`}
            </p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!isValid || submitting}
            className="bg-gradient-to-r from-terracotta-500 to-terracotta-600 hover:from-terracotta-600 hover:to-terracotta-700"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Review'
            )}
          </Button>
        </div>
      </form>
    </Card>
  );
}