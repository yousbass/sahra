import { CampfireLoader } from '@/components/CampfireLoader';
import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
  DollarSign,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Download,
  RefreshCw
} from 'lucide-react';
import { getRefunds, updateRefundStatus, RefundRecord } from '@/lib/firestore';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function AdminRefunds() {
  const [refunds, setRefunds] = useState<RefundRecord[]>([]);
  const [filteredRefunds, setFilteredRefunds] = useState<RefundRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRefund, setSelectedRefund] = useState<RefundRecord | null>(null);
  const [showRefundDialog, setShowRefundDialog] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');

  useEffect(() => {
    loadRefunds();
  }, []);

  useEffect(() => {
    filterRefunds();
  }, [refunds, searchTerm, statusFilter]);

  const loadRefunds = async () => {
    try {
      setLoading(true);
      console.log('Loading refunds...');
      const data = await getRefunds();
      console.log('Refunds loaded:', data.length);
      setRefunds(data);
    } catch (error) {
      console.error('Error loading refunds:', error);
      toast.error('Failed to load refunds');
    } finally {
      setLoading(false);
    }
  };

  const filterRefunds = () => {
    let filtered = [...refunds];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(refund =>
        refund.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        refund.bookingId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        refund.guestId.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(refund => refund.status === statusFilter);
    }

    // Sort by date (newest first)
    filtered.sort((a, b) => {
      const dateA = a.initiatedAt && typeof a.initiatedAt === 'object' && 'toDate' in a.initiatedAt
        ? a.initiatedAt.toDate().getTime()
        : new Date(a.initiatedAt as string).getTime();
      const dateB = b.initiatedAt && typeof b.initiatedAt === 'object' && 'toDate' in b.initiatedAt
        ? b.initiatedAt.toDate().getTime()
        : new Date(b.initiatedAt as string).getTime();
      return dateB - dateA;
    });

    setFilteredRefunds(filtered);
  };

  const handleUpdateStatus = async (
    refundId: string,
    status: 'pending' | 'processing' | 'completed' | 'failed',
    notes?: string
  ) => {
    try {
      setActionLoading(true);
      await updateRefundStatus(refundId, status, notes);
      toast.success(`Refund status updated to ${status}`);
      await loadRefunds();
      setShowRefundDialog(false);
    } catch (error) {
      console.error('Error updating refund status:', error);
      toast.error('Failed to update refund status');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (date: Date | string | { toDate?: () => Date } | undefined) => {
    if (!date) return 'N/A';
    try {
      if (typeof date === 'object' && 'toDate' in date && typeof date.toDate === 'function') {
        return format(date.toDate(), 'MMM dd, yyyy HH:mm');
      }
      const dateObj: Date = typeof date === 'string' ? new Date(date) : (date as Date);
      if (isNaN(dateObj.getTime())) return 'N/A';
      return format(dateObj, 'MMM dd, yyyy HH:mm');
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'N/A';
    }
  };

  const exportToCSV = () => {
    const headers = ['Refund ID', 'Booking ID', 'Guest ID', 'Amount', 'Status', 'Initiated At', 'Completed At'];
    const rows = filteredRefunds.map(refund => [
      refund.id,
      refund.bookingId,
      refund.guestId,
      refund.amount,
      refund.status,
      formatDate(refund.initiatedAt),
      refund.completedAt ? formatDate(refund.completedAt) : 'N/A'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `refunds-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success('Refunds exported to CSV');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge className="bg-green-500/10 text-green-400 border-green-500/20">
            <CheckCircle className="w-3 h-3 mr-1" />
            Completed
          </Badge>
        );
      case 'processing':
        return (
          <Badge className="bg-sky-500/10 text-sky-400 border-sky-500/20">
            <RefreshCw className="w-3 h-3 mr-1" />
            Processing
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-primary/10 text-primary border-primary/20">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getRefundStats = () => {
    const total = refunds.length;
    const pending = refunds.filter(r => r.status === 'pending').length;
    const processing = refunds.filter(r => r.status === 'processing').length;
    const completed = refunds.filter(r => r.status === 'completed').length;
    const failed = refunds.filter(r => r.status === 'failed').length;
    const totalAmount = refunds.reduce((sum, r) => sum + r.amount, 0);

    return { total, pending, processing, completed, failed, totalAmount };
  };

  const stats = getRefundStats();

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
          <h2 className="text-3xl font-bold font-display text-foreground">Refund Management</h2>
          <p className="text-muted-foreground mt-1">{filteredRefunds.length} refunds found</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={loadRefunds}
            variant="outline"
            className="border-border hover:bg-muted"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button
            onClick={exportToCSV}
            variant="outline"
            className="border-border hover:bg-muted"
            disabled={filteredRefunds.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="modern-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-500/10 rounded-lg">
              <DollarSign className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Refunds</p>
              <p className="text-2xl font-bold text-foreground">{stats.total}</p>
            </div>
          </div>
        </Card>

        <Card className="modern-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Clock className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold text-foreground">{stats.pending}</p>
            </div>
          </div>
        </Card>

        <Card className="modern-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-500/10 rounded-lg">
              <RefreshCw className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Processing</p>
              <p className="text-2xl font-bold text-foreground">{stats.processing}</p>
            </div>
          </div>
        </Card>

        <Card className="modern-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="text-2xl font-bold text-foreground">{stats.completed}</p>
            </div>
          </div>
        </Card>

        <Card className="modern-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <XCircle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Failed</p>
              <p className="text-2xl font-bold text-foreground">{stats.failed}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="modern-card p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by refund ID, booking ID, or guest ID..."
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
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Refunds Table */}
      <Card className="modern-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 border-border">
                <TableHead className="font-bold text-foreground">Refund ID</TableHead>
                <TableHead className="font-bold text-foreground">Booking ID</TableHead>
                <TableHead className="font-bold text-foreground">Guest ID</TableHead>
                <TableHead className="font-bold text-foreground">Amount</TableHead>
                <TableHead className="font-bold text-foreground">Status</TableHead>
                <TableHead className="font-bold text-foreground">Initiated</TableHead>
                <TableHead className="font-bold text-foreground text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRefunds.map((refund) => (
                <TableRow key={refund.id} className="border-border hover:bg-muted/40">
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {refund.id.substring(0, 8)}...
                  </TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {refund.bookingId.substring(0, 8)}...
                  </TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {refund.guestId.substring(0, 8)}...
                  </TableCell>
                  <TableCell className="font-semibold text-primary">
                    {refund.amount.toFixed(2)} BD
                  </TableCell>
                  <TableCell>{getStatusBadge(refund.status)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(refund.initiatedAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedRefund(refund);
                          setAdminNotes(refund.adminNotes || '');
                          setShowRefundDialog(true);
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

        {filteredRefunds.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No refunds found matching your filters</p>
          </div>
        )}
      </Card>

      {/* Refund Details Dialog */}
      <Dialog open={showRefundDialog} onOpenChange={setShowRefundDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Refund Details</DialogTitle>
          </DialogHeader>

          {selectedRefund && (
            <div className="space-y-6">
              {/* Refund ID & Status */}
              <div>
                <p className="text-sm text-muted-foreground">Refund ID</p>
                <p className="font-mono text-sm text-foreground">{selectedRefund.id}</p>
                <div className="mt-2">
                  {getStatusBadge(selectedRefund.status)}
                </div>
              </div>

              {/* IDs */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Booking ID</p>
                  <p className="font-mono text-sm text-foreground">{selectedRefund.bookingId}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Guest ID</p>
                  <p className="font-mono text-sm text-foreground">{selectedRefund.guestId}</p>
                </div>
              </div>

              {/* Amount */}
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-1">Refund Amount</p>
                <p className="text-3xl font-bold text-green-400">
                  {selectedRefund.amount.toFixed(2)} BD
                </p>
              </div>

              {/* Timestamps */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Initiated At</p>
                  <p className="font-semibold text-foreground">
                    {formatDate(selectedRefund.initiatedAt)}
                  </p>
                </div>
                {selectedRefund.completedAt && (
                  <div>
                    <p className="text-sm text-muted-foreground">Completed At</p>
                    <p className="font-semibold text-foreground">
                      {formatDate(selectedRefund.completedAt)}
                    </p>
                  </div>
                )}
              </div>

              {/* Failure Reason */}
              {selectedRefund.failureReason && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
                    <div>
                      <p className="font-semibold text-foreground mb-1">Failure Reason</p>
                      <p className="text-sm text-muted-foreground">{selectedRefund.failureReason}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Admin Notes */}
              <div className="space-y-2">
                <Label htmlFor="admin-notes" className="text-foreground font-semibold">
                  Admin Notes
                </Label>
                <Textarea
                  id="admin-notes"
                  placeholder="Add notes about this refund..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
              </div>

              {/* Status Actions */}
              <div className="border-t border-border pt-4">
                <p className="text-sm text-muted-foreground mb-3 font-semibold">Update Status</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleUpdateStatus(selectedRefund.id, 'processing', adminNotes)}
                    disabled={actionLoading || selectedRefund.status === 'processing'}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Set Processing
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleUpdateStatus(selectedRefund.id, 'completed', adminNotes)}
                    disabled={actionLoading || selectedRefund.status === 'completed'}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Mark Completed
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleUpdateStatus(selectedRefund.id, 'pending', adminNotes)}
                    disabled={actionLoading || selectedRefund.status === 'pending'}
                    className="border-border text-primary hover:bg-muted"
                  >
                    <Clock className="w-4 h-4 mr-1" />
                    Set Pending
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleUpdateStatus(selectedRefund.id, 'failed', adminNotes)}
                    disabled={actionLoading || selectedRefund.status === 'failed'}
                    className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Mark Failed
                  </Button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRefundDialog(false)}
              className="border-border"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}