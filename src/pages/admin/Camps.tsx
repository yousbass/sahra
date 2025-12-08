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
  Trash2, 
  CheckCircle, 
  XCircle, 
  Loader2,
  ExternalLink,
  MapPin,
  Users,
  Star
} from 'lucide-react';
import { getAllCamps, updateCampStatus, Camp } from '@/lib/firestore';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function AdminCamps() {
  const [camps, setCamps] = useState<Camp[]>([]);
  const [filteredCamps, setFilteredCamps] = useState<Camp[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedCamp, setSelectedCamp] = useState<Camp | null>(null);
  const [showCampDialog, setShowCampDialog] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadCamps();
  }, []);

  useEffect(() => {
    filterCamps();
  }, [camps, searchTerm, statusFilter]);

  const loadCamps = async () => {
    try {
      setLoading(true);
      const data = await getAllCamps();
      setCamps(data);
    } catch (error) {
      console.error('Error loading camps:', error);
      toast.error('Failed to load camps');
    } finally {
      setLoading(false);
    }
  };

  const filterCamps = () => {
    let filtered = [...camps];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(camp =>
        camp.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        camp.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        camp.hostName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(camp => camp.status === statusFilter);
    }

    setFilteredCamps(filtered);
  };

  const handleUpdateStatus = async (campId: string, newStatus: 'active' | 'pending' | 'inactive') => {
    try {
      setActionLoading(true);
      await updateCampStatus(campId, newStatus);
      toast.success(`Camp status updated to ${newStatus}`);
      await loadCamps();
      setShowCampDialog(false);
    } catch (error) {
      console.error('Error updating camp status:', error);
      toast.error('Failed to update camp status');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge className="bg-green-100 text-green-900 border-green-300">
            <CheckCircle className="w-3 h-3 mr-1" />
            Active
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-yellow-100 text-yellow-900 border-yellow-300">
            Pending
          </Badge>
        );
      case 'inactive':
        return (
          <Badge variant="secondary">
            <XCircle className="w-3 h-3 mr-1" />
            Inactive
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (date: Date | string | { toDate?: () => Date } | undefined) => {
    if (!date) return 'N/A';
    try {
      // Handle Firestore Timestamp
      if (typeof date === 'object' && 'toDate' in date && typeof date.toDate === 'function') {
        return format(date.toDate(), 'MMM dd, yyyy');
      }
      // Handle string or Date object
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      if (dateObj instanceof Date && isNaN(dateObj.getTime())) return 'N/A';
      return format(dateObj, 'MMM dd, yyyy');
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'N/A';
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
          <h2 className="text-3xl font-bold text-gray-900">Camp Management</h2>
          <p className="text-gray-600 mt-1">{filteredCamps.length} camps found</p>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-white/95 backdrop-blur-sm border-orange-300 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by title, location, or host..."
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
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Camps Table */}
      <Card className="bg-white/95 backdrop-blur-sm border-orange-300 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-orange-50 border-orange-300">
                <TableHead className="font-bold text-gray-900">Camp</TableHead>
                <TableHead className="font-bold text-gray-900">Host</TableHead>
                <TableHead className="font-bold text-gray-900">Location</TableHead>
                <TableHead className="font-bold text-gray-900">Price</TableHead>
                <TableHead className="font-bold text-gray-900">Capacity</TableHead>
                <TableHead className="font-bold text-gray-900">Rating</TableHead>
                <TableHead className="font-bold text-gray-900">Status</TableHead>
                <TableHead className="font-bold text-gray-900">Created</TableHead>
                <TableHead className="font-bold text-gray-900 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCamps.map((camp) => (
                <TableRow key={camp.id} className="border-orange-200 hover:bg-orange-50">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <img
                        src={camp.photo}
                        alt={camp.title}
                        className="w-16 h-16 object-cover rounded-lg"
                        onError={(e) => {
                          e.currentTarget.src = 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800';
                        }}
                      />
                      <div>
                        <p className="font-semibold text-gray-900 max-w-[200px] truncate">
                          {camp.title}
                        </p>
                        <p className="text-sm text-gray-600">ID: {camp.id.substring(0, 8)}...</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-900">
                    {camp.hostName || 'Unknown Host'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-gray-700">
                      <MapPin className="w-4 h-4" />
                      {camp.location}
                    </div>
                  </TableCell>
                  <TableCell className="font-semibold text-#6B4423">
                    {camp.price} BD
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-gray-700">
                      <Users className="w-4 h-4" />
                      {camp.capacity}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-semibold text-gray-900">
                        {camp.averageRating?.toFixed(1) || 'N/A'}
                      </span>
                      <span className="text-sm text-gray-600">
                        ({camp.reviewCount || 0})
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(camp.status || 'pending')}</TableCell>
                  <TableCell className="text-gray-700">
                    {formatDate(camp.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedCamp(camp);
                          setShowCampDialog(true);
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

        {filteredCamps.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600">No camps found matching your filters</p>
          </div>
        )}
      </Card>

      {/* Camp Details Dialog */}
      <Dialog open={showCampDialog} onOpenChange={setShowCampDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Camp Details</DialogTitle>
          </DialogHeader>

          {selectedCamp && (
            <div className="space-y-6">
              {/* Camp Image */}
              <div className="w-full h-64 rounded-lg overflow-hidden">
                <img
                  src={selectedCamp.photo}
                  alt={selectedCamp.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800';
                  }}
                />
              </div>

              {/* Camp Info */}
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">{selectedCamp.title}</h3>
                    <p className="text-gray-600 mt-1">{selectedCamp.location}</p>
                  </div>
                  {getStatusBadge(selectedCamp.status || 'pending')}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div>
                    <p className="text-sm text-gray-600">Price</p>
                    <p className="text-xl font-bold text-#6B4423">{selectedCamp.price} BD</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Capacity</p>
                    <p className="text-xl font-bold text-gray-900">{selectedCamp.capacity}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Rating</p>
                    <div className="flex items-center gap-1">
                      <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                      <span className="text-xl font-bold text-gray-900">
                        {selectedCamp.averageRating?.toFixed(1) || 'N/A'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Reviews</p>
                    <p className="text-xl font-bold text-gray-900">{selectedCamp.reviewCount || 0}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Description</p>
                    <p className="text-gray-900">{selectedCamp.description}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Host</p>
                      <p className="font-semibold text-gray-900">{selectedCamp.hostName || 'Unknown'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Created At</p>
                      <p className="font-semibold text-gray-900">{formatDate(selectedCamp.createdAt)}</p>
                    </div>
                  </div>

                  {selectedCamp.amenities && selectedCamp.amenities.length > 0 && (
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Amenities</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedCamp.amenities.map((amenity, index) => (
                          <Badge key={index} variant="secondary" className="bg-orange-100 text-sand-900">
                            {amenity}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <DialogFooter className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => window.open(`/camp/${selectedCamp.id}`, '_blank')}
                  className="border-2 border-orange-300 hover:bg-orange-50"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View Public Page
                </Button>

                {selectedCamp.status !== 'active' && (
                  <Button
                    onClick={() => handleUpdateStatus(selectedCamp.id, 'active')}
                    disabled={actionLoading}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Activate
                  </Button>
                )}

                {selectedCamp.status !== 'inactive' && (
                  <Button
                    onClick={() => handleUpdateStatus(selectedCamp.id, 'inactive')}
                    disabled={actionLoading}
                    variant="outline"
                    className="border-2 border-gray-300 hover:bg-gray-50"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Deactivate
                  </Button>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}