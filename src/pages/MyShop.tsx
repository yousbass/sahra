import { CampfireLoader } from '@/components/CampfireLoader';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  Store,
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  ImagePlus,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { PatternSadu } from '@/components/BackgroundPatterns';
import {
  SellerMarketItem,
  createMarketItem,
  updateMarketItem,
  deleteMarketItem,
  getMarketItemsBySeller,
} from '@/lib/marketItems';
import { getSellerApplicationByUserId } from '@/lib/sellerApplication';
import { uploadImage, deleteImage, validateImageFile } from '@/lib/imageUpload';
import type { MarketCategory } from '@/lib/marketplace';

const CATEGORY_OPTIONS: { key: MarketCategory; tKey: string; fallback: string }[] = [
  { key: 'food', tKey: 'home.serviceCampFood', fallback: 'Camp Food' },
  { key: 'firewood', tKey: 'home.serviceFirewood', fallback: 'Firewood' },
  { key: 'gear', tKey: 'home.serviceGear', fallback: 'Camping Gear' },
];

interface ItemForm {
  nameEn: string;
  nameAr: string;
  descEn: string;
  descAr: string;
  category: MarketCategory;
  price: string;
  unitEn: string;
  unitAr: string;
}

const EMPTY_FORM: ItemForm = {
  nameEn: '',
  nameAr: '',
  descEn: '',
  descAr: '',
  category: 'food',
  price: '',
  unitEn: '',
  unitAr: '',
};

