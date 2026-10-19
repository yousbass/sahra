import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { MarketItem } from '@/lib/marketplace';

/** Marketplace item details — browse-only, shared by the home rails and the /market page. */
export function MarketItemDialog({
  item,
  onClose,
}: {
  item: MarketItem | null;
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  return (
    <Dialog open={!!item} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        {item && (
          <>
            <img
              src={item.image}
              alt={isAr ? item.nameAr : item.nameEn}
              className="w-full h-52 object-cover rounded-xl border border-gray-200"
            />
            <DialogHeader>
              <DialogTitle className="text-left rtl:text-right">
                {isAr ? item.nameAr : item.nameEn}
              </DialogTitle>
              <DialogDescription className="text-left rtl:text-right">
                {isAr ? item.descAr : item.descEn}
              </DialogDescription>
            </DialogHeader>
            {item.sellerEn && (
              <p className="text-sm font-semibold text-gray-600">
                {t('home.marketSoldBy')} {isAr ? item.sellerAr || item.sellerEn : item.sellerEn}
              </p>
            )}
            <p className="text-lg font-bold text-gray-900 tabular-nums">
              {item.price} BD{' '}
              <span className="text-sm font-medium text-gray-500">
                {isAr ? item.unitAr : item.unitEn}
              </span>
            </p>
            <div className="rounded-lg bg-primary/10 border border-primary/20 px-3.5 py-2.5 text-sm text-gray-700 font-medium">
              {t('home.itemDialogNote')}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
