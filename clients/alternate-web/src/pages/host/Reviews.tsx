import { CampfireLoader } from '@/components/CampfireLoader';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Star, MessageSquare, Send, Loader2, UserCircle2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import {
  getReviewsByHostCamps,
  updateReviewResponse,
  updateUserProfile,
  Review,
} from '@/lib/firestore';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// ─── Rating Distribution Bar ────────────────────────────────────────────────

interface RatingDistributionBarProps {
  reviews: Review[];
  isRTL: boolean;
}

function RatingDistributionBar({ reviews, isRTL }: RatingDistributionBarProps) {
  const { t } = useTranslation();
  const total = reviews.length;

  const counts = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => Math.round(r.rating) === star).length,
  }));

  return (
    <div className="space-y-2">
      {counts.map(({ star, count }) => {
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        return (
          <div
            key={star}
            className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <span className="text-sm font-semibold text-foreground w-6 text-center">{star}</span>
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />
            <div className="flex-1 bg-secondary rounded-full h-2.5 overflow-hidden">
              <div
                className="h-full bg-amber-400 rounded-full transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-sm text-muted-foreground w-8 text-right shrink-0">{count}</span>
          </div>
        );
      })}
      {total === 0 && (
        <p className="text-sm text-muted-foreground text-center py-2">
          {t('hostReviews.noReviews')}
        </p>
      )}
    </div>
  );
}

// ─── Star display ────────────────────────────────────────────────────────────

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`w-4 h-4 ${
            s <= Math.round(rating)
              ? 'text-amber-400 fill-amber-400'
              : 'text-muted-foreground/30 fill-muted-foreground/10'
          }`}
        />
      ))}
    </div>
  );
}

// ─── Review Card ─────────────────────────────────────────────────────────────

interface ReviewCardProps {
  review: Review;
  isNew: boolean;
  isRTL: boolean;
  t: (key: string, opts?: Record<string, unknown>) => string;
}

