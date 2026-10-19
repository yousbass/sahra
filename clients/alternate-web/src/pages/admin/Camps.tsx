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
  Trash2, 
  CheckCircle, 
  XCircle,
  ExternalLink,
  Loader2,
  MapPin,
  Users,
  Star
} from 'lucide-react';
import { getAllCamps, updateCamp, updateCampStatus, Camp } from '@/lib/firestore';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function AdminCamps() {
  const [camps, setCamps] = useState<Camp[]>([]);
  const [filteredCamps, setFilteredCamps] = useState<Camp[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [pinFilter, setPinFilter] = useState<string>('all');
  const [selectedCamp, setSelectedCamp] = useState<Camp | null>(null);
  const [showCampDialog, setShowCampDialog] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [editLat, setEditLat] = useState('');
  const [editLng, setEditLng] = useState('');
  const [savingCoords, setSavingCoords] = useState(false);

  useEffect(() => {
    loadCamps();
  }, []);

  useEffect(() => {
    filterCamps();
  }, [camps, searchTerm, statusFilter, pinFilter]);

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

    // Map pin filter
    if (pinFilter === 'missing') {
      filtered = filtered.filter(camp => !camp.coordinates);
    }

    setFilteredCamps(filtered);
  };

  const handleUpdateStatus = async (campId: string, newStatus: 'active' | 'pending' | 'inactive') => {
    try {
      setActionLoading(true);
      if (newStatus === 'inactive') {
        // updateCampStatus only accepts 'active' | 'pending' | 'rejected';
        // write the 'inactive' status directly via updateCamp
        await updateCamp(campId, { status: 'inactive' });
      } else {
        await updateCampStatus(campId, newStatus);
      }
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

  const handleSaveCoordinates = async () => {
    if (!selectedCamp) return;
    const lat = parseFloat(editLat);
    const lng = parseFloat(editLng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      toast.error('Please enter valid decimal coordinates (e.g. 26.0667, 50.5577)');
      return;
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      toast.error('Latitude must be −90 to 90 and longitude −180 to 180');
      return;
    }
    try {
      setSavingCoords(true);
      await updateCamp(selectedCamp.id, { coordinates: { lat, lng } });
      toast.success('Coordinates saved — camp will now appear on the map');
      setSelectedCamp({ ...selectedCamp, coordinates: { lat, lng } });
      await loadCamps();
    } catch (error) {
      console.error('Error saving coordinates:', error);
      toast.error('Failed to save coordinates');
    } finally {
      setSavingCoords(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge className="bg-green-500/10 text-green-400 border-green-500/20">
            <CheckCircle className="w-3 h-3 mr-1" />
            Active
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-primary/10 text-primary border-primary/20">
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
      const dateObj: Date = typeof date === 'string' ? new Date(date) : (date as Date);
      if (isNaN(dateObj.getTime())) return 'N/A';
      return format(dateObj, 'MMM dd, yyyy');
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'N/A';
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
          <h2 className="text-3xl font-display font-bold text-foreground">Camp Management</h2>
          <p className="text-muted-foreground mt-1">
            {filteredCamps.length} camps found
            {camps.filter(c => !c.coordinates).length > 0 && (
              <span className="text-primary">
                {' · '}{camps.filter(c => !c.coordinates).length} camp{camps.filter(c => !c.coordinates).length === 1 ? '' : 's'} not yet on the map
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card className="modern-card p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by title, location, or host..."
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
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>

          <Select value={pinFilter} onValueChange={setPinFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by map pin" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Map Pins</SelectItem>
              <SelectItem value="missing">Missing coordinates</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Camps Table */}
      <Card className="modern-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary border-border">
                <TableHead className="font-bold text-foreground">Camp</TableHead>
                <TableHead className="font-bold text-foreground">Host</TableHead>
                <TableHead className="font-bold text-foreground">Location</TableHead>
                <TableHead className="font-bold text-foreground">Price</TableHead>
                <TableHead className="font-bold text-foreground">Capacity</TableHead>
                <TableHead className="font-bold text-foreground">Rating</TableHead>
                <TableHead className="font-bold text-foreground">Status</TableHead>
                <TableHead className="font-bold text-foreground">Created</TableHead>
                <TableHead className="font-bold text-foreground text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCamps.map((camp) => (
                <TableRow key={camp.id} className="border-border hover:bg-secondary">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <img
                        src={camp.images?.[0] || 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800'}
                        alt={camp.title}
                        className="w-16 h-16 object-cover rounded-lg"
                        onError={(e) => {
                          e.currentTarget.src = 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800';
                        }}
                      />
                      <div>
                        <p className="font-semibold text-foreground max-w-[200px] truncate">
                          {camp.title}
                        </p>
                        <p className="text-sm text-muted-foreground">ID: {camp.id.substring(0, 8)}...</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-foreground">
                    {camp.hostName || 'Unknown Host'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      {camp.location}
                    </div>
                    {!camp.coordinates && (
                      <Badge variant="outline" className="mt-1 text-xs text-primary border-primary/40">
                        No pin
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="font-semibold text-primary">
                    {camp.pricePerNight} BD
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Users className="w-4 h-4" />
                      {camp.maxGuests}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-primary text-primary" />
                      <span className="font-semibold text-foreground">
                        {camp.rating?.toFixed(1) || 'N/A'}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        ({camp.reviewCount || 0})
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(camp.status || 'pending')}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(camp.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedCamp(camp);
                          setEditLat(camp.coordinates?.lat?.toString() ?? '');
                          setEditLng(camp.coordinates?.lng?.toString() ?? '');
                          setShowCampDialog(true);
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

        {filteredCamps.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No camps found matching your filters</p>
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
                  src={selectedCamp.images?.[0] || 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800'}
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
                    <h3 className="text-2xl font-bold text-foreground">{selectedCamp.title}</h3>
                    <p className="text-muted-foreground mt-1">{selectedCamp.location}</p>
                  </div>
                  {getStatusBadge(selectedCamp.status || 'pending')}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div>
                    <p className="text-sm text-muted-foreground">Price</p>
                    <p className="text-xl font-bold text-primary">{selectedCamp.pricePerNight} BD</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Capacity</p>
                    <p className="text-xl font-bold text-foreground">{selectedCamp.maxGuests}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Rating</p>
                    <div className="flex items-center gap-1">
                      <Star className="w-5 h-5 fill-primary text-primary" />
                      <span className="text-xl font-bold text-foreground">
                        {selectedCamp.rating?.toFixed(1) || 'N/A'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Reviews</p>
                    <p className="text-xl font-bold text-foreground">{selectedCamp.reviewCount || 0}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Description</p>
                    <p className="text-foreground">{selectedCamp.description}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Host</p>
                      <p className="font-semibold text-foreground">{selectedCamp.hostName || 'Unknown'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Created At</p>
                      <p className="font-semibold text-foreground">{formatDate(selectedCamp.createdAt)}</p>
                    </div>
                  </div>

                  {selectedCamp.amenities && selectedCamp.amenities.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Amenities</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedCamp.amenities.map((amenity, index) => (
                          <Badge key={index} variant="secondary" className="bg-secondary text-secondary-foreground">
                            {amenity}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Coordinates */}
              <div className="border border-border rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <MapPin className="w-4 h-4 text-primary" />
                  <p className="font-semibold text-foreground">Map Coordinates</p>
                  {selectedCamp.coordinates ? (
                    <Badge className="bg-green-500/10 text-green-400 border-green-500/20 text-xs">
                      On map
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs text-muted-foreground">
                      Not on map yet
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Enter decimal coordinates (latitude, longitude). Find them on Google Maps by right-clicking a location. Hosts can also set these themselves via Edit Listing.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-foreground mb-1 block">Latitude</label>
                    <Input
                      placeholder="e.g. 26.0667"
                      value={editLat}
                      onChange={(e) => setEditLat(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-foreground mb-1 block">Longitude</label>
                    <Input
                      placeholder="e.g. 50.5577"
                      value={editLng}
                      onChange={(e) => setEditLng(e.target.value)}
                    />
                  </div>
                </div>
                <Button
                  onClick={handleSaveCoordinates}
                  disabled={savingCoords || !editLat || !editLng}
                  size="sm"
                  className="bg-primary hover:bg-primary/90 text-white"
                >
                  {savingCoords ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <MapPin className="w-4 h-4 mr-2" />
                  )}
                  Save Coordinates
                </Button>
              </div>

              {/* Actions */}
              <DialogFooter className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => window.open(`/camp/${selectedCamp.id}`, '_blank')}
                  className="border-2 border-border hover:bg-secondary"
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
                    className="border-2 border-border hover:bg-secondary"
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