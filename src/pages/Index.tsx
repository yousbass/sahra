import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  ArrowRight,
  ChevronRight,
  Tent,
  Waves,
  Flame,
  UtensilsCrossed,
  MapPin,
  Star,
  CookingPot,
  ShowerHead,
  Zap,
  Droplets,
  Sofa,
  Snowflake,
  Music,
  Tv,
  Car,
  Dog,
  Users,
  Shield,
  Sparkles,
  CalendarCheck,
  type LucideIcon,
  ShoppingBag,
  Info,
} from 'lucide-react';
import { getCampsWithFilters, FilterState } from '@/lib/firestore';
import { LegacyCamp, normalizeCampToLegacy } from '@/lib/dataCompatibility';
import { useTranslation } from 'react-i18next';
import { PatternSadu } from '@/components/BackgroundPatterns';
import { useFavorites } from '@/hooks/useFavorites';
import { FavoriteButton } from '@/components/FavoriteButton';
import { MarketItemDialog } from '@/components/MarketItemDialog';
import { MiniCard } from '@/components/MiniCard';
import { marketItemsByCategory, type MarketItem } from '@/lib/marketplace';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const HOME_FILTERS: FilterState = {
  priceRange: [0, 1000],
  locations: [],
  minGuests: 1,
  amenities: [],
  tentTypes: [],
  minRating: 0,
  sortBy: 'newest',
  listingType: 'all',
};

// Firestore's normalizeCampData attaches listingType at runtime; the shared
// LegacyCamp interface predates it, so read it through a local view type.
const listingTypeOf = (c: LegacyCamp): 'camp' | 'kashta' =>
  (c as LegacyCamp & { listingType?: 'camp' | 'kashta' }).listingType || 'camp';

const AMENITY_ICONS: Array<[RegExp, LucideIcon]> = [
  [/fire/i, Flame],
  [/bbq|grill/i, CookingPot],
  [/cook|kitchen|dining|food/i, UtensilsCrossed],
  [/restroom|bath|toilet/i, ShowerHead],
  [/electric|light/i, Zap],
  [/water/i, Droplets],
  [/tent|carpet|furnish/i, Tent],
  [/sofa|seating|tea/i, Sofa],
  [/air condition/i, Snowflake],
  [/sound|music/i, Music],
  [/tv/i, Tv],
  [/parking/i, Car],
  [/pet/i, Dog],
  [/family/i, Users],
  [/security|guard/i, Shield],
];

const iconForAmenity = (name: string): LucideIcon =>
  AMENITY_ICONS.find(([re]) => re.test(name))?.[1] || Sparkles;

