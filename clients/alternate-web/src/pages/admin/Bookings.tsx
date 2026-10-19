import { CampfireLoader } from '@/components/CampfireLoader';
import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  Calendar,
  Users,
  CheckCircle,
  Clock,
  XCircle,
  Download
} from 'lucide-react';
import { getAllBookings, updateBookingStatus, Booking } from '@/lib/firestore';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function AdminBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadBookings();
  }, []);

  useEffect(() => {
    filterBookings();
  }, [bookings, searchTerm, statusFilter, paymentFilter]);

  const loadBookings = async () => {
    try {
      setLoading(true);
      console.log('Loading bookings...');
      const data = await getAllBookings();
      console.log('Bookings loaded:', data.length);
      setBookings(data);
    } catch (error) {
      console.error('Error loading bookings:', error);
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const filterBookings = () => {
    let filtered = [...bookings];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(booking =>
        booking.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.campTitle.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(booking => booking.status === statusFilter);
    }

    // Payment filter
    if (paymentFilter !== 'all') {
      filtered = filtered.filter(booking => booking.paymentStatus === paymentFilter);
    }

    setFilteredBookings(filtered);
  };

  const handleUpdateStatus = async (bookingId: string, status: 'pending' | 'confirmed' | 'cancelled') => {
    try {
      setActionLoading(true);
      await updateBookingStatus(bookingId, status);
      toast.success(`Booking status updated to ${status}`);
      await loadBookings();
    } catch (error) {
      console.error('Error updating booking status:', error);
      toast.error('Failed to update booking status');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (date: Date | string | { toDate?: () => Date } | undefined) => {
    if (!date) return 'N/A';
    try {
      if (typeof date === 'object' && 'toDate' in date && typeof date.toDate === 'function') {
        return format(date.toDate(), 'MMM dd, yyyy');
      }
      const dateObj: Date = typeof date === 'string' ? new Date(date) : (date as Date);
      if (isNaN(dateObj.getTime())) return 'N/A';
      return format(dateObj, 'MMM dd, yyyy');
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'N/A';
    }
  };

  const exportToCSV = () => {
    const headers = ['Booking ID', 'User', 'Camp', 'Check-in', 'Check-out', 'Guests', 'Total Price', 'Status', 'Payment Status'];
    const rows = filteredBookings.map(booking => [
      booking.id,
      booking.userName || booking.userEmail || '',
      booking.campTitle,
      booking.checkInDate,
      booking.checkOutDate,
      booking.guests,
      booking.totalPrice,
      booking.status,
      booking.paymentStatus || 'pending'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bookings-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success('Bookings exported to CSV');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return (
          <Badge className="bg-green-500/10 text-green-400 border-green-500/20">
            <CheckCircle className="w-3 h-3 mr-1" />
            Confirmed
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-primary/10 text-primary border-primary/20">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge variant="secondary" className="bg-muted text-muted-foreground border-border">
            <XCircle className="w-3 h-3 mr-1" />
            Cancelled
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPaymentBadge = (status?: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500/10 text-green-400 border-green-500/20">Paid</Badge>;
      case 'pending':
        return <Badge className="bg-primary/10 text-primary border-primary/20">Pending</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'refunded':
        return <Badge className="bg-sky-500/10 text-sky-400 border-sky-500/20">Refunded</Badge>;
      default:
        return <Badge className="bg-primary/10 text-primary border-primary/20">Pending</Badge>;
    }
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
          <h2 className="text-3xl font-display font-bold text-foreground">Booking Management</h2>
          <p className="text-muted-foreground mt-1">{filteredBookings.length} bookings found</p>
        </div>
        <Button
          onClick={exportToCSV}
          variant="outline"
          className="border-2 border-border hover:bg-secondary"
          disabled={filteredBookings.length === 0}
        >
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card className="modern-card p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by ID, user, or camp..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          <Select value={paymentFilter} onValueChange={setPaymentFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by payment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Payments</SelectItem>
              <SelectItem value="completed">Paid</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="refunded">Refunded</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Bookings Table */}
      <Card className="modern-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary border-border">
                <TableHead className="font-bold text-foreground">Booking ID</TableHead>
                <TableHead className="font-bold text-foreground">User</TableHead>
                <TableHead className="font-bold text-foreground">Camp</TableHead>
                <TableHead className="font-bold text-foreground">Dates</TableHead>
                <TableHead className="font-bold text-foreground">Guests</TableHead>
                <TableHead className="font-bold text-foreground">Total</TableHead>
                <TableHead className="font-bold text-foreground">Status</TableHead>
                <TableHead className="font-bold text-foreground">Payment</TableHead>
                <TableHead className="font-bold text-foreground text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBookings.map((booking) => (
                <TableRow key={booking.id} className="border-border hover:bg-secondary">
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {booking.id.substring(0, 8)}...
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-semibold text-foreground">{booking.userName || 'Unknown'}</p>
                      <p className="text-sm text-muted-foreground">{booking.userEmail}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-foreground">{booking.campTitle}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <div>
                        <p>{formatDate(booking.checkInDate)}</p>
                        <p className="text-xs text-muted-foreground">to {formatDate(booking.checkOutDate)}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Users className="w-4 h-4" />
                      {booking.guests}
                    </div>
                  </TableCell>
                  <TableCell className="font-semibold text-primary">
                    {booking.totalPrice.toFixed(3)} BD
                  </TableCell>
                  <TableCell>{getStatusBadge(booking.status)}</TableCell>
                  <TableCell>{getPaymentBadge(booking.paymentStatus)}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedBooking(booking);
                          setShowBookingDialog(true);
                        }}
                        className="border-border hover:bg-secondary"
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

        {filteredBookings.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No bookings found matching your filters</p>
          </div>
        )}
      </Card>

      {/* Booking Details Dialog */}
      <Dialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Booking Details</DialogTitle>
          </DialogHeader>

          {selectedBooking && (
            <div className="space-y-6">
              {/* Booking ID */}
              <div>
                <p className="text-sm text-muted-foreground">Booking ID</p>
                <p className="font-mono text-sm text-foreground">{selectedBooking.id}</p>
              </div>

              {/* Status Badges */}
              <div className="flex gap-2">
                {getStatusBadge(selectedBooking.status)}
                {getPaymentBadge(selectedBooking.paymentStatus)}
              </div>

              {/* User & Camp Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Guest</p>
                  <p className="font-semibold text-foreground">{selectedBooking.userName || 'Unknown'}</p>
                  <p className="text-sm text-muted-foreground">{selectedBooking.userEmail}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Camp</p>
                  <p className="font-semibold text-foreground">{selectedBooking.campTitle}</p>
                  <p className="text-sm text-muted-foreground">{selectedBooking.campLocation}</p>
                </div>
              </div>

              {/* Booking Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Check-in</p>
                  <p className="font-semibold text-foreground">
                    {formatDate(selectedBooking.checkInDate)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Check-out</p>
                  <p className="font-semibold text-foreground">
                    {formatDate(selectedBooking.checkOutDate)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Guests</p>
                  <p className="text-xl font-bold text-foreground">{selectedBooking.guests}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Booked On</p>
                  <p className="font-semibold text-foreground">
                    {formatDate(selectedBooking.createdAt)}
                  </p>
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="border-t border-border pt-4">
                <p className="text-sm text-muted-foreground mb-3">Price Breakdown</p>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Base Price</span>
                    <span className="font-semibold text-foreground">
                      {(selectedBooking.priceBreakdown?.basePrice || 0).toFixed(3)} BD
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Service Fee</span>
                    <span className="font-semibold text-foreground">
                      {(selectedBooking.priceBreakdown?.serviceFee || 0).toFixed(3)} BD
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax</span>
                    <span className="font-semibold text-foreground">
                      {(selectedBooking.priceBreakdown?.tax || 0).toFixed(3)} BD
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-border">
                    <span className="font-bold text-foreground">Total</span>
                    <span className="text-xl font-bold text-primary">
                      {selectedBooking.totalPrice.toFixed(3)} BD
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Management */}
              <div>
                <p className="text-sm text-muted-foreground mb-2">Update Status</p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleUpdateStatus(selectedBooking.id, 'confirmed')}
                    disabled={actionLoading || selectedBooking.status === 'confirmed'}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Confirm
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleUpdateStatus(selectedBooking.id, 'pending')}
                    disabled={actionLoading || selectedBooking.status === 'pending'}
                    className="border-border text-primary hover:bg-secondary"
                  >
                    <Clock className="w-4 h-4 mr-1" />
                    Set Pending
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleUpdateStatus(selectedBooking.id, 'cancelled')}
                    disabled={actionLoading || selectedBooking.status === 'cancelled'}
                    className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}