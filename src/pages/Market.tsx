import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Sparkles, Store } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { PatternSadu } from '@/components/BackgroundPatterns';
import { MARKET_ITEMS, type MarketItem } from '@/lib/marketplace';
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
  const isAr = i18n.language === 'ar';

  const { userData } = useAuth();

  const cat = parseCat(searchParams.get('cat'));
  const [activeItem, setActiveItem] = useState<MarketItem | null>(null);
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
    <div className="min-h-screen bg-background pb-20">
      {/* Header band — same navy identity as the home hero */}
      <section className="relative overflow-hidden bg-[#0A1128]">
        <PatternSadu color="#FDFBF7" opacity={0.05} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-8">
          <button
            onClick={goBack}
            className="inline-flex items-center gap-1.5 text-white/70 hover:text-white text-sm font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
            {t('home.marketBack')}
          </button>
          <h1 className="mt-4 text-3xl sm:text-4xl font-bold text-white">
            {t('home.marketplaceTitle')}
          </h1>
          <p className="mt-2 text-white/70 text-sm sm:text-base max-w-xl">
            {t('home.marketplaceSubtitle')}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-white/10 border border-white/15 rounded-full px-3 py-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              {t('home.marketplaceNote')}
            </span>
            <Link
              to={userData?.isSeller ? '/my-shop' : '/partner'}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0A1128] bg-primary hover:bg-primary/90 rounded-full px-3 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              <Store className="w-3.5 h-3.5" />
              {userData?.isSeller ? t('home.marketMyShopChip') : t('home.marketSellChip')}
            </Link>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Category filters */}
        <div className="flex gap-2 overflow-x-auto pt-6 pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
          {filters.map((f) => {
            const selected = cat === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setSearchParams(f.key === 'all' ? {} : { cat: f.key }, { replace: true })}
                className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-all ${
                  selected
                    ? 'bg-primary text-[#0A1128] border-primary shadow-sm'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-primary/40'
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {/* Item grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5 pt-6">
          {items.map((m) => (
            <button
              key={m.id}
              onClick={() => setActiveItem(m)}
              className="text-left rtl:text-right group"
            >
              <div className="relative aspect-[4/3] rounded-xl overflow-hidden border border-gray-200 bg-gray-100">
                <img
                  src={m.image}
                  alt={isAr ? m.nameAr : m.nameEn}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                {cat === 'all' && m.category !== 'food' && (
                  <Badge className="absolute top-2 ltr:left-2 rtl:right-2 bg-white/90 text-[#0A1128] hover:bg-white/90 text-xs font-semibold">
                    {t(m.category === 'firewood' ? 'home.serviceFirewood' : 'home.serviceGear')}
                  </Badge>
                )}
              </div>
              <p className="mt-2.5 text-sm font-semibold text-gray-900 truncate">
                {isAr ? m.nameAr : m.nameEn}
              </p>
              <p className="text-sm font-bold text-gray-900 mt-0.5 tabular-nums">
                {m.price} BHD{' '}
                <span className="font-medium text-gray-500 text-xs">{isAr ? m.unitAr : m.unitEn}</span>
              </p>
              <span className="inline-block mt-1 text-xs font-semibold text-foreground bg-primary/10 rounded-full px-2 py-0.5">
                {m.sellerEn
                  ? `${t('home.marketSoldBy')} ${isAr ? m.sellerAr || m.sellerEn : m.sellerEn}`
                  : t('home.itemSoonChip')}
              </span>
            </button>
          ))}
        </div>
      </div>

      <MarketItemDialog item={activeItem} onClose={() => setActiveItem(null)} />
    </div>
  );
}