function MarketRail({
  title,
  subtitle,
  items,
  chip,
  onOpen,
}: {
  title: string;
  subtitle: string;
  items: MarketItem[];
  chip?: (m: MarketItem) => string;
  onOpen: (m: MarketItem) => void;
}) {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  return (
    <section className="pt-8">
      <div className="flex items-baseline justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 border border-primary/20 rounded-full px-3 py-1.5 whitespace-nowrap">
          <Sparkles className="w-3.5 h-3.5" />
          {t('home.marketplaceNote')}
        </span>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
        {items.map((m) => (
          <button
            key={m.id}
            onClick={() => onOpen(m)}
            className="w-52 sm:w-56 shrink-0 text-left rtl:text-right group"
          >
            <div className="relative h-36 rounded-xl overflow-hidden border border-gray-200 bg-gray-100">
              <img
                src={m.image}
                alt={isAr ? m.nameAr : m.nameEn}
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              {chip && (
                <Badge className="absolute top-2 ltr:left-2 rtl:right-2 bg-white/90 text-[#0A1128] hover:bg-white/90 text-xs font-semibold">
                  {chip(m)}
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
              {t('home.itemSoonChip')}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

export default function Index() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [camps, setCamps] = useState<LegacyCamp[]>([]);
  const [loading, setLoading] = useState(true);
  const [campsError, setCampsError] = useState(false);
  const { favorites } = useFavorites();
  const [activeItem, setActiveItem] = useState<MarketItem | null>(null);

  const [loadKey, setLoadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setCampsError(false);
    setLoading(true);
    (async () => {
      try {
        const raw = await getCampsWithFilters(HOME_FILTERS);
        const normalized: LegacyCamp[] = [];
        for (const camp of raw || []) {
          try {
            normalized.push(normalizeCampToLegacy(camp));
          } catch (e) {
            console.warn('[HOME] Skipping camp that failed normalization:', e);
          }
        }
        if (!cancelled) setCamps(normalized);
      } catch (e) {
        console.error('[HOME] Failed to load listings:', e);
        if (!cancelled) setCampsError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadKey]);

  // Season status — Bahraini camping ("barr") season runs roughly October through April.
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentDay = now.getDate();
  // Season runs Oct 15 - Apr 15 (inclusive)
  const isInSeason =
    (currentMonth === 9 ? currentDay >= 15 : currentMonth > 9) ||
    (currentMonth === 3 ? currentDay <= 15 : currentMonth < 3);
  const seasonStartYear = currentMonth >= 9 ? now.getFullYear() : now.getFullYear() - 1;
  const seasonRange = `${seasonStartYear}\u2013${seasonStartYear + 1}`;
  const nextOpenMonth = new Intl.DateTimeFormat(i18n.language === 'ar' ? 'ar' : 'en', { month: 'long' }).format(
    new Date(now.getFullYear(), 9, 1)
  );

  const campCount = camps.filter((c) => listingTypeOf(c) !== 'kashta').length;
  const kashtaCount = camps.filter((c) => listingTypeOf(c) === 'kashta').length;
  const topRated = [...camps]
    .sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0))
    .slice(0, 4);
  const trending = [...camps]
    .sort((a, b) => ((b.reviewCount || 0) * (b.averageRating || 0)) - ((a.reviewCount || 0) * (a.averageRating || 0)))
    .filter((c) => (c.reviewCount || 0) > 0)
    .slice(0, 4);
  const favCamps = camps.filter((c) => favorites.includes(c.id));

  // Live amenity classification, derived from the loaded listings so every tile
  // leads to at least one real result.
  const amenityCounts = new Map<string, number>();
  camps.forEach((c) => (c.amenities || []).forEach((a) => amenityCounts.set(a, (amenityCounts.get(a) || 0) + 1)));
  const topAmenities = [...amenityCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);

  const goToSearch = (params?: string) =>
    navigate(params ? `/search?${params}&ts=${Date.now()}` : '/search');

  const openCamp = (id: string) => navigate(`/camp/${id}`, { state: { from: '/' } });

  const isAr = i18n.language === 'ar';
  const foodItems = marketItemsByCategory('food');
  const supplyItems = [...marketItemsByCategory('firewood'), ...marketItemsByCategory('gear')];

  const howSteps = [
    { icon: Search, title: t('home.how1Title'), text: t('home.how1Text') },
    { icon: CalendarCheck, title: t('home.how2Title'), text: t('home.how2Text') },
    { icon: Flame, title: t('home.how3Title'), text: t('home.how3Text') },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Hero — search + both booking entries stay inside the first viewport */}
      <section className="relative overflow-hidden bg-[#0A1128]">
        <PatternSadu color="#FDFBF7" opacity={0.05} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-8 sm:pt-14 sm:pb-12">
          <p className="text-primary font-semibold tracking-[0.25em] uppercase text-xs mb-2">
            {t('header.brand')}
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-white max-w-2xl leading-tight">
            {t('home.heroTitle')}
          </h1>
          <p className="mt-2 text-white/70 text-sm sm:text-base max-w-xl">{t('home.heroSubtitle')}</p>
          <button
            onClick={() => goToSearch()}
            className="mt-6 w-full max-w-2xl bg-white rounded-2xl shadow-xl px-4 sm:px-5 py-3.5 flex items-center gap-3 text-left rtl:text-right hover:shadow-2xl transition-shadow group"
          >
            <Search className="w-5 h-5 text-gray-400 shrink-0" />
            <span className="flex-1 text-gray-500 text-sm sm:text-base truncate">
              {t('home.searchPlaceholder')}
            </span>
            <span className="h-9 w-9 rounded-full bg-primary text-[#0A1128] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <ArrowRight className="w-4 h-4 rtl:rotate-180" />
            </span>
          </button>

          <p className="mt-6 text-white/80 text-xs font-semibold tracking-[0.2em] uppercase">
            {t('home.bookNowLabel')}
          </p>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-2 max-w-2xl">
            <button
              onClick={() => navigate('/camps')}
              className="relative overflow-hidden rounded-2xl h-32 sm:h-36 bg-gradient-to-br from-[#16224D] to-[#1D2E63] border border-white/10 text-left rtl:text-right group shadow-md hover:shadow-xl transition-all hover:-translate-y-0.5"
            >
              <PatternSadu color="#FDFBF7" opacity={0.06} />
              <div className="relative h-full flex flex-col justify-between p-4">
                <span className="h-9 w-9 rounded-full bg-white/10 border border-white/15 flex items-center justify-center">
                  <Tent className="w-4.5 h-4.5 text-primary" />
                </span>
                <div className="flex items-end justify-between gap-2">
                  <div>
                    <p className="text-white font-bold text-base sm:text-lg">{t('home.serviceCamps')}</p>
                    <p className="text-white/60 text-xs sm:text-sm tabular-nums">
                      {loading ? '—' : t('home.campsAvailable', { count: campCount })}
                    </p>
                  </div>
                  <span className="h-8 w-8 rounded-full bg-primary text-[#0A1128] flex items-center justify-center group-hover:scale-110 transition-transform">
                    <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                  </span>
                </div>
              </div>
            </button>

            <button
              onClick={() => navigate('/kashtas')}
              className="relative overflow-hidden rounded-2xl h-32 sm:h-36 bg-accent text-left rtl:text-right group shadow-md hover:shadow-xl transition-all hover:-translate-y-0.5"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-black/25 to-transparent" />
              <PatternSadu color="#FDFBF7" opacity={0.06} />
              <div className="relative h-full flex flex-col justify-between p-4">
                <span className="h-9 w-9 rounded-full bg-white/15 border border-white/20 flex items-center justify-center">
                  <Waves className="w-4.5 h-4.5 text-white" />
                </span>
                <div className="flex items-end justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-white font-bold text-base sm:text-lg">{t('home.serviceKashtas')}</p>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex" onClick={(e) => e.stopPropagation()}>
                              <Info className="w-3.5 h-3.5 text-white/50 hover:text-white/90 transition-colors cursor-default" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs text-xs">
                            {t('home.kashtaTooltip')}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <p className="text-white/70 text-xs sm:text-sm tabular-nums">
                      {loading ? '—' : t('home.kashtasAvailable', { count: kashtaCount })}
                    </p>
                  </div>
                  <span className="h-8 w-8 rounded-full bg-white text-accent flex items-center justify-center group-hover:scale-110 transition-transform">
                    <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                  </span>
                </div>
              </div>
            </button>
          </div>
        </div>
      </section>

      {/* Season band */}
      <div className="relative bg-white border-b border-border overflow-hidden">
        <PatternSadu color="#0A1128" opacity={0.04} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-sm font-medium">
            <div className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-full border border-primary/20">
              <span className="relative flex h-2 w-2">
                {isInSeason && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                )}
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${isInSeason ? 'bg-primary' : 'bg-gray-400'}`}
                ></span>
              </span>
              {isInSeason
                ? t('home.seasonOpenLabel', { range: seasonRange })
                : t('home.seasonClosedLabel', { month: nextOpenMonth })}
            </div>
            <span className="text-gray-500 hidden sm:inline-block">{t('home.seasonDate')}</span>
          </div>
          <span className="hidden md:flex items-center gap-2 text-sm text-foreground/70 font-medium">
            <Tent className="w-4 h-4 opacity-70" />
            {t('home.culturalQuote')}
          </span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* M-5: inline error state with retry — never a silently empty home */}
        {!loading && campsError && (
          <div className="mt-8 rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
            <p className="text-gray-900 font-semibold mb-3">{t('home.loadErrorTitle')}</p>
            <button
              onClick={() => setLoadKey((k) => k + 1)}
              className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              {t('home.loadErrorRetry')}
            </button>
          </div>
        )}

        {/* Browse by equipment — live classification derived from listings */}
        {(loading || topAmenities.length > 0) && (
          <section className="pt-8">
            <h2 className="text-xl font-bold text-gray-900">{t('home.amenityTitle')}</h2>
            <p className="text-sm text-gray-500 mt-1 mb-4">{t('home.amenitySubtitle')}</p>
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                  <div key={i} className="h-[74px] rounded-xl bg-gray-100 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {topAmenities.map(([name, count]) => {
                  const Icon = iconForAmenity(name);
                  return (
                    <button
                      key={name}
                      onClick={() => goToSearch(`amenities=${encodeURIComponent(name)}`)}
                      className="group flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3.5 text-left rtl:text-right hover:border-primary/40 hover:shadow-md transition-all"
                    >
                      <span className="h-10 w-10 shrink-0 rounded-full bg-primary/10 border border-primary/15 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                        <Icon className="w-5 h-5 text-[#0A1128]" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-gray-900 truncate">
                          {t(`amenityNames.${name}`, name)}
                        </span>
                        <span className="block text-xs text-gray-500 tabular-nums">
                          {t('home.campsAvailable', { count })}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* Your favorites */}
        {!loading && favCamps.length > 0 && (
          <section className="pt-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">{t('home.yourFavorites')}</h2>
              <button
                onClick={() => goToSearch('favorites=1')}
                className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
              >
                {t('home.browseAll')}
                <ChevronRight className="w-4 h-4 rtl:rotate-180" />
              </button>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
              {favCamps.map((camp) => (
                <div key={camp.id} className="w-60 shrink-0">
                  <MiniCard camp={camp} onClick={() => openCamp(camp.id)} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Top rated */}
        <section className="pt-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">{t('home.topRatedTitle')}</h2>
            <button
              onClick={() => goToSearch()}
              className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
            >
              {t('home.browseAll')}
              <ChevronRight className="w-4 h-4 rtl:rotate-180" />
            </button>
          </div>
          {loading ? (
            <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="w-60 shrink-0">
                  <div className="h-40 rounded-xl bg-gray-100 animate-pulse" />
                  <div className="h-4 w-3/4 rounded bg-gray-100 animate-pulse mt-3" />
                  <div className="h-3 w-1/2 rounded bg-gray-100 animate-pulse mt-2" />
                </div>
              ))}
            </div>
          ) : topRated.length > 0 ? (
            <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
              {topRated.map((camp) => (
                <div key={camp.id} className="w-60 shrink-0">
                  <MiniCard camp={camp} onClick={() => openCamp(camp.id)} />
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white py-10 text-center">
              <Tent className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500 font-medium">{t('home.seasonClosedLabel', { month: nextOpenMonth })}</p>
            </div>
          )}
        </section>

        {/* Popular Picks */}
        {!loading && trending.length > 0 && (
          <section className="pt-10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{t('home.popularPicksTitle')}</h2>
                <p className="text-xs text-gray-500 mt-0.5">{t('home.popularPicksSubtitle')}</p>
              </div>
              <button onClick={() => goToSearch()} className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
                {t('home.browseAll')}
                <ChevronRight className="w-4 h-4 rtl:rotate-180" />
              </button>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
              {trending.map((camp) => (
                <div key={camp.id} className="w-60 shrink-0">
                  <MiniCard camp={camp} onClick={() => openCamp(camp.id)} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Marketplace — below camp discovery to reduce above-fold density */}
        <section className="pt-10">
          <h2 className="text-xl font-bold text-gray-900 mb-3">{t('home.marketplaceTitle', 'Camp Services & Supplies')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {([
              { cat: 'food', Icon: UtensilsCrossed, label: t('home.serviceCampFood') },
              { cat: 'firewood', Icon: Flame, label: t('home.serviceFirewood') },
              { cat: 'gear', Icon: ShoppingBag, label: t('home.serviceGear') },
            ] as const).map(({ cat, Icon, label }) => (
              <button
                key={cat}
                onClick={() => navigate(`/market?cat=${cat}`)}
                className="group flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3.5 text-left rtl:text-right hover:border-primary/40 hover:shadow-md transition-all"
              >
                <span className="h-10 w-10 shrink-0 rounded-full bg-primary/10 border border-primary/15 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                  <Icon className="w-5 h-5 text-[#0A1128]" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-gray-900 truncate">{label}</span>
                  <span className="block text-xs text-gray-500 truncate">{t('home.marketplaceNote')}</span>
                </span>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-primary rtl:rotate-180 shrink-0 transition-colors" />
              </button>
            ))}
          </div>
          <MarketRail
            title={t('home.hungryTitle')}
            subtitle={t('home.hungrySubtitle')}
            items={foodItems}
            onOpen={setActiveItem}
          />
          <MarketRail
            title={t('home.suppliesTitle')}
            subtitle={t('home.suppliesSubtitle')}
            items={supplyItems}
            chip={(m) => t(m.category === 'firewood' ? 'home.serviceFirewood' : 'home.serviceGear')}
            onOpen={setActiveItem}
          />
        </section>

        {/* How it works */}
        <section className="pt-10">
          <h2 className="text-xl font-bold text-gray-900 mb-4">{t('home.howTitle')}</h2>
          <div className="relative overflow-hidden rounded-2xl bg-[#0A1128]">
            <PatternSadu color="#FDFBF7" opacity={0.05} />
            <div className="relative grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-4 p-6 sm:p-8">
              {howSteps.map(({ icon: Icon, title, text }, i) => (
                <div key={title} className="flex sm:block items-start gap-4">
                  <span className="relative h-11 w-11 shrink-0 rounded-full bg-primary text-[#0A1128] flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                    <span className="absolute -top-1 ltr:-right-1 rtl:-left-1 h-5 w-5 rounded-full bg-white text-[#0A1128] text-xs font-bold flex items-center justify-center tabular-nums">
                      {i + 1}
                    </span>
                  </span>
                  <div className="sm:mt-3">
                    <p className="text-white font-semibold">{title}</p>
                    <p className="text-white/60 text-sm mt-1 leading-relaxed">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Host CTA */}
        <section className="pt-10">
          <div className="relative overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent">
            <PatternSadu color="#0A1128" opacity={0.04} />
            <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 sm:p-8">
              <div className="flex items-start gap-4">
                <span className="h-11 w-11 shrink-0 rounded-full bg-primary text-[#0A1128] flex items-center justify-center">
                  <Tent className="w-5 h-5" />
                </span>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900">{t('home.hostCtaTitle')}</h2>
                  <p className="text-sm text-gray-600 mt-1">{t('home.hostCtaText')}</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/host')}
                className="shrink-0 inline-flex items-center gap-2 rounded-full bg-primary text-[#0A1128] font-semibold px-5 py-2.5 hover:shadow-lg hover:-translate-y-0.5 transition-all"
              >
                {t('home.hostCtaButton')}
                <ArrowRight className="w-4 h-4 rtl:rotate-180" />
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Marketplace item details */}
      <MarketItemDialog item={activeItem} onClose={() => setActiveItem(null)} />
    </div>
  );
}
