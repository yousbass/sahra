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
  Edit, 
  Ban, 
  Trash2, 
  Loader2,
  UserCheck,
  UserX,
  Download
} from 'lucide-react';
import { getAllUsers, updateUserStatus, toggleUserHostStatus, deleteUser, UserProfile } from '@/lib/firestore';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function AdminUsers() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, roleFilter, statusFilter]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      console.log('Loading users...');
      const data = await getAllUsers();
      console.log('Users loaded:', data.length);
      setUsers(data);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = [...users];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(user =>
        (user.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.displayName || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Role filter
    if (roleFilter !== 'all') {
      if (roleFilter === 'admin') {
        filtered = filtered.filter(user => user.isAdmin);
      } else if (roleFilter === 'host') {
        filtered = filtered.filter(user => user.isHost && !user.isAdmin);
      } else if (roleFilter === 'user') {
        filtered = filtered.filter(user => !user.isHost && !user.isAdmin);
      }
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(user => user.status === statusFilter);
    }

    setFilteredUsers(filtered);
  };

  const getUserLabel = (user: UserProfile) => user.displayName || user.email || 'Unknown User';
  const getUserInitial = (user: UserProfile) => {
    const label = getUserLabel(user).trim();
    return label ? label.charAt(0).toUpperCase() : '?';
  };

  const handleSuspendUser = async (userId: string, currentStatus: string) => {
    try {
      setActionLoading(true);
      const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
      await updateUserStatus(userId, newStatus);
      toast.success(`User ${newStatus === 'suspended' ? 'suspended' : 'activated'} successfully`);
      await loadUsers();
    } catch (error) {
      console.error('Error updating user status:', error);
      toast.error('Failed to update user status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleHost = async (userId: string, currentIsHost: boolean) => {
    try {
      setActionLoading(true);
      await toggleUserHostStatus(userId, !currentIsHost);
      toast.success(`User ${!currentIsHost ? 'promoted to' : 'removed from'} host successfully`);
      await loadUsers();
    } catch (error) {
      console.error('Error toggling host status:', error);
      toast.error('Failed to update host status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (!confirm(`Are you sure you want to delete user ${userEmail}? This action cannot be undone.`)) {
      return;
    }

    try {
      setActionLoading(true);
      await deleteUser(userId);
      toast.success('User deleted successfully');
      await loadUsers();
      setShowUserDialog(false);
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
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
    const headers = ['Email', 'Name', 'Phone', 'Role', 'Status', 'Joined Date'];
    const rows = filteredUsers.map(user => [
      user.email,
      user.displayName || '',
      user.phone || '',
      user.isAdmin ? 'Admin' : user.isHost ? 'Host' : 'User',
      user.status || 'active',
      formatDate(user.createdAt)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success('Users exported to CSV');
  };

  const getRoleBadge = (user: UserProfile) => {
    if (user.isAdmin) {
      return <Badge className="bg-red-100 text-red-900 border-red-300">Admin</Badge>;
    }
    if (user.isHost) {
      return <Badge className="bg-blue-100 text-blue-900 border-blue-300">Host</Badge>;
    }
    return <Badge variant="secondary" className="bg-gray-100 text-gray-900 border-gray-300">User</Badge>;
  };

  const getStatusBadge = (status?: string) => {
    if (status === 'suspended') {
      return <Badge variant="destructive">Suspended</Badge>;
    }
    return <Badge className="bg-green-100 text-green-900 border-green-300">Active</Badge>;
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
          <h2 className="text-3xl font-bold text-gray-900">User Management</h2>
          <p className="text-gray-600 mt-1">{filteredUsers.length} users found</p>
        </div>
        <Button
          onClick={exportToCSV}
          variant="outline"
          className="border-2 border-orange-300 hover:bg-orange-50"
          disabled={filteredUsers.length === 0}
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
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 border-orange-300 focus:border-#8B5A3C"
            />
          </div>

          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="border-orange-300 focus:border-#8B5A3C">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="admin">Admins</SelectItem>
              <SelectItem value="host">Hosts</SelectItem>
              <SelectItem value="user">Users</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="border-orange-300 focus:border-#8B5A3C">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Users Table */}
      <Card className="bg-white/95 backdrop-blur-sm border-orange-300 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-orange-50 border-orange-300">
                <TableHead className="font-bold text-gray-900">User</TableHead>
                <TableHead className="font-bold text-gray-900">Email</TableHead>
                <TableHead className="font-bold text-gray-900">Phone</TableHead>
                <TableHead className="font-bold text-gray-900">Role</TableHead>
                <TableHead className="font-bold text-gray-900">Status</TableHead>
                <TableHead className="font-bold text-gray-900">Joined</TableHead>
                <TableHead className="font-bold text-gray-900 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id} className="border-orange-200 hover:bg-orange-50">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-#8B5A3C to-#6B4423 flex items-center justify-center">
                        <span className="text-white font-semibold text-sm">
                          {getUserInitial(user)}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{getUserLabel(user)}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-700">{user.email || 'No email'}</TableCell>
                  <TableCell className="text-gray-700">{user.phone || '-'}</TableCell>
                  <TableCell>{getRoleBadge(user)}</TableCell>
                  <TableCell>{getStatusBadge(user.status)}</TableCell>
                  <TableCell className="text-gray-700">
                    {formatDate(user.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedUser(user);
                          setShowUserDialog(true);
                        }}
                        className="border-orange-300 hover:bg-orange-50"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600">No users found matching your filters</p>
          </div>
        )}
      </Card>

      {/* User Details Dialog */}
      <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-6">
              {/* User Info */}
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-#8B5A3C to-#6B4423 flex items-center justify-center">
                  <span className="text-white font-bold text-xl">
                    {getUserInitial(selectedUser)}
                  </span>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900">{getUserLabel(selectedUser)}</h3>
                  <p className="text-gray-600">{selectedUser.email || 'No email'}</p>
                  <div className="flex gap-2 mt-2">
                    {getRoleBadge(selectedUser)}
                    {getStatusBadge(selectedUser.status)}
                  </div>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="font-semibold text-gray-900">{selectedUser.phone || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Joined Date</p>
                  <p className="font-semibold text-gray-900">
                    {formatDate(selectedUser.createdAt)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Bookings</p>
                  <p className="font-semibold text-gray-900">{selectedUser.totalBookings || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Spent</p>
                  <p className="font-semibold text-gray-900">
                    {selectedUser.totalSpent ? `${selectedUser.totalSpent.toFixed(3)} BD` : '0.000 BD'}
                  </p>
                </div>
              </div>

              {/* Bio */}
              {selectedUser.bio && (
                <div>
                  <p className="text-sm text-gray-600 mb-1">Bio</p>
                  <p className="text-gray-900">{selectedUser.bio}</p>
                </div>
              )}

              {/* Actions */}
              <DialogFooter className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleToggleHost(selectedUser.id, selectedUser.isHost)}
                  disabled={actionLoading || selectedUser.isAdmin}
                  className="border-2 border-orange-300 hover:bg-orange-50"
                >
                  {selectedUser.isHost ? (
                    <>
                      <UserX className="w-4 h-4 mr-2" />
                      Remove Host
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-4 h-4 mr-2" />
                      Make Host
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => handleSuspendUser(selectedUser.id, selectedUser.status || 'active')}
                  disabled={actionLoading || selectedUser.isAdmin}
                  className="border-2 border-orange-300 text-amber-700 hover:bg-orange-50"
                >
                  {selectedUser.status === 'suspended' ? (
                    <>
                      <UserCheck className="w-4 h-4 mr-2" />
                      Activate
                    </>
                  ) : (
                    <>
                      <Ban className="w-4 h-4 mr-2" />
                      Suspend
                    </>
                  )}
                </Button>

                <Button
                  variant="destructive"
                  onClick={() => handleDeleteUser(selectedUser.id, selectedUser.email)}
                  disabled={actionLoading || selectedUser.isAdmin}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
