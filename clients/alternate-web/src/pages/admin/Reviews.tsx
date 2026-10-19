import { CampfireLoader } from '@/components/CampfireLoader';
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
                ? 'fill-primary text-primary'
                : 'text-muted-foreground/40'
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
      <Badge className="bg-green-500/10 text-green-400 border-green-500/20">
        <CheckCircle className="w-3 h-3 mr-1" />
        Active
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <CampfireLoader size="lg" className="mx-auto mb-4" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold font-display text-foreground">Review Moderation</h2>
          <p className="text-muted-foreground mt-1">{filteredReviews.length} reviews found</p>
        </div>
      </div>

      {/* Filters */}
      <Card className="modern-card p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by user or review text..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={ratingFilter} onValueChange={setRatingFilter}>
            <SelectTrigger>
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
            <SelectTrigger>
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
      <Card className="modern-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 border-border">
                <TableHead className="font-bold text-foreground">User</TableHead>
                <TableHead className="font-bold text-foreground">Camp ID</TableHead>
                <TableHead className="font-bold text-foreground">Rating</TableHead>
                <TableHead className="font-bold text-foreground">Review</TableHead>
                <TableHead className="font-bold text-foreground">Helpful</TableHead>
                <TableHead className="font-bold text-foreground">Status</TableHead>
                <TableHead className="font-bold text-foreground">Date</TableHead>
                <TableHead className="font-bold text-foreground text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReviews.map((review) => (
                <TableRow key={review.id} className="border-border hover:bg-muted/40">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                        <span className="text-primary-foreground font-semibold text-sm">
                          {review.userName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{review.userName}</p>
                        {review.verified && (
                          <Badge variant="secondary" className="bg-sky-500/10 text-sky-400 border-sky-500/20 text-xs">
                            Verified
                          </Badge>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-foreground max-w-[200px] truncate">
                    {review.campId.substring(0, 12)}...
                  </TableCell>
                  <TableCell>{renderStars(review.rating)}</TableCell>
                  <TableCell className="max-w-[300px]">
                    <p className="text-sm text-muted-foreground line-clamp-2">{review.reviewText}</p>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <ThumbsUp className="w-4 h-4" />
                      {review.helpful}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(review)}</TableCell>
                  <TableCell className="text-muted-foreground">
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
                        className="border-border hover:bg-muted"
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
            <p className="text-muted-foreground">No reviews found matching your filters</p>
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
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-xl">
                    {selectedReview.userName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-foreground">{selectedReview.userName}</h3>
                  <div className="flex gap-2 mt-2">
                    {renderStars(selectedReview.rating)}
                    {getStatusBadge(selectedReview)}
                  </div>
                </div>
              </div>

              {/* Review Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Camp ID</p>
                  <p className="font-mono text-sm text-foreground">{selectedReview.campId}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Posted On</p>
                  <p className="font-semibold text-foreground">
                    {format(new Date(selectedReview.createdAt as string), 'MMM dd, yyyy')}
                  </p>
                </div>
                {selectedReview.bookingId && (
                  <div>
                    <p className="text-sm text-muted-foreground">Booking ID</p>
                    <p className="font-mono text-sm text-foreground">{selectedReview.bookingId}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Helpful Votes</p>
                  <p className="text-xl font-bold text-foreground">{selectedReview.helpful}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Verified</p>
                  <p className="font-semibold text-foreground">{selectedReview.verified ? 'Yes' : 'No'}</p>
                </div>
              </div>

              {/* Review Text */}
              <div>
                <p className="text-sm text-muted-foreground mb-2">Review</p>
                <div className="p-4 bg-muted/50 rounded-lg border border-border">
                  <p className="text-foreground">{selectedReview.reviewText}</p>
                </div>
              </div>

              {/* Flag Reason (if flagged) */}
              {selectedReview.flagged && selectedReview.flagReason && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Flag Reason</p>
                  <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/20">
                    <p className="text-red-400">{selectedReview.flagReason}</p>
                  </div>
                </div>
              )}

              {/* Flag Section */}
              {!selectedReview.flagged && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Flag this review</p>
                  <Textarea
                    placeholder="Enter reason for flagging this review..."
                    value={flagReason}
                    onChange={(e) => setFlagReason(e.target.value)}
                    rows={3}
                    className="mb-2"
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
                    className="border-border text-primary hover:bg-muted"
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