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
  Loader2,
  Calendar,
  Users,
  CheckCircle,
  Clock,
  XCircle,
  Download
} from 'lucide-react';
import { getAllBookings, updateBooking, Booking } from '@/lib/firestore';
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
      await updateBooking(bookingId, { status });
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
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      if (dateObj instanceof Date && isNaN(dateObj.getTime())) return 'N/A';
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
          <Badge className="bg-green-100 text-green-900 border-green-300">
            <CheckCircle className="w-3 h-3 mr-1" />
            Confirmed
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-amber-100 text-amber-900 border-orange-300">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge variant="secondary" className="bg-gray-100 text-gray-900 border-gray-300">
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
        return <Badge className="bg-green-100 text-green-900 border-green-300">Paid</Badge>;
      case 'pending':
        return <Badge className="bg-amber-100 text-amber-900 border-orange-300">Pending</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'refunded':
        return <Badge className="bg-blue-100 text-blue-900 border-blue-300">Refunded</Badge>;
      default:
        return <Badge className="bg-amber-100 text-amber-900 border-orange-300">Pending</Badge>;
    }
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
          <h2 className="text-3xl font-bold text-gray-900">Booking Management</h2>
          <p className="text-gray-600 mt-1">{filteredBookings.length} bookings found</p>
        </div>
        <Button
          onClick={exportToCSV}
          variant="outline"
          className="border-2 border-orange-300 hover:bg-orange-50"
          disabled={filteredBookings.length === 0}
        >
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-white/95 backdrop-blur-sm border-orange-300 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by ID, user, or camp..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 border-orange-300 focus:border-#8B5A3C"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="border-orange-300 focus:border-#8B5A3C">
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
            <SelectTrigger className="border-orange-300 focus:border-#8B5A3C">
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
      <Card className="bg-white/95 backdrop-blur-sm border-orange-300 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-orange-50 border-orange-300">
                <TableHead className="font-bold text-gray-900">Booking ID</TableHead>
                <TableHead className="font-bold text-gray-900">User</TableHead>
                <TableHead className="font-bold text-gray-900">Camp</TableHead>
                <TableHead className="font-bold text-gray-900">Dates</TableHead>
                <TableHead className="font-bold text-gray-900">Guests</TableHead>
                <TableHead className="font-bold text-gray-900">Total</TableHead>
                <TableHead className="font-bold text-gray-900">Status</TableHead>
                <TableHead className="font-bold text-gray-900">Payment</TableHead>
                <TableHead className="font-bold text-gray-900 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBookings.map((booking) => (
                <TableRow key={booking.id} className="border-orange-200 hover:bg-orange-50">
                  <TableCell className="font-mono text-sm text-gray-700">
                    {booking.id.substring(0, 8)}...
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-semibold text-gray-900">{booking.userName || 'Unknown'}</p>
                      <p className="text-sm text-gray-600">{booking.userEmail}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-900">{booking.campTitle}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-gray-700">
                      <Calendar className="w-4 h-4" />
                      <div>
                        <p>{formatDate(booking.checkInDate)}</p>
                        <p className="text-xs text-gray-500">to {formatDate(booking.checkOutDate)}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-gray-700">
                      <Users className="w-4 h-4" />
                      {booking.guests}
                    </div>
                  </TableCell>
                  <TableCell className="font-semibold text-#6B4423">
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

        {filteredBookings.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600">No bookings found matching your filters</p>
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
                <p className="text-sm text-gray-600">Booking ID</p>
                <p className="font-mono text-sm text-gray-900">{selectedBooking.id}</p>
              </div>

              {/* Status Badges */}
              <div className="flex gap-2">
                {getStatusBadge(selectedBooking.status)}
                {getPaymentBadge(selectedBooking.paymentStatus)}
              </div>

              {/* User & Camp Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Guest</p>
                  <p className="font-semibold text-gray-900">{selectedBooking.userName || 'Unknown'}</p>
                  <p className="text-sm text-gray-600">{selectedBooking.userEmail}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Camp</p>
                  <p className="font-semibold text-gray-900">{selectedBooking.campTitle}</p>
                  <p className="text-sm text-gray-600">{selectedBooking.campLocation}</p>
                </div>
              </div>

              {/* Booking Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Check-in</p>
                  <p className="font-semibold text-gray-900">
                    {formatDate(selectedBooking.checkInDate)}
                  </p>
                  <p className="text-sm text-gray-600">{selectedBooking.checkIn.split(' ')[1]}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Check-out</p>
                  <p className="font-semibold text-gray-900">
                    {formatDate(selectedBooking.checkOutDate)}
                  </p>
                  <p className="text-sm text-gray-600">{selectedBooking.checkOut.split(' ')[1]}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Guests</p>
                  <p className="text-xl font-bold text-gray-900">{selectedBooking.guests}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Booked On</p>
                  <p className="font-semibold text-gray-900">
                    {formatDate(selectedBooking.createdAt)}
                  </p>
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="border-t border-orange-300 pt-4">
                <p className="text-sm text-gray-600 mb-3">Price Breakdown</p>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700">Camp Price</span>
                    <span className="font-semibold text-gray-900">
                      {(selectedBooking.campPrice || 0).toFixed(3)} BD
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700">Service Fee</span>
                    <span className="font-semibold text-gray-900">
                      {(selectedBooking.serviceFee || 0).toFixed(3)} BD
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700">Taxes</span>
                    <span className="font-semibold text-gray-900">
                      {(selectedBooking.taxes || 0).toFixed(3)} BD
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-orange-300">
                    <span className="font-bold text-gray-900">Total</span>
                    <span className="text-xl font-bold text-#6B4423">
                      {selectedBooking.totalPrice.toFixed(3)} BD
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Management */}
              <div>
                <p className="text-sm text-gray-600 mb-2">Update Status</p>
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
                    className="border-orange-300 text-amber-700 hover:bg-orange-50"
                  >
                    <Clock className="w-4 h-4 mr-1" />
                    Set Pending
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleUpdateStatus(selectedBooking.id, 'cancelled')}
                    disabled={actionLoading || selectedBooking.status === 'cancelled'}
                    className="border-red-300 text-red-700 hover:bg-red-50"
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