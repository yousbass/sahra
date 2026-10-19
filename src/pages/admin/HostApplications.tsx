import { CampfireLoader } from '@/components/CampfireLoader';
import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { Loader2, UserCheck, UserX } from 'lucide-react';
import {
  HostApplication,
  getAllHostApplications,
  approveHostApplication,
  rejectHostApplication,
} from '@/lib/hostApplication';
import { toggleUserHostStatus } from '@/lib/firestore';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';

export default function AdminHostApplications() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<HostApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<HostApplication | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      setLoading(true);
      const data = await getAllHostApplications();
      // Newest first
      data.sort((a, b) => toDate(b.submittedAt).getTime() - toDate(a.submittedAt).getTime());
      setApplications(data);
    } catch (error) {
      console.error('Error loading host applications:', error);
      toast.error('Failed to load host applications');
    } finally {
      setLoading(false);
    }
  };

  const toDate = (value: string | Timestamp | undefined): Date => {
    if (!value) return new Date(0);
    if (value instanceof Timestamp) return value.toDate();
    const d = new Date(value);
    return isNaN(d.getTime()) ? new Date(0) : d;
  };

  const formatDate = (value: string | Timestamp | undefined) => {
    const d = toDate(value);
    return d.getTime() === 0 ? 'N/A' : format(d, 'MMM dd, yyyy');
  };

  /** Fire-and-forget push notification via the API server. Never throws. */
  const sendDecisionPush = async (
    applicationId: string,
    decision: 'approved' | 'rejected',
    reason?: string,
  ) => {
    try {
      const idToken = await user!.getIdToken();
      await fetch('/api/notifications/host-application-decision', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ applicationId, decision, rejectionReason: reason }),
      });
    } catch (err) {
      console.warn('[HostApplications] push notification failed (non-critical):', err);
    }
  };

  const handleApprove = async (application: HostApplication) => {
    if (!user) return;
    try {
      setActionLoading(true);
      await approveHostApplication(application.id, user.uid);
      await toggleUserHostStatus(application.userId, true);
      toast.success(`${application.userName} is now a host`);
      await loadApplications();
      sendDecisionPush(application.id, 'approved');
    } catch (error) {
      console.error('Error approving application:', error);
      toast.error('Failed to approve application');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!user || !rejectTarget) return;
    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    try {
      setActionLoading(true);
      const reason = rejectionReason.trim();
      await rejectHostApplication(rejectTarget.id, user.uid, reason);
      toast.success('Application rejected');
      const rejectedId = rejectTarget.id;
      setRejectTarget(null);
      setRejectionReason('');
      await loadApplications();
      sendDecisionPush(rejectedId, 'rejected', reason);
    } catch (error) {
      console.error('Error rejecting application:', error);
      toast.error('Failed to reject application');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: HostApplication['status']) => {
    if (status === 'approved') {
      return <Badge className="bg-green-100 text-green-900 border-green-300">Approved</Badge>;
    }
    if (status === 'rejected') {
      return <Badge variant="destructive">Rejected</Badge>;
    }
    return <Badge className="bg-yellow-100 text-yellow-900 border-yellow-300">Pending</Badge>;
  };

  const filtered = statusFilter === 'all'
    ? applications
    : applications.filter(app => app.status === statusFilter);

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
          <h2 className="text-3xl font-bold text-gray-900">Host Applications</h2>
          <p className="text-gray-600 mt-1">{filtered.length} applications found</p>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44 border-border/80">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Applications Table */}
      <Card className="bg-white/95 backdrop-blur-sm border-border/80 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/50 border-border/80">
                <TableHead className="font-bold text-gray-900">Name</TableHead>
                <TableHead className="font-bold text-gray-900">Email</TableHead>
                <TableHead className="font-bold text-gray-900">Phone</TableHead>
                <TableHead className="font-bold text-gray-900">CPR</TableHead>
                <TableHead className="font-bold text-gray-900">Submitted</TableHead>
                <TableHead className="font-bold text-gray-900">Status</TableHead>
                <TableHead className="font-bold text-gray-900 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((app) => (
                <TableRow key={app.id} className="border-border hover:bg-secondary/50">
                  <TableCell className="font-semibold text-gray-900">{app.userName || 'Unknown'}</TableCell>
                  <TableCell className="text-gray-700">{app.userEmail || '-'}</TableCell>
                  <TableCell className="text-gray-700">{app.phoneNumber || '-'}</TableCell>
                  <TableCell className="text-gray-700">{app.cprNumber || '-'}</TableCell>
                  <TableCell className="text-gray-700">{formatDate(app.submittedAt)}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {getStatusBadge(app.status)}
                      {app.status === 'rejected' && app.rejectionReason && (
                        <p className="text-xs text-gray-500 max-w-48 truncate" title={app.rejectionReason}>
                          {app.rejectionReason}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {app.status === 'pending' && (
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleApprove(app)}
                          disabled={actionLoading}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <UserCheck className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setRejectTarget(app);
                            setRejectionReason('');
                          }}
                          disabled={actionLoading}
                        >
                          <UserX className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600">No {statusFilter !== 'all' ? statusFilter : ''} applications found</p>
          </div>
        )}
      </Card>

      {/* Reject Dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={(open) => { if (!open) setRejectTarget(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Application</DialogTitle>
          </DialogHeader>
          {rejectTarget && (
            <div className="space-y-4">
              <p className="text-gray-700">
                Rejecting the host application from{' '}
                <span className="font-semibold">{rejectTarget.userName}</span>.
              </p>
              <Textarea
                placeholder="Reason for rejection (shown to the applicant)"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
              />
              <DialogFooter className="flex gap-2">
                <Button variant="outline" onClick={() => setRejectTarget(null)} disabled={actionLoading}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleReject} disabled={actionLoading}>
                  {actionLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserX className="w-4 h-4 mr-2" />}
                  Reject Application
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
