import { CampfireLoader } from '@/components/CampfireLoader';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Calendar } from '@/components/ui/calendar';
import { DateRangePicker } from '@/components/DateRangePicker';
import { useAuth } from '@/hooks/useAuth';
import { getCampsByHost, getBookingsByCamp, Camp, Booking } from '@/lib/firestore';
import { 
  blockDates, 
  unblockDates, 
  getBlockedDates, 
  getBlockedDatesList,
  BlockedDate 
} from '@/lib/dateBlocking';
import { getBookedDates } from '@/lib/availability';
import { 
  ArrowLeft, 
  CalendarDays, 
  Loader2, 
  Plus, 
  Trash2,
  Calendar as CalendarIcon,
  Users,
  XCircle,
  Check
} from 'lucide-react';
import { format, parseISO, isSameDay, differenceInDays } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function ManageAvailability() {
  const navigate = useNavigate();
  const { user, userData, loading: authLoading } = useAuth();
  const { t, i18n } = useTranslation();
  const fmtDate = (d: Date) => d.toLocaleDateString(i18n.language === 'ar' ? 'ar-BH' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  const [camps, setCamps] = useState<Camp[]>([]);
  const [selectedCamp, setSelectedCamp] = useState<Camp | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookedDates, setBookedDates] = useState<Date[]>([]);
  const [blockedRanges, setBlockedRanges] = useState<BlockedDate[]>([]);
  const [blockedDates, setBlockedDates] = useState<Date[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [blockToDelete, setBlockToDelete] = useState<BlockedDate | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Load camps
  useEffect(() => {
    if (authLoading) return;

    if (!user || !userData) {
      toast.error(t('manageAvailability.toasts.signInRequired'));
      navigate('/signin');
      return;
    }

    if (!userData.isHost) {
      toast.error(t('manageAvailability.toasts.hostRequired'));
      navigate('/profile');
      return;
    }

    loadCamps();
  }, [user, userData, authLoading, navigate]);

  const loadCamps = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const hostCamps = await getCampsByHost(user.uid);
      setCamps(hostCamps);

      if (hostCamps.length > 0) {
        setSelectedCamp(hostCamps[0]);
      }
    } catch (error) {
      console.error('Error loading camps:', error);
      toast.error(t('manageAvailability.toasts.loadCampsFailed'));
    } finally {
      setLoading(false);
    }
  };

  // Load availability data when camp changes
  useEffect(() => {
    if (selectedCamp) {
      loadAvailability();
    }
  }, [selectedCamp]);

  const loadAvailability = async () => {
    if (!selectedCamp) return;

    try {
      // Load bookings
      const campBookings = await getBookingsByCamp(selectedCamp.id);
      setBookings(campBookings);

      // Load booked dates
      const booked = await getBookedDates(selectedCamp.id);
      setBookedDates(booked);

      // Load blocked dates
      const blocked = await getBlockedDates(selectedCamp.id);
      setBlockedRanges(blocked as unknown as BlockedDate[]);
      
      const blockedDatesList = getBlockedDatesList(blocked);
      setBlockedDates(blockedDatesList);

    } catch (error) {
      console.error('Error loading availability:', error);
      toast.error(t('manageAvailability.toasts.loadAvailabilityFailed'));
    }
  };

  const handleBlockDates = async (
    dateRange: { startDate: Date; endDate: Date },
    reason: string,
    reasonCategory: string,
    notes?: string
  ) => {
    if (!selectedCamp || !user) return;

    try {
      await blockDates(
        selectedCamp.id,
        dateRange,
        user.uid,
        reason,
        reasonCategory as 'maintenance' | 'personal' | 'weather' | 'event' | 'seasonal' | 'other',
        notes
      );

      toast.success(t('manageAvailability.toasts.blocked'));
      setShowBlockDialog(false);
      await loadAvailability();
    } catch (error) {
      console.error('Error blocking dates:', error);
      const errorMessage = error instanceof Error ? error.message : t('manageAvailability.toasts.blockFailed');
      toast.error(errorMessage);
    }
  };

  const handleUnblockDates = async () => {
    if (!blockToDelete) return;

    try {
      setDeleting(true);
      await unblockDates(blockToDelete.id);
      toast.success(t('manageAvailability.toasts.unblocked'));
      setBlockToDelete(null);
      await loadAvailability();
    } catch (error) {
      console.error('Error unblocking dates:', error);
      toast.error(t('manageAvailability.toasts.unblockFailed'));
    } finally {
      setDeleting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b desert-gradient p-4 flex items-center justify-center">
        <div className="text-center">
          <CampfireLoader size="lg" className="mx-auto mb-4" />
          <p className="text-muted-foreground font-medium">{t('manageAvailability.loading')}</p>
        </div>
      </div>
    );
  }

  if (!user || !userData || !userData.isHost) {
    return null;
  }

  if (camps.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b desert-gradient p-4">
        <div className="max-w-4xl mx-auto pt-8">
          <Button
            onClick={() => navigate('/host/listings')}
            variant="ghost"
            className="mb-6 text-foreground hover:text-primary hover:bg-secondary font-medium"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('manageAvailability.back')}
          </Button>

          <Card className="p-8 text-center bg-card border-border">
            <CalendarDays className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold font-display text-foreground mb-2">{t('manageAvailability.noCampsTitle')}</h2>
            <p className="text-muted-foreground mb-6">
              {t('manageAvailability.noCampsDesc')}
            </p>
            <Button
              onClick={() => navigate('/host/create')}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {t('manageAvailability.createCamp')}
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  const confirmedBookings = bookings.filter(b => b.status === 'confirmed').length;
  const pendingBookings = bookings.filter(b => b.status === 'pending').length;
  const totalBlockedDays = blockedDates.length;

  return (
    <div className="min-h-screen bg-gradient-to-b desert-gradient p-4">
      <div className="max-w-6xl mx-auto pt-8 pb-20">
        <Button
          onClick={() => navigate('/host/listings')}
          variant="ghost"
          className="mb-6 text-foreground hover:text-primary hover:bg-secondary font-medium"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('manageAvailability.back')}
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold font-display text-foreground mb-2">
            {t('manageAvailability.title')}
          </h1>
          <p className="text-muted-foreground font-medium">
            {t('manageAvailability.subtitle')}
          </p>
        </div>

        {/* Camp Selector */}
        <Card className="p-6 mb-6 bg-card border-border">
          <div className="flex items-center justify-between">
            <div className="flex-1 max-w-md">
              <label className="text-sm font-semibold text-foreground mb-2 block">
                {t('manageAvailability.selectCamp')}
              </label>
              <Select
                value={selectedCamp?.id}
                onValueChange={(campId) => {
                  const camp = camps.find(c => c.id === campId);
                  setSelectedCamp(camp || null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('manageAvailability.chooseCamp')} />
                </SelectTrigger>
                <SelectContent>
                  {camps.map(camp => (
                    <SelectItem key={camp.id} value={camp.id}>
                      {camp.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={() => setShowBlockDialog(true)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('manageAvailability.blockDatesBtn')}
            </Button>
          </div>
        </Card>

        {selectedCamp && (
          <>
            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card className="p-4 bg-card border-border">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-sky-500/10 rounded-lg">
                    <CalendarIcon className="w-5 h-5 text-sky-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">{t('manageAvailability.stats.total')}</p>
                    <p className="text-2xl font-bold text-foreground">{bookings.length}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4 bg-card border-border">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <Check className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">{t("manageAvailability.stats.confirmed")}</p>
                    <p className="text-2xl font-bold text-foreground">{confirmedBookings}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4 bg-card border-border">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">{t("manageAvailability.stats.pending")}</p>
                    <p className="text-2xl font-bold text-foreground">{pendingBookings}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4 bg-card border-border">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-lg">
                    <XCircle className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">{t('manageAvailability.stats.blocked')}</p>
                    <p className="text-2xl font-bold text-foreground">{totalBlockedDays}</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Calendar View */}
            <Card className="p-6 mb-6 bg-card border-border">
              <h2 className="text-xl font-bold font-display text-foreground mb-4">{t('manageAvailability.calendar.title')}</h2>
              <Calendar
                mode="single"
                className="rounded-md border border-border"
                modifiers={{
                  booked: bookedDates,
                  blocked: blockedDates,
                }}
                modifiersClassNames={{
                  booked: 'bg-green-500/15 text-green-400 font-semibold',
                  blocked: 'bg-muted text-muted-foreground line-through',
                }}
              />
              <div className="flex flex-wrap gap-4 mt-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-green-500/15 border border-green-500/30"></div>
                  <span className="text-muted-foreground">{t("manageAvailability.calendar.booked")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-muted border border-border"></div>
                  <span className="text-muted-foreground">{t("manageAvailability.calendar.blocked")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-card border-2 border-border"></div>
                  <span className="text-muted-foreground">{t("manageAvailability.calendar.available")}</span>
                </div>
              </div>
            </Card>

            {/* Blocked Dates List */}
            {blockedRanges.length > 0 && (
              <Card className="p-6 bg-card border-border">
                <h2 className="text-xl font-bold font-display text-foreground mb-4">{t('manageAvailability.blockedRanges.title')}</h2>
                <div className="space-y-3">
                  {blockedRanges.map((block) => {
                    const startDate = block.startDate.toDate();
                    const endDate = block.endDate.toDate();
                    const days = differenceInDays(endDate, startDate) + 1;

                    return (
                      <div
                        key={block.id}
                        className="flex items-center justify-between p-4 bg-secondary border border-border rounded-lg hover:shadow-md transition-shadow"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="bg-muted border-border">
                              {t('manageAvailability.blockedRanges.day', { count: days })}
                            </Badge>
                            <Badge variant="outline" className="border-border">
                              {block.reasonCategory}
                            </Badge>
                          </div>
                          <p className="font-semibold text-foreground">
                            {fmtDate(startDate)} – {fmtDate(endDate)}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {t('manageAvailability.blockedRanges.reason')}: {block.reason}
                          </p>
                          {block.notes && (
                            <p className="text-sm text-muted-foreground/80 mt-1">
                              {t('manageAvailability.blockedRanges.notes')}: {block.notes}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setBlockToDelete(block)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}
          </>
        )}

        {/* Block Dates Dialog */}
        <Dialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t('manageAvailability.blockDatesBtn')}</DialogTitle>
              <DialogDescription>
                {t('manageAvailability.blockDialog.description', { campTitle: selectedCamp?.title })}
              </DialogDescription>
            </DialogHeader>
            <DateRangePicker
              onConfirm={handleBlockDates}
              onCancel={() => setShowBlockDialog(false)}
              bookedDates={bookedDates}
            />
          </DialogContent>
        </Dialog>

        {/* Unblock Confirmation Dialog */}
        <AlertDialog open={!!blockToDelete} onOpenChange={(open) => !open && setBlockToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('manageAvailability.unblockDialog.title')}</AlertDialogTitle>
              <AlertDialogDescription>
                {blockToDelete && (
                  <>
                    {t('manageAvailability.unblockDialog.from')}{' '}
                    <strong>{fmtDate(blockToDelete.startDate.toDate())}</strong>{' '}
                    {t('manageAvailability.unblockDialog.to')}{' '}
                    <strong>{fmtDate(blockToDelete.endDate.toDate())}</strong>.
                    <br />
                    {t('manageAvailability.unblockDialog.willBeAvailable')}
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>{t('manageAvailability.unblockDialog.cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleUnblockDates}
                disabled={deleting}
                className="bg-red-600 hover:bg-red-700"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('manageAvailability.unblockDialog.unblocking')}
                  </>
                ) : (
                  t('manageAvailability.unblockDialog.confirm')
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}