export default function MyShop() {
  const navigate = useNavigate();
  const { user, userData, loading: authLoading } = useAuth();
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [items, setItems] = useState<SellerMarketItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [businessNameEn, setBusinessNameEn] = useState('');
  const [businessNameAr, setBusinessNameAr] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SellerMarketItem | null>(null);
  const [form, setForm] = useState<ItemForm>(EMPTY_FORM);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<SellerMarketItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      toast.error(t('messages.signInRequired') || 'Please sign in to continue');
      navigate('/signin');
      return;
    }
    if (!authLoading && user && userData && !userData.isSeller) {
      toast.info(
        t('myShop.notSellerYet') || 'Apply as a seller to open your shop'
      );
      navigate('/become-seller');
      return;
    }
    if (user && userData?.isSeller) {
      loadShop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, userData, authLoading]);

  const loadShop = async () => {
    if (!user) return;
    try {
      setLoadingItems(true);
      const [ownItems, application] = await Promise.all([
        getMarketItemsBySeller(user.uid),
        getSellerApplicationByUserId(user.uid).catch(() => null),
      ]);
      setItems(ownItems);
      setBusinessNameEn(
        application?.businessNameEn || userData?.displayName || 'My Shop'
      );
      setBusinessNameAr(
        application?.businessNameAr || application?.businessNameEn || 'متجري'
      );
    } catch (error) {
      console.error('Error loading shop:', error);
      toast.error(t('myShop.loadError') || 'Could not load your shop');
    } finally {
      setLoadingItems(false);
    }
  };

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setImageFile(null);
    setImagePreview(null);
    setDialogOpen(true);
  };

  const openEdit = (item: SellerMarketItem) => {
    setEditing(item);
    setForm({
      nameEn: item.nameEn,
      nameAr: item.nameAr,
      descEn: item.descEn,
      descAr: item.descAr,
      category: item.category,
      price: String(item.price),
      unitEn: item.unitEn,
      unitAr: item.unitAr,
    });
    setImageFile(null);
    setImagePreview(item.image);
    setDialogOpen(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const check = validateImageFile(file);
    if (!check.valid) {
      toast.error(check.error || 'Invalid image');
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const setField = (key: keyof ItemForm, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!user) return;

    const price = parseFloat(form.price);
    if (!form.nameEn.trim() || !form.nameAr.trim()) {
      toast.error(t('myShop.nameRequired') || 'Enter the item name in English and Arabic');
      return;
    }
    if (!isFinite(price) || price <= 0) {
      toast.error(t('myShop.priceRequired') || 'Enter a valid price in BD');
      return;
    }
    if (!form.unitEn.trim() || !form.unitAr.trim()) {
      toast.error(t('myShop.unitRequired') || 'Enter the unit, e.g. "per tray"');
      return;
    }
    if (!editing && !imageFile) {
      toast.error(t('myShop.photoRequired') || 'Add a photo of the item');
      return;
    }

    setSaving(true);
    try {
      let imageUrl = editing?.image || '';
      if (imageFile) {
        imageUrl = await uploadImage(imageFile, user.uid);
      }

      if (editing) {
        await updateMarketItem(editing.id, {
          nameEn: form.nameEn.trim(),
          nameAr: form.nameAr.trim(),
          descEn: form.descEn.trim(),
          descAr: form.descAr.trim(),
          category: form.category,
          price,
          unitEn: form.unitEn.trim(),
          unitAr: form.unitAr.trim(),
          image: imageUrl,
        });
        // Best-effort cleanup of the replaced photo
        if (imageFile && editing.image && editing.image !== imageUrl) {
          deleteImage(editing.image).catch(() => undefined);
        }
        toast.success(t('myShop.itemUpdated') || 'Item updated');
      } else {
        await createMarketItem({
          sellerId: user.uid,
          sellerNameEn: businessNameEn,
          sellerNameAr: businessNameAr,
          category: form.category,
          nameEn: form.nameEn.trim(),
          nameAr: form.nameAr.trim(),
          descEn: form.descEn.trim(),
          descAr: form.descAr.trim(),
          price,
          unitEn: form.unitEn.trim(),
          unitAr: form.unitAr.trim(),
          image: imageUrl,
        });
        toast.success(t('myShop.itemAdded') || 'Item added to the marketplace');
      }

      setDialogOpen(false);
      await loadShop();
    } catch (error) {
      console.error('Error saving item:', error);
      const message = error instanceof Error ? error.message : 'Failed to save item';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (item: SellerMarketItem) => {
    try {
      setTogglingId(item.id);
      const next = item.status === 'active' ? 'hidden' : 'active';
      await updateMarketItem(item.id, { status: next });
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: next } : i))
      );
    } catch (error) {
      console.error('Error toggling item:', error);
      toast.error(t('myShop.updateError') || 'Could not update the item');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await deleteMarketItem(deleteTarget.id);
      if (deleteTarget.image) {
        deleteImage(deleteTarget.image).catch(() => undefined);
      }
      setItems((prev) => prev.filter((i) => i.id !== deleteTarget.id));
      toast.success(t('myShop.itemDeleted') || 'Item removed');
      setDeleteTarget(null);
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error(t('myShop.deleteError') || 'Could not remove the item');
    } finally {
      setDeleting(false);
    }
  };

  if (authLoading || (userData?.isSeller && loadingItems)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <CampfireLoader size="md" className="mx-auto my-4" />
      </div>
    );
  }

  if (!userData?.isSeller) {
    // Guard effect will redirect; render nothing in the meantime
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header band */}
      <section className="relative overflow-hidden bg-[#0A1128]">
        <PatternSadu color="#FDFBF7" opacity={0.05} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-8">
          <button
            onClick={() => navigate('/market')}
            className="inline-flex items-center gap-1.5 text-white/70 hover:text-white text-sm font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
            {t('myShop.backToMarket') || 'Marketplace'}
          </button>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white">
                {isAr ? businessNameAr : businessNameEn}
              </h1>
              <p className="mt-2 text-white/70 text-sm sm:text-base max-w-xl">
                {t('myShop.subtitle') ||
                  'Manage the items guests see on the MUKHYMAT marketplace'}
              </p>
            </div>
            <Button
              onClick={openAdd}
              className="bg-primary hover:bg-primary/90 text-[#0A1128] font-semibold lantern-halo"
            >
              <Plus className="w-4 h-4 mr-2 rtl:mr-0 rtl:ml-2" />
              {t('myShop.addItem') || 'Add item'}
            </Button>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {items.length === 0 ? (
          <div className="text-center py-20 max-w-md mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Store className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {t('myShop.emptyTitle') || 'Your shop is empty'}
            </h2>
            <p className="text-gray-600 mb-6">
              {t('myShop.emptyText') ||
                'Add your first item and it will appear on the marketplace right away.'}
            </p>
            <Button
              onClick={openAdd}
              className="bg-primary hover:bg-primary/90 text-[#0A1128] font-semibold lantern-halo"
            >
              <Plus className="w-4 h-4 mr-2 rtl:mr-0 rtl:ml-2" />
              {t('myShop.addFirstItem') || 'Add your first item'}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
            {items.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-gray-200 bg-white overflow-hidden flex flex-col"
              >
                <div className="relative aspect-[4/3] bg-gray-100">
                  <img
                    src={item.image}
                    alt={isAr ? item.nameAr : item.nameEn}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                  <Badge
                    className={`absolute top-2 ltr:left-2 rtl:right-2 text-xs font-semibold ${
                      item.status === 'active'
                        ? 'bg-green-100 text-green-900 border-green-300'
                        : 'bg-gray-200 text-gray-700 border-gray-300'
                    }`}
                  >
                    {item.status === 'active'
                      ? t('myShop.statusActive') || 'Visible'
                      : t('myShop.statusHidden') || 'Hidden'}
                  </Badge>
                </div>
                <div className="p-3 flex-1 flex flex-col">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {isAr ? item.nameAr : item.nameEn}
                  </p>
                  <p className="text-sm font-bold text-gray-900 mt-0.5 tabular-nums">
                    {item.price} BD{' '}
                    <span className="font-medium text-gray-500 text-xs">
                      {isAr ? item.unitAr : item.unitEn}
                    </span>
                  </p>
                  <div className="mt-3 pt-2 border-t border-gray-100 flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-2.5"
                      onClick={() => openEdit(item)}
                      aria-label={t('myShop.editItem') || 'Edit item'}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-2.5"
                      onClick={() => handleToggleStatus(item)}
                      disabled={togglingId === item.id}
                      aria-label={
                        item.status === 'active'
                          ? t('myShop.hideItem') || 'Hide from marketplace'
                          : t('myShop.showItem') || 'Show on marketplace'
                      }
                    >
                      {togglingId === item.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : item.status === 'active' ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-2.5 text-red-600 hover:text-red-700 hover:bg-red-50 ml-auto rtl:ml-0 rtl:mr-auto"
                      onClick={() => setDeleteTarget(item)}
                      aria-label={t('myShop.deleteItem') || 'Delete item'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open && !saving) setDialogOpen(false); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing
                ? t('myShop.editItem') || 'Edit item'
                : t('myShop.addItem') || 'Add item'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Photo */}
            <div className="space-y-2">
              <Label htmlFor="itemPhoto">
                {t('myShop.photo') || 'Photo'}
                {!editing && <span className="text-red-500"> *</span>}
              </Label>
              <label
                htmlFor="itemPhoto"
                className="block cursor-pointer rounded-xl border-2 border-dashed border-gray-300 hover:border-primary/60 transition-colors overflow-hidden"
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="" className="w-full h-44 object-cover" />
                ) : (
                  <div className="h-32 flex flex-col items-center justify-center text-gray-500 gap-2">
                    <ImagePlus className="w-6 h-6" />
                    <span className="text-sm font-medium">
                      {t('myShop.choosePhoto') || 'Choose a photo'}
                    </span>
                  </div>
                )}
              </label>
              <input
                id="itemPhoto"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={handleImageChange}
              />
            </div>

            {/* Names */}
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="nameEn">
                  {t('myShop.nameEn') || 'Name (English)'} <span className="text-red-500">*</span>
                </Label>
                <Input id="nameEn" value={form.nameEn} maxLength={60}
                  onChange={(e) => setField('nameEn', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nameAr">
                  {t('myShop.nameAr') || 'Name (Arabic)'} <span className="text-red-500">*</span>
                </Label>
                <Input id="nameAr" dir="rtl" value={form.nameAr} maxLength={60}
                  onChange={(e) => setField('nameAr', e.target.value)} />
              </div>
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <Label>{t('myShop.category') || 'Category'}</Label>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_OPTIONS.map((option) => {
                  const selected = form.category === option.key;
                  return (
                    <button
                      key={option.key}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setField('category', option.key)}
                      className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                        selected
                          ? 'bg-primary text-[#0A1128] border-primary shadow-sm'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-primary/40'
                      }`}
                    >
                      {t(option.tKey) || option.fallback}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Price + units */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="price">
                  {t('myShop.price') || 'Price (BD)'} <span className="text-red-500">*</span>
                </Label>
                <Input id="price" type="number" min="0.1" step="0.1" inputMode="decimal"
                  value={form.price} onChange={(e) => setField('price', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="unitEn">
                  {t('myShop.unitEn') || 'Unit (EN)'} <span className="text-red-500">*</span>
                </Label>
                <Input id="unitEn" placeholder="per tray" value={form.unitEn} maxLength={30}
                  onChange={(e) => setField('unitEn', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="unitAr">
                  {t('myShop.unitAr') || 'Unit (AR)'} <span className="text-red-500">*</span>
                </Label>
                <Input id="unitAr" dir="rtl" placeholder="للصينية" value={form.unitAr} maxLength={30}
                  onChange={(e) => setField('unitAr', e.target.value)} />
              </div>
            </div>

            {/* Descriptions */}
            <div className="space-y-1.5">
              <Label htmlFor="descEn">{t('myShop.descEn') || 'Description (English)'}</Label>
              <Textarea id="descEn" rows={2} maxLength={300} value={form.descEn}
                onChange={(e) => setField('descEn', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="descAr">{t('myShop.descAr') || 'Description (Arabic)'}</Label>
              <Textarea id="descAr" dir="rtl" rows={2} maxLength={300} value={form.descAr}
                onChange={(e) => setField('descAr', e.target.value)} />
            </div>
          </div>

          <DialogFooter className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              {t('myShop.cancel') || 'Cancel'}
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-primary hover:bg-primary/90 text-[#0A1128] font-semibold lantern-halo"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('myShop.saving') || 'Saving...'}
                </>
              ) : (
                t('myShop.save') || 'Save item'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open && !deleting) setDeleteTarget(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('myShop.deleteConfirmTitle') || 'Remove this item?'}</DialogTitle>
          </DialogHeader>
          {deleteTarget && (
            <div className="space-y-4">
              <p className="text-gray-700">
                {t('myShop.deleteConfirmText') ||
                  'The item will disappear from the marketplace immediately. This cannot be undone.'}
              </p>
              <p className="font-semibold text-gray-900">
                {isAr ? deleteTarget.nameAr : deleteTarget.nameEn}
              </p>
              <DialogFooter className="flex gap-2">
                <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                  {t('myShop.cancel') || 'Cancel'}
                </Button>
                <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                  {deleting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-2" />
                  )}
                  {t('myShop.deleteItem') || 'Delete item'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
