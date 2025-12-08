import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
      toast.error('Please sign in to manage availability');
      navigate('/signin');
      return;
    }

    if (!userData.isHost) {
      toast.error('You need to be a host to manage availability');
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
      toast.error('Failed to load your camps');
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
      setBlockedRanges(blocked);
      
      const blockedDatesList = getBlockedDatesList(blocked);
      setBlockedDates(blockedDatesList);

    } catch (error) {
      console.error('Error loading availability:', error);
      toast.error('Failed to load availability data');
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

      toast.success('Dates blocked successfully');
      setShowBlockDialog(false);
      await loadAvailability();
    } catch (error) {
      console.error('Error blocking dates:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to block dates';
      toast.error(errorMessage);
    }
  };

  const handleUnblockDates = async () => {
    if (!blockToDelete) return;

    try {
      setDeleting(true);
      await unblockDates(blockToDelete.id);
      toast.success('Dates unblocked successfully');
      setBlockToDelete(null);
      await loadAvailability();
    } catch (error) {
      console.error('Error unblocking dates:', error);
      toast.error('Failed to unblock dates');
    } finally {
      setDeleting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-50 via-orange-100 to-orange-200 p-4 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-#6B4423 animate-spin mx-auto mb-4" />
          <p className="text-gray-700 font-medium">Loading availability data...</p>
        </div>
      </div>
    );
  }

  if (!user || !userData || !userData.isHost) {
    return null;
  }

  if (camps.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-50 via-orange-100 to-orange-200 p-4">
        <div className="max-w-4xl mx-auto pt-8">
          <Button
            onClick={() => navigate('/host/listings')}
            variant="ghost"
            className="mb-6 text-gray-900 hover:text-gray-950 hover:bg-orange-100 font-medium"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to My Listings
          </Button>

          <Card className="p-8 text-center">
            <CalendarDays className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Camps Yet</h2>
            <p className="text-gray-600 mb-6">
              Create your first camp listing to start managing availability
            </p>
            <Button
              onClick={() => navigate('/host/create')}
              className="bg-#6B4423 hover:bg-#5A3820"
            >
              Create Camp Listing
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
    <div className="min-h-screen bg-gradient-to-b from-orange-50 via-orange-100 to-orange-200 p-4">
      <div className="max-w-6xl mx-auto pt-8 pb-20">
        <Button
          onClick={() => navigate('/host/listings')}
          variant="ghost"
          className="mb-6 text-gray-900 hover:text-gray-950 hover:bg-orange-100 font-medium"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to My Listings
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Manage Availability
          </h1>
          <p className="text-gray-700 font-medium">
            View bookings and block unavailable dates
          </p>
        </div>

        {/* Camp Selector */}
        <Card className="p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 max-w-md">
              <label className="text-sm font-semibold text-gray-900 mb-2 block">
                Select Camp
              </label>
              <Select
                value={selectedCamp?.id}
                onValueChange={(campId) => {
                  const camp = camps.find(c => c.id === campId);
                  setSelectedCamp(camp || null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a camp..." />
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
              Block Dates
            </Button>
          </div>
        </Card>

        {selectedCamp && (
          <>
            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <CalendarIcon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Total Bookings</p>
                    <p className="text-2xl font-bold text-gray-900">{bookings.length}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Check className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Confirmed</p>
                    <p className="text-2xl font-bold text-gray-900">{confirmedBookings}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <Users className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Pending</p>
                    <p className="text-2xl font-bold text-gray-900">{pendingBookings}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <XCircle className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Blocked Days</p>
                    <p className="text-2xl font-bold text-gray-900">{totalBlockedDays}</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Calendar View */}
            <Card className="p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Calendar Overview</h2>
              <Calendar
                mode="single"
                className="rounded-md border"
                modifiers={{
                  booked: bookedDates,
                  blocked: blockedDates,
                }}
                modifiersClassNames={{
                  booked: 'bg-green-100 text-green-900 font-semibold',
                  blocked: 'bg-gray-200 text-gray-600 line-through',
                }}
              />
              <div className="flex flex-wrap gap-4 mt-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-green-100 border border-green-300"></div>
                  <span className="text-gray-700">Booked</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-gray-200 border border-gray-300"></div>
                  <span className="text-gray-700">Blocked</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-white border-2 border-orange-300"></div>
                  <span className="text-gray-700">Available</span>
                </div>
              </div>
            </Card>

            {/* Blocked Dates List */}
            {blockedRanges.length > 0 && (
              <Card className="p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Blocked Date Ranges</h2>
                <div className="space-y-3">
                  {blockedRanges.map((block) => {
                    const startDate = block.startDate.toDate();
                    const endDate = block.endDate.toDate();
                    const days = differenceInDays(endDate, startDate) + 1;

                    return (
                      <div
                        key={block.id}
                        className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="bg-gray-100">
                              {days} day{days > 1 ? 's' : ''}
                            </Badge>
                            <Badge variant="outline">
                              {block.reasonCategory}
                            </Badge>
                          </div>
                          <p className="font-semibold text-gray-900">
                            {format(startDate, 'MMM dd, yyyy')} - {format(endDate, 'MMM dd, yyyy')}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            Reason: {block.reason}
                          </p>
                          {block.notes && (
                            <p className="text-sm text-gray-500 mt-1">
                              Notes: {block.notes}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setBlockToDelete(block)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
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
              <DialogTitle>Block Dates</DialogTitle>
              <DialogDescription>
                Select date range to block for {selectedCamp?.title}
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
              <AlertDialogTitle>Unblock Dates?</AlertDialogTitle>
              <AlertDialogDescription>
                {blockToDelete && (
                  <>
                    This will unblock dates from{' '}
                    <strong>{format(blockToDelete.startDate.toDate(), 'MMM dd, yyyy')}</strong> to{' '}
                    <strong>{format(blockToDelete.endDate.toDate(), 'MMM dd, yyyy')}</strong>.
                    <br />
                    These dates will become available for booking again.
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleUnblockDates}
                disabled={deleting}
                className="bg-red-600 hover:bg-red-700"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Unblocking...
                  </>
                ) : (
                  'Unblock Dates'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}