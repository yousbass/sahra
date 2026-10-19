import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
  const isRTL = i18n.language === 'ar';

  return (
    <Dialog open={!!item} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden border-border/50 rounded-[2rem]">
        {item && (
          <div className="flex flex-col h-full" dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="relative h-64 bg-muted">
              <img src={item.image} alt={isRTL ? item.nameAr : item.nameEn} className="w-full h-full object-cover" />
              <div className="absolute top-4 left-4 rtl:left-auto rtl:right-4">
                <Badge variant="secondary" className="bg-background/90 backdrop-blur-md font-medium border-none shadow-sm">
                  {item.category === 'firewood' ? t('home.serviceFirewood') :
                   item.category === 'gear' ? t('home.serviceGear') : t('home.serviceCampFood')}
                </Badge>
              </div>
            </div>
            <div className="p-6">
              <DialogHeader className="mb-4 text-left rtl:text-right">
                <DialogTitle className="text-2xl font-bold font-sans mb-2">
                  {isRTL ? item.nameAr : item.nameEn}
                </DialogTitle>
                <DialogDescription className="text-base text-foreground leading-relaxed">
                  {isRTL ? item.descAr : item.descEn}
                </DialogDescription>
              </DialogHeader>

              {item.sellerEn && (
                <p className="mb-4 text-sm font-semibold text-muted-foreground text-left rtl:text-right">
                  {t('home.marketSoldBy')} {isRTL ? item.sellerAr || item.sellerEn : item.sellerEn}
                </p>
              )}
              <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4 mb-6 text-sm text-primary/90 font-medium">
                {t('home.itemDialogNote')}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border/50">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-bold font-display text-primary tabular-nums">{item.price}</span>
                  <span className="text-lg font-bold text-primary mr-1">{t('common.currency')}</span>
                  <span className="text-sm text-muted-foreground ml-1">/ {isRTL ? item.unitAr : item.unitEn}</span>
                </div>
                <Button variant="outline" className="rounded-xl border-border/50 font-semibold" onClick={onClose}>
                  {t('common.cancel')}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
