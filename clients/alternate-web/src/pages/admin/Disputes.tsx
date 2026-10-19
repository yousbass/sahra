import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CampfireLoader } from '@/components/CampfireLoader';
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
import { Textarea } from '@/components/ui/textarea';
import { Search, Eye, CheckCircle, AlertTriangle, RefreshCw, ExternalLink, StickyNote } from 'lucide-react';
import { getDisputes, resolveDispute, type DisputeRecord } from '@/lib/firestore';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function AdminDisputes() {
  const { t } = useTranslation();
  const [disputes, setDisputes] = useState<DisputeRecord[]>([]);
  const [filtered, setFiltered] = useState<DisputeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState<DisputeRecord | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [resolving, setResolving] = useState<string | null>(null);
  const [adminNote, setAdminNote] = useState('');

  useEffect(() => { load(); }, []);
  useEffect(() => { applyFilters(); }, [disputes, searchTerm, statusFilter]);

  const load = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const data = await getDisputes();
      setDisputes(data);
    } catch {
      setLoadError(true);
      toast.error(t('adminDisputes.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let result = [...disputes];
    if (statusFilter !== 'all') {
      result = result.filter(d => d.status === statusFilter);
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(d =>
        d.bookingId.toLowerCase().includes(q) ||
        d.campId.toLowerCase().includes(q) ||
        d.userId.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q)
      );
    }
    setFiltered(result);
  };

  const handleResolve = async (dispute: DisputeRecord) => {
    setResolving(dispute.id);
    try {
      await resolveDispute(dispute.id, adminNote || undefined);
      const note = adminNote.trim() || undefined;
      setDisputes(prev =>
        prev.map(d => d.id === dispute.id ? { ...d, status: 'resolved', resolvedAt: new Date().toISOString(), adminNote: note } : d)
      );
      if (selected?.id === dispute.id) {
        setSelected(prev => prev ? { ...prev, status: 'resolved', resolvedAt: new Date().toISOString(), adminNote: note } : null);
      }
      setAdminNote('');
      toast.success(t('adminDisputes.resolveSuccess'));
    } catch {
      toast.error(t('adminDisputes.resolveError'));
    } finally {
      setResolving(null);
    }
  };

  const typeLabel = (type: string) => t(`adminDisputes.types.${type}`, { defaultValue: type });

  const formatDate = (iso: string | undefined) => {
    if (!iso) return '—';
    try { return format(new Date(iso), 'dd MMM yyyy HH:mm'); } catch { return iso; }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <CampfireLoader />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <AlertTriangle className="w-10 h-10 text-destructive" />
        <p className="text-muted-foreground">{t('adminDisputes.loadError')}</p>
        <Button onClick={load} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />{t('adminDisputes.retry')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('adminDisputes.title')}</h1>
        <p className="text-muted-foreground text-sm mt-1">{t('adminDisputes.subtitle')}</p>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder={t('adminDisputes.search')}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('adminDisputes.filterAll')}</SelectItem>
              <SelectItem value="open">{t('adminDisputes.filterOpen')}</SelectItem>
              <SelectItem value="resolved">{t('adminDisputes.filterResolved')}</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={load} title={t('adminDisputes.retry')}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </Card>

      {/* Table */}
      <Card>
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">{t('adminDisputes.noReports')}</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('adminDisputes.colType')}</TableHead>
                  <TableHead>{t('adminDisputes.colBooking')}</TableHead>
                  <TableHead>{t('adminDisputes.colGuest')}</TableHead>
                  <TableHead>{t('adminDisputes.colDate')}</TableHead>
                  <TableHead>{t('adminDisputes.colStatus')}</TableHead>
                  <TableHead>{t('adminDisputes.colActions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(dispute => (
                  <TableRow key={dispute.id}>
                    <TableCell>
                      <span className="font-medium text-sm">{typeLabel(dispute.type)}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs text-muted-foreground">{dispute.bookingId.slice(0, 8)}…</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs text-muted-foreground">{dispute.userId.slice(0, 8)}…</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">{formatDate(dispute.createdAt)}</span>
                    </TableCell>
                    <TableCell>
                      {dispute.status === 'resolved' ? (
                        <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                          <CheckCircle className="w-3 h-3 mr-1" />{t('adminDisputes.statusResolved')}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200">
                          <AlertTriangle className="w-3 h-3 mr-1" />{t('adminDisputes.statusOpen')}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { setSelected(dispute); setShowDetail(true); }}
                        >
                          <Eye className="w-3 h-3 mr-1" />{t('adminDisputes.viewDetails')}
                        </Button>
                        {dispute.status === 'open' && (
                          <Button
                            size="sm"
                            onClick={() => handleResolve(dispute)}
                            disabled={resolving === dispute.id}
                          >
                            {resolving === dispute.id
                              ? t('adminDisputes.resolving')
                              : t('adminDisputes.resolve')}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Detail Dialog */}
      {selected && (
        <Dialog open={showDetail} onOpenChange={setShowDetail}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{t('adminDisputes.detailTitle')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs mb-1">{t('adminDisputes.colType')}</p>
                  <p className="font-medium">{typeLabel(selected.type)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1">{t('adminDisputes.colStatus')}</p>
                  {selected.status === 'resolved' ? (
                    <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                      <CheckCircle className="w-3 h-3 mr-1" />{t('adminDisputes.statusResolved')}
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200">
                      <AlertTriangle className="w-3 h-3 mr-1" />{t('adminDisputes.statusOpen')}
                    </Badge>
                  )}
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1">{t('adminDisputes.colBooking')}</p>
                  <p className="font-mono text-xs break-all">{selected.bookingId}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1">{t('adminDisputes.colGuest')}</p>
                  <p className="font-mono text-xs break-all">{selected.userId}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1">{t('adminDisputes.colDate')}</p>
                  <p>{formatDate(selected.createdAt)}</p>
                </div>
                {selected.resolvedAt && (
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">{t('adminDisputes.resolvedAt')}</p>
                    <p>{formatDate(selected.resolvedAt)}</p>
                  </div>
                )}
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-1">{t('adminDisputes.colDescription')}</p>
                <p className="text-sm bg-muted rounded p-3 whitespace-pre-wrap">{selected.description}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-1">{t('adminDisputes.photo')}</p>
                {selected.photoUrl ? (
                  <a
                    href={selected.photoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary underline"
                  >
                    {t('adminDisputes.photoLink')}<ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <p className="text-sm text-muted-foreground">{t('adminDisputes.noPhoto')}</p>
                )}
              </div>
            </div>
            {selected.status === 'resolved' && selected.adminNote && (
              <div className="px-6 pb-2">
                <p className="text-muted-foreground text-xs mb-1 flex items-center gap-1">
                  <StickyNote className="w-3 h-3" />{t('adminDisputes.adminNoteLabel')}
                </p>
                <p className="text-sm bg-muted rounded p-3 whitespace-pre-wrap">{selected.adminNote}</p>
              </div>
            )}
            {selected.status === 'open' && (
              <div className="px-6 pb-2 space-y-1">
                <label className="text-xs text-muted-foreground flex items-center gap-1">
                  <StickyNote className="w-3 h-3" />{t('adminDisputes.adminNote')}
                </label>
                <Textarea
                  value={adminNote}
                  onChange={e => setAdminNote(e.target.value)}
                  placeholder={t('adminDisputes.adminNotePlaceholder')}
                  rows={3}
                  maxLength={1000}
                  className="resize-none text-sm"
                />
              </div>
            )}
            <DialogFooter className="flex gap-2">
              {selected.status === 'open' && (
                <Button
                  onClick={() => handleResolve(selected)}
                  disabled={resolving === selected.id}
                >
                  {resolving === selected.id ? t('adminDisputes.resolving') : t('adminDisputes.resolve')}
                </Button>
              )}
              <Button variant="outline" onClick={() => setShowDetail(false)}>
                {t('adminDisputes.close')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
