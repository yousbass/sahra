import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Search, 
  Eye, 
  Trash2, 
  Loader2,
  Star,
  Flag,
  CheckCircle,
  ThumbsUp
} from 'lucide-react';
import { getAllReviews, deleteReview, flagReview, Review } from '@/lib/firestore';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function AdminReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [filteredReviews, setFilteredReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [ratingFilter, setRatingFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [flagReason, setFlagReason] = useState('');

  useEffect(() => {
    loadReviews();
  }, []);

  useEffect(() => {
    filterReviews();
  }, [reviews, searchTerm, ratingFilter, statusFilter]);

  const loadReviews = async () => {
    try {
      setLoading(true);
      const data = await getAllReviews();
      setReviews(data);
    } catch (error) {
      console.error('Error loading reviews:', error);
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const filterReviews = () => {
    let filtered = [...reviews];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(review =>
        review.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        review.reviewText.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Rating filter
    if (ratingFilter !== 'all') {
      filtered = filtered.filter(review => review.rating === parseInt(ratingFilter));
    }

    // Status filter
    if (statusFilter === 'flagged') {
      filtered = filtered.filter(review => review.flagged);
    } else if (statusFilter === 'active') {
      filtered = filtered.filter(review => !review.flagged);
    }

    setFilteredReviews(filtered);
  };

  const handleDeleteReview = async (reviewId: string, campId: string) => {
    if (!confirm('Are you sure you want to delete this review? This action cannot be undone.')) {
      return;
    }

    try {
      setActionLoading(true);
      await deleteReview(reviewId, campId);
      toast.success('Review deleted successfully');
      await loadReviews();
      setShowReviewDialog(false);
    } catch (error) {
      console.error('Error deleting review:', error);
      toast.error('Failed to delete review');
    } finally {
      setActionLoading(false);
    }
  };

  const handleFlagReview = async (reviewId: string, reason?: string) => {
    try {
      setActionLoading(true);
      await flagReview(reviewId, reason || '');
      toast.success('Review flagged successfully');
      await loadReviews();
      setFlagReason('');
    } catch (error) {
      console.error('Error flagging review:', error);
      toast.error('Failed to flag review');
    } finally {
      setActionLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  const getStatusBadge = (review: Review) => {
    if (review.flagged) {
      return (
        <Badge variant="destructive">
          <Flag className="w-3 h-3 mr-1" />
          Flagged
        </Badge>
      );
    }
    return (
      <Badge className="bg-green-100 text-green-900 border-green-300">
        <CheckCircle className="w-3 h-3 mr-1" />
        Active
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-12 h-12 text-#6B4423 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Review Moderation</h2>
          <p className="text-gray-600 mt-1">{filteredReviews.length} reviews found</p>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-white/95 backdrop-blur-sm border-orange-300 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by user or review text..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 border-orange-300 focus:border-#8B5A3C"
            />
          </div>

          <Select value={ratingFilter} onValueChange={setRatingFilter}>
            <SelectTrigger className="border-orange-300 focus:border-#8B5A3C">
              <SelectValue placeholder="Filter by rating" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Ratings</SelectItem>
              <SelectItem value="5">5 Stars</SelectItem>
              <SelectItem value="4">4 Stars</SelectItem>
              <SelectItem value="3">3 Stars</SelectItem>
              <SelectItem value="2">2 Stars</SelectItem>
              <SelectItem value="1">1 Star</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="border-orange-300 focus:border-#8B5A3C">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="flagged">Flagged</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Reviews Table */}
      <Card className="bg-white/95 backdrop-blur-sm border-orange-300 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-orange-50 border-orange-300">
                <TableHead className="font-bold text-gray-900">User</TableHead>
                <TableHead className="font-bold text-gray-900">Camp ID</TableHead>
                <TableHead className="font-bold text-gray-900">Rating</TableHead>
                <TableHead className="font-bold text-gray-900">Review</TableHead>
                <TableHead className="font-bold text-gray-900">Helpful</TableHead>
                <TableHead className="font-bold text-gray-900">Status</TableHead>
                <TableHead className="font-bold text-gray-900">Date</TableHead>
                <TableHead className="font-bold text-gray-900 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReviews.map((review) => (
                <TableRow key={review.id} className="border-orange-200 hover:bg-orange-50">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-#8B5A3C to-#6B4423 flex items-center justify-center">
                        <span className="text-white font-semibold text-sm">
                          {review.userName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{review.userName}</p>
                        {review.verified && (
                          <Badge variant="secondary" className="bg-blue-100 text-blue-900 border-blue-300 text-xs">
                            Verified
                          </Badge>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-900 max-w-[200px] truncate">
                    {review.campId.substring(0, 12)}...
                  </TableCell>
                  <TableCell>{renderStars(review.rating)}</TableCell>
                  <TableCell className="max-w-[300px]">
                    <p className="text-sm text-gray-700 line-clamp-2">{review.reviewText}</p>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-gray-700">
                      <ThumbsUp className="w-4 h-4" />
                      {review.helpful}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(review)}</TableCell>
                  <TableCell className="text-gray-700">
                    {format(new Date(review.createdAt as string), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedReview(review);
                          setShowReviewDialog(true);
                        }}
                        className="border-orange-300 hover:bg-orange-50"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {filteredReviews.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600">No reviews found matching your filters</p>
          </div>
        )}
      </Card>

      {/* Review Details Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Details</DialogTitle>
          </DialogHeader>

          {selectedReview && (
            <div className="space-y-6">
              {/* User Info */}
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-#8B5A3C to-#6B4423 flex items-center justify-center">
                  <span className="text-white font-bold text-xl">
                    {selectedReview.userName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900">{selectedReview.userName}</h3>
                  <div className="flex gap-2 mt-2">
                    {renderStars(selectedReview.rating)}
                    {getStatusBadge(selectedReview)}
                  </div>
                </div>
              </div>

              {/* Review Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Camp ID</p>
                  <p className="font-mono text-sm text-gray-900">{selectedReview.campId}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Posted On</p>
                  <p className="font-semibold text-gray-900">
                    {format(new Date(selectedReview.createdAt as string), 'MMM dd, yyyy')}
                  </p>
                </div>
                {selectedReview.bookingId && (
                  <div>
                    <p className="text-sm text-gray-600">Booking ID</p>
                    <p className="font-mono text-sm text-gray-900">{selectedReview.bookingId}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-600">Helpful Votes</p>
                  <p className="text-xl font-bold text-gray-900">{selectedReview.helpful}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Verified</p>
                  <p className="font-semibold text-gray-900">{selectedReview.verified ? 'Yes' : 'No'}</p>
                </div>
              </div>

              {/* Review Text */}
              <div>
                <p className="text-sm text-gray-600 mb-2">Review</p>
                <div className="p-4 bg-orange-50 rounded-lg border border-orange-300">
                  <p className="text-gray-900">{selectedReview.reviewText}</p>
                </div>
              </div>

              {/* Flag Reason (if flagged) */}
              {selectedReview.flagged && selectedReview.flagReason && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">Flag Reason</p>
                  <div className="p-4 bg-red-50 rounded-lg border border-red-300">
                    <p className="text-red-900">{selectedReview.flagReason}</p>
                  </div>
                </div>
              )}

              {/* Flag Section */}
              {!selectedReview.flagged && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">Flag this review</p>
                  <Textarea
                    placeholder="Enter reason for flagging this review..."
                    value={flagReason}
                    onChange={(e) => setFlagReason(e.target.value)}
                    rows={3}
                    className="border-orange-300 focus:border-#8B5A3C mb-2"
                  />
                </div>
              )}

              {/* Actions */}
              <DialogFooter className="flex gap-2">
                {!selectedReview.flagged && (
                  <Button
                    variant="outline"
                    onClick={() => handleFlagReview(selectedReview.id, flagReason)}
                    disabled={actionLoading || !flagReason.trim()}
                    className="border-2 border-orange-300 text-amber-700 hover:bg-orange-50"
                  >
                    <Flag className="w-4 h-4 mr-2" />
                    Flag Review
                  </Button>
                )}

                <Button
                  variant="destructive"
                  onClick={() => handleDeleteReview(selectedReview.id, selectedReview.campId)}
                  disabled={actionLoading}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Review
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}