import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Store } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MARKET_ITEMS, MarketItem } from '@/lib/marketplace';
import { getActiveMarketItems, toMarketItem } from '@/lib/marketItems';
import { MarketItemDialog } from '@/components/MarketItemDialog';
import { useAuth } from '@/hooks/useAuth';

type CatFilter = 'all' | MarketItem['category'];

const parseCat = (v: string | null): CatFilter =>
  v === 'food' || v === 'firewood' || v === 'gear' ? v : 'all';

export default function Market() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  const { userData } = useAuth();

  const cat = parseCat(searchParams.get('cat'));
  const [selectedMarketItem, setSelectedMarketItem] = useState<MarketItem | null>(null);
  const [sellerItems, setSellerItems] = useState<MarketItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    getActiveMarketItems()
      .then((docs) => {
        if (!cancelled) setSellerItems(docs.map(toMarketItem));
      })
      .catch(() => {
        // Browse-only marketplace: the static catalog still renders if seller items fail to load
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const goBack = () => {
    if (window.history.state && window.history.state.idx > 0) navigate(-1);
    else navigate('/');
  };

  const filters: { key: CatFilter; label: string }[] = [
    { key: 'all', label: t('home.marketAll') },
    { key: 'food', label: t('home.serviceCampFood') },
    { key: 'firewood', label: t('home.serviceFirewood') },
    { key: 'gear', label: t('home.serviceGear') },
  ];

  const items = useMemo(() => {
    const all = [...sellerItems, ...MARKET_ITEMS];
    return cat === 'all' ? all : all.filter((m) => m.category === cat);
  }, [cat, sellerItems]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-10">
        <Button
          variant="ghost"
          onClick={goBack}
          className="mb-6 -ml-2 rtl:ml-0 rtl:-mr-2 gap-2 font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
          {t('home.marketBack')}
        </Button>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold font-sans">{t('home.marketplaceTitle')}</h1>
            <p className="text-muted-foreground mt-2 text-lg">{t('home.marketplaceSubtitle')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="w-fit text-xs px-3 py-1 font-medium bg-background text-muted-foreground">
              {t('home.marketplaceNote')}
            </Badge>
            <Link
              to={userData?.isSeller ? '/my-shop' : '/partner'}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <Store className="w-3.5 h-3.5" />
              {userData?.isSeller ? t('home.marketMyShopChip') : t('home.marketSellChip')}
            </Link>
          </div>
        </div>

        {/* Category filters */}
        <div className="flex flex-wrap gap-2 mb-8">
          {filters.map((f) => {
            const selected = cat === f.key;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setSearchParams(f.key === 'all' ? {} : { cat: f.key }, { replace: true })}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                  selected
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'bg-card text-muted-foreground border-border/50 hover:border-primary/50'
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {/* Item grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {items.map((item) => (
            <button
              type="button"
              key={item.id}
              onClick={() => setSelectedMarketItem(item)}
              className="group cursor-pointer bg-card border border-border/50 hover:border-primary/50 rounded-3xl overflow-hidden transition-all duration-300 hover:shadow-lg flex flex-col text-left rtl:text-right focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <div className="relative h-40 sm:h-48 overflow-hidden bg-muted">
                <img
                  src={item.image}
                  alt={isRTL ? item.nameAr : item.nameEn}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 right-3 rtl:right-auto rtl:left-3">
                  <Badge className="bg-background/80 backdrop-blur-md text-foreground border-none font-semibold shadow-sm">
                    {item.sellerEn
                      ? `${t('home.marketSoldBy')} ${isRTL ? item.sellerAr || item.sellerEn : item.sellerEn}`
                      : t('home.itemSoonChip')}
                  </Badge>
                </div>
                {cat === 'all' && item.category !== 'food' && (
                  <div className="absolute top-3 left-3 rtl:left-auto rtl:right-3">
                    <Badge variant="secondary" className="bg-secondary/90 backdrop-blur-sm font-medium">
                      {item.category === 'firewood' ? t('home.serviceFirewood') : t('home.serviceGear')}
                    </Badge>
                  </div>
                )}
              </div>
              <div className="p-4 sm:p-5 flex-1 flex flex-col">
                <h3 className="font-bold sm:text-lg mb-1 truncate w-full">{isRTL ? item.nameAr : item.nameEn}</h3>
                <div className="mt-auto pt-3 flex items-baseline gap-1 flex-wrap">
                  <span className="font-bold font-display text-lg sm:text-xl text-primary tabular-nums">
                    {item.price} {t('common.currency')}
                  </span>
                  <span className="text-xs sm:text-sm text-muted-foreground font-medium">
                    / {isRTL ? item.unitAr : item.unitEn}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <MarketItemDialog item={selectedMarketItem} onClose={() => setSelectedMarketItem(null)} />
    </div>
  );
}
