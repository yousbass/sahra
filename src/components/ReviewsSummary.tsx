import RatingStars from './RatingStars';
import { Card } from '@/components/ui/card';

interface ReviewsSummaryProps {
  averageRating: number;
  reviewCount: number;
  ratingDistribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

export default function ReviewsSummary({
  averageRating,
  reviewCount,
  ratingDistribution
}: ReviewsSummaryProps) {
  const getPercentage = (count: number) => {
    if (reviewCount === 0) return 0;
    return (count / reviewCount) * 100;
  };

  return (
    <Card className="p-6 bg-gradient-to-br from-sand-50 to-white">
      <div className="grid md:grid-cols-2 gap-8">
        {/* Overall Rating */}
        <div className="flex flex-col items-center justify-center text-center">
          <div className="text-5xl font-bold text-gray-900 mb-2">
            {averageRating.toFixed(1)}
          </div>
          <RatingStars rating={averageRating} size="lg" className="mb-2" />
          <p className="text-gray-600 font-medium">
            Based on {reviewCount} {reviewCount === 1 ? 'review' : 'reviews'}
          </p>
        </div>

        {/* Rating Distribution */}
        <div className="space-y-3">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = ratingDistribution[star as keyof typeof ratingDistribution];
            const percentage = getPercentage(count);

            return (
              <div key={star} className="flex items-center gap-3">
                <div className="flex items-center gap-1 w-12">
                  <span className="text-sm font-medium text-gray-700">{star}</span>
                  <span className="text-amber-500">★</span>
                </div>
                <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-sm text-gray-600 w-8 text-right">{count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}