function ReviewCard({ review, isNew, isRTL, t }: ReviewCardProps) {
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState(review.adminResponse || '');
  const [submitting, setSubmitting] = useState(false);
  const [savedReply, setSavedReply] = useState(review.adminResponse || '');

  const createdDate =
    typeof review.createdAt === 'string'
      ? new Date(review.createdAt)
      : (review.createdAt as { toDate: () => Date }).toDate();

  const formattedDate = createdDate.toLocaleDateString(isRTL ? 'ar-BH' : 'en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const handleSubmit = async () => {
    if (!replyText.trim()) return;
    setSubmitting(true);
    try {
      await updateReviewResponse(review.id, replyText.trim());
      setSavedReply(replyText.trim());
      setReplying(false);
      toast.success(t('hostReviews.replySaved'));
    } catch (err) {
      console.error('[HostReviews] reply failed', err);
      toast.error(t('hostReviews.replyFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card
      className={`bg-card border-2 p-5 transition-all ${
        isNew ? 'border-primary/40 shadow-md' : 'border-border/60'
      }`}
    >
      {/* Header */}
      <div className={`flex items-start gap-3 mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <Avatar className="w-10 h-10 shrink-0">
          {review.userPhoto ? (
            <AvatarImage src={review.userPhoto} alt={review.userName} />
          ) : null}
          <AvatarFallback>
            <UserCircle2 className="w-6 h-6 text-muted-foreground" />
          </AvatarFallback>
        </Avatar>

        <div className={`flex-1 min-w-0 ${isRTL ? 'text-right' : ''}`}>
          <div className={`flex items-center gap-2 flex-wrap ${isRTL ? 'flex-row-reverse' : ''}`}>
            <span className="font-semibold text-foreground text-sm">
              {review.userName || t('hostReviews.anonymousGuest')}
            </span>
            {isNew && (
              <Badge className="bg-primary/15 text-primary border-primary/30 text-xs font-semibold px-2 py-0">
                {t('hostReviews.newBadge')}
              </Badge>
            )}
          </div>
          <div className={`flex items-center gap-2 mt-0.5 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <StarRow rating={review.rating} />
            <span className="text-xs text-muted-foreground">{formattedDate}</span>
          </div>
        </div>
      </div>

      {/* Review text */}
      {review.reviewText ? (
        <p className={`text-foreground/80 text-sm leading-relaxed mb-3 ${isRTL ? 'text-right' : ''}`}>
          {review.reviewText}
        </p>
      ) : null}

      {/* Existing reply */}
      {savedReply && !replying && (
        <div className={`rounded-xl bg-primary/8 border border-primary/20 px-4 py-3 mb-3 ${isRTL ? 'text-right' : ''}`}>
          <p className={`text-xs font-semibold text-primary mb-1 ${isRTL ? 'text-right' : ''}`}>
            {t('hostReviews.yourReply')}
          </p>
          <p className="text-sm text-foreground/80 leading-relaxed">{savedReply}</p>
        </div>
      )}

      {/* Reply form */}
      {replying && (
        <div className="mt-2 space-y-2">
          <Textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder={t('hostReviews.replyPlaceholder')}
            rows={3}
            className={`text-sm border-primary/40 focus:border-primary resize-none ${isRTL ? 'text-right' : ''}`}
            dir={isRTL ? 'rtl' : 'ltr'}
          />
          <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={submitting || !replyText.trim()}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            >
              {submitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
              ) : (
                <Send className="w-3.5 h-3.5 mr-1" />
              )}
              {t('hostReviews.submitReply')}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setReplying(false);
                setReplyText(savedReply);
              }}
              disabled={submitting}
              className="text-muted-foreground"
            >
              {t('hostReviews.cancel')}
            </Button>
          </div>
        </div>
      )}

      {/* Reply / Edit-reply button */}
      {!replying && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => setReplying(true)}
          className="border-border text-foreground hover:bg-secondary font-medium text-xs mt-1"
        >
          <MessageSquare className="w-3.5 h-3.5 mr-1" />
          {savedReply ? t('hostReviews.editReply') : t('hostReviews.replyBtn')}
        </Button>
      )}
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function HostReviews() {
  const navigate = useNavigate();
  const { user, userData, loading: authLoading } = useAuth();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [lastVisit, setLastVisit] = useState<Date | null>(null);

  // Auth guard
  useEffect(() => {
    if (authLoading) return;
    if (!user || !userData) {
      navigate('/signin');
    } else if (!userData.isHost) {
      navigate('/profile');
    }
  }, [user, userData, authLoading, navigate]);

  // Load reviews + last visit timestamp
  useEffect(() => {
    if (authLoading || !user?.uid) return;

    const load = async () => {
      try {
        // Read last visit timestamp from user profile
        if (db) {
          const userSnap = await getDoc(doc(db, 'users', user.uid));
          if (userSnap.exists()) {
            const raw = userSnap.data()?.lastReviewsVisitAt;
            if (typeof raw === 'string') setLastVisit(new Date(raw));
          }
        }

        const data = await getReviewsByHostCamps(user.uid);
        setReviews(data);

        // Record this visit
        await updateUserProfile(user.uid, {
          lastReviewsVisitAt: new Date().toISOString(),
        } as Parameters<typeof updateUserProfile>[1]);
      } catch (err) {
        console.error('[HostReviews] load failed', err);
        toast.error(t('hostReviews.loadFailed'));
        setReviews([]);
      }
    };

    load();
  }, [user?.uid, authLoading]);

  if (authLoading || reviews === null) {
    return (
      <div className="min-h-screen bg-gradient-to-b desert-gradient flex items-center justify-center p-4">
        <CampfireLoader size="md" className="mx-auto my-4" />
      </div>
    );
  }

  if (!userData?.isHost) return null;

  // Aggregate stats
  const totalCount = reviews.length;
  const avgRating =
    totalCount > 0
      ? reviews.reduce((s, r) => s + r.rating, 0) / totalCount
      : 0;

  const newReviews = reviews.filter((r) => {
    if (!lastVisit) return true;
    const created =
      typeof r.createdAt === 'string'
        ? new Date(r.createdAt)
        : (r.createdAt as { toDate: () => Date }).toDate();
    return created > lastVisit;
  });

  return (
    <div className="min-h-screen bg-gradient-to-b desert-gradient p-4">
      <div className="max-w-4xl mx-auto pt-8 pb-20">
        {/* Back button */}
        <Button
          onClick={() => navigate('/host')}
          variant="ghost"
          className="mb-6 text-foreground hover:text-primary hover:bg-secondary font-medium"
        >
          <ArrowLeft className={`w-4 h-4 ${isRTL ? 'ml-2 rotate-180' : 'mr-2'}`} />
          {t('hostReviews.backToDashboard')}
        </Button>

        {/* Page title */}
        <div className={`flex items-center gap-3 mb-8 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-amber-500 rounded-xl flex items-center justify-center shadow-md">
            <Star className="w-6 h-6 text-white fill-white" />
          </div>
          <div className={isRTL ? 'text-right' : ''}>
            <h1 className="text-3xl font-bold font-display text-foreground">{t('hostReviews.title')}</h1>
            {newReviews.length > 0 && (
              <p className="text-sm text-primary font-medium mt-0.5">
                {t('hostReviews.unreadCount', { count: newReviews.length })}
              </p>
            )}
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-card border-border p-5 text-center shadow-sm">
            <div className="text-4xl font-bold text-amber-500 mb-1">
              {totalCount > 0 ? avgRating.toFixed(1) : '—'}
            </div>
            <div className="flex justify-center mb-1">
              {totalCount > 0 ? <StarRow rating={avgRating} /> : null}
            </div>
            <p className="text-xs text-muted-foreground font-medium">{t('hostReviews.avgRating')}</p>
          </Card>

          <Card className="bg-card border-border p-5 text-center shadow-sm">
            <div className="text-4xl font-bold text-foreground mb-2">{totalCount}</div>
            <p className="text-xs text-muted-foreground font-medium">{t('hostReviews.totalReviews')}</p>
          </Card>

          <Card className="bg-card border-border p-5 text-center shadow-sm col-span-2 md:col-span-1">
            <div className="text-4xl font-bold text-primary mb-2">{newReviews.length}</div>
            <p className="text-xs text-muted-foreground font-medium">{t('hostReviews.newSinceVisit')}</p>
          </Card>
        </div>

        {/* Rating distribution */}
        {totalCount > 0 && (
          <Card className="bg-card border-border p-6 shadow-sm mb-8">
            <h2 className={`font-bold text-foreground mb-4 ${isRTL ? 'text-right' : ''}`}>
              {t('hostReviews.distribution')}
            </h2>
            <RatingDistributionBar reviews={reviews} isRTL={isRTL} />
          </Card>
        )}

        {/* Review list */}
        {totalCount === 0 ? (
          <Card className="bg-card border-border p-12 text-center shadow-sm">
            <Star className="w-12 h-12 text-muted-foreground/20 fill-muted-foreground/10 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {t('hostReviews.emptyTitle')}
            </h3>
            <p className="text-muted-foreground text-sm max-w-xs mx-auto">
              {t('hostReviews.emptyDesc')}
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            <h2 className={`font-bold text-foreground ${isRTL ? 'text-right' : ''}`}>
              {t('hostReviews.allReviews')} ({totalCount})
            </h2>
            {reviews.map((review) => {
              const created =
                typeof review.createdAt === 'string'
                  ? new Date(review.createdAt)
                  : (review.createdAt as { toDate: () => Date }).toDate();
              const isNew = lastVisit ? created > lastVisit : true;
              return (
                <ReviewCard
                  key={review.id}
                  review={review}
                  isNew={isNew}
                  isRTL={isRTL}
                  t={t}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
