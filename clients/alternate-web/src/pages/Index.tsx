import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search as SearchIcon, Tent, Waves, Flame, UtensilsCrossed, Heart, MapPin, Users, ArrowRight, CookingPot, ShowerHead, Zap, Droplets, Sofa, Snowflake, Music, Tv, Car, Dog, Shield, Sparkles, CalendarCheck, ShoppingBag, Info } from 'lucide-react';
import { getCampsWithFilters } from '@/lib/firestore';
import { LegacyCamp, normalizeCampToLegacy } from '@/lib/dataCompatibility';
import { hasPeakPricing, getStartingRate } from '@/lib/peakPricing';
import { useTranslation } from 'react-i18next';
import { PatternSadu } from '@/components/BackgroundPatterns';
import { useFavorites } from '@/hooks/useFavorites';
import { KashtaListingCard } from '@/components/KashtaListingCard';
import { RefundPolicyBadge } from '@/components/RefundPolicyBadge';
import RatingStars from '@/components/RatingStars';
import { ListingType } from '@/types/listing';
import { MARKET_ITEMS, MarketItem } from '@/lib/marketplace';
import { MarketItemDialog } from '@/components/MarketItemDialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function Index() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { favorites, isFavorite, toggleFavorite } = useFavorites();
  const [camps, setCamps] = useState<LegacyCamp[]>([]);
  const [loading, setLoading] = useState(true);
  const [campsError, setCampsError] = useState(false);
  const [selectedMarketItem, setSelectedMarketItem] = useState<MarketItem | null>(null);

  useEffect(() => {
    loadCamps();
  }, []);

  const loadCamps = async () => {
    try {
      setLoading(true);
      setCampsError(false);
      const filteredCamps = await getCampsWithFilters({
        priceRange: [0, 1000],
        locations: [],
        minGuests: 1,
        amenities: [],
        tentTypes: [],
        minRating: 0,
        sortBy: 'newest',
        listingType: 'all'
      });

      if (!filteredCamps || filteredCamps.length === 0) {
        setCamps([]);
        return;
      }
      
      const legacyCamps: LegacyCamp[] = [];
      for (const camp of filteredCamps || []) {
        try {
          legacyCamps.push(normalizeCampToLegacy(camp));
        } catch (e) {
          console.warn('[HOME] Skipping camp that failed normalization:', e);
        }
      }
      setCamps(legacyCamps);
    } catch (error) {
      // M-5: surface the failure instead of silently showing an empty home.
      console.error(error);
      setCamps([]);
      setCampsError(true);
    } finally {
      setLoading(false);
    }
  };

  const isRTL = i18n.language === 'ar';
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentDay = now.getDate();
  // Season runs Oct 15 - Apr 15 (inclusive)
  const isInSeason =
    (currentMonth === 9 ? currentDay >= 15 : currentMonth > 9) ||
    (currentMonth === 3 ? currentDay <= 15 : currentMonth < 3);
  const seasonStartYear = currentMonth >= 9 ? now.getFullYear() : now.getFullYear() - 1;
  const seasonRange = `${seasonStartYear}\u2013${seasonStartYear + 1}`;
  const nextOpenMonth = new Intl.DateTimeFormat(isRTL ? 'ar' : 'en', { month: 'long' }).format(
    new Date(now.getFullYear(), 9, 1)
  );
  
  const handleSearchClick = () => {
    navigate('/search');
  };
  
  const handleCampClick = (campId: string) => {
    navigate(`/camp/${campId}`, { state: { from: '/' } });
  };

  const campCount = camps.filter(c => ((c as any).listingType || 'camp') === 'camp').length;
  const kashtaCount = camps.filter(c => (c as any).listingType === 'kashta').length;
  
  const topRatedCamp = [...camps].sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0))[0];
  const trending = [...camps]
    .sort((a, b) => ((b.reviewCount || 0) * (b.averageRating || 0)) - ((a.reviewCount || 0) * (a.averageRating || 0)))
    .filter((c) => (c.reviewCount || 0) > 0)
    .slice(0, 4);
  const favoriteCamps = camps.filter(c => favorites.includes(c.id));

  // Compute top 8 amenities from all loaded camps
  const topAmenities = (() => {
    const m = new Map<string, number>();
    camps.forEach(c => {
      (c.amenities || []).forEach(a => {
        m.set(a, (m.get(a) || 0) + 1);
      });
    });
    return Array.from(m.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  })();

  const getAmenityIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('fire')) return <Flame className="w-6 h-6" />;
    if (n.includes('bbq') || n.includes('grill')) return <CookingPot className="w-6 h-6" />;
    if (n.includes('cook') || n.includes('kitchen') || n.includes('dining')) return <UtensilsCrossed className="w-6 h-6" />;
    if (n.includes('restroom') || n.includes('bath') || n.includes('shower')) return <ShowerHead className="w-6 h-6" />;
    if (n.includes('electric') || n.includes('light')) return <Zap className="w-6 h-6" />;
    if (n.includes('water')) return <Droplets className="w-6 h-6" />;
    if (n.includes('tent') || n.includes('furnish') || n.includes('carpet')) return <Tent className="w-6 h-6" />;
    if (n.includes('sofa') || n.includes('seating') || n.includes('tea')) return <Sofa className="w-6 h-6" />;
    if (n.includes('air condition')) return <Snowflake className="w-6 h-6" />;
    if (n.includes('sound') || n.includes('music')) return <Music className="w-6 h-6" />;
    if (n.includes('tv')) return <Tv className="w-6 h-6" />;
    if (n.includes('park')) return <Car className="w-6 h-6" />;
    if (n.includes('pet')) return <Dog className="w-6 h-6" />;
    if (n.includes('family') || n.includes('guest')) return <Users className="w-6 h-6" />;
    if (n.includes('security') || n.includes('guard') || n.includes('safe')) return <Shield className="w-6 h-6" />;
    return <Sparkles className="w-6 h-6" />;
  };

  const getTotalTents = (config?: { large: number; small: number; entertainment: number }) => {
    if (!config) return 0;
    return config.large + config.small + config.entertainment;
  };

  const foodItems = MARKET_ITEMS.filter(i => i.category === 'food');
  const suppliesItems = MARKET_ITEMS.filter(i => i.category === 'firewood' || i.category === 'gear');

  return (
    <div className="min-h-screen bg-background flex flex-col" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Dark Sadu Hero - Compressed */}
      <div className="relative bg-[#0A1128] overflow-hidden pt-10 pb-20 sm:pt-14 sm:pb-24 text-white rounded-b-[2.5rem] shadow-xl">
        <PatternSadu color="#F0A03C" opacity={0.15} />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A1128] to-transparent opacity-80" />
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge className="bg-primary/20 text-primary border-primary/30 mb-4 font-semibold uppercase tracking-widest text-xs px-3 py-1">
            {t('home.ledgerLabel')}
          </Badge>
          <h1 className="text-3xl sm:text-5xl md:text-5xl font-bold font-sans mb-6 leading-tight max-w-3xl mx-auto drop-shadow-lg">
            {t('home.greeting')}
          </h1>
          
          <div className="max-w-2xl mx-auto mb-8">
            <div 
              className="relative cursor-pointer group"
              onClick={handleSearchClick}
            >
              <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-lg group-hover:bg-primary/30 transition-all duration-300" />
              <div className="relative flex items-center h-14 bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 hover:border-primary/50 transition-all rounded-2xl px-5 overflow-hidden shadow-2xl">
                <SearchIcon className="text-primary w-5 h-5 shrink-0" />
                <span className="flex-1 text-left rtl:text-right px-4 text-white/60 text-base font-medium group-hover:text-white/90 transition-colors line-clamp-1">
                  {t('home.searchPlaceholder')}
                </span>
                <div className="bg-primary text-primary-foreground px-4 py-1.5 rounded-xl text-sm font-semibold shadow-md">
                  {t('home.searchButton')}
                </div>
              </div>
            </div>
          </div>
          
          {/* Main Action Cards inline with Hero */}
          <div className="max-w-3xl mx-auto text-left rtl:text-right mb-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-primary/80 px-2">
              {t('home.bookNowLabel')}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4 max-w-3xl mx-auto">
            <button 
              onClick={() => navigate('/camps')}
              className="relative group overflow-hidden rounded-2xl h-36 bg-white/10 backdrop-blur-md border border-white/20 hover:border-primary/50 hover:bg-white/15 transition-all shadow-md text-left rtl:text-right"
            >
              <div className="absolute top-4 left-4 rtl:left-auto rtl:right-4">
                <div className="p-2 bg-primary/20 rounded-xl text-primary w-10 h-10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Tent className="w-5 h-5" />
                </div>
              </div>
              <div className="absolute bottom-4 left-4 rtl:left-auto rtl:right-4">
                <h3 className="text-xl font-bold font-sans mb-0.5 text-white">{t('listingType.camp.title')}</h3>
                <p className="text-white/70 text-xs font-medium tabular-nums">{loading ? '—' : t('home.campsAvailable', { count: campCount })}</p>
              </div>
            </button>

            <button 
              onClick={() => navigate('/kashtas')}
              className="relative group overflow-hidden rounded-2xl h-36 bg-white/10 backdrop-blur-md border border-white/20 hover:border-accent/50 hover:bg-white/15 transition-all shadow-md text-left rtl:text-right"
            >
              <div className="absolute top-4 left-4 rtl:left-auto rtl:right-4">
                <div className="p-2 bg-accent/20 rounded-xl text-accent w-10 h-10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Waves className="w-5 h-5" />
                </div>
              </div>
              <div className="absolute bottom-4 left-4 rtl:left-auto rtl:right-4">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <h3 className="text-xl font-bold font-sans text-white">{t('listingType.kashta.title')}</h3>
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
                <p className="text-white/70 text-xs font-medium tabular-nums">{loading ? '—' : t('home.kashtasAvailable', { count: kashtaCount })}</p>
              </div>
            </button>
          </div>
        </div>
      </div>
      
      {/* Season Status Band */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 relative z-20">
        <div className="bg-card/80 backdrop-blur-xl border border-border shadow-lg rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`relative flex items-center justify-center w-10 h-10 rounded-full ${isInSeason ? 'bg-emerald-500/20' : 'bg-muted'}`}>
              <div className={`w-3 h-3 rounded-full ${isInSeason ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground'}`} />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm sm:text-base">
                {isInSeason ? t('home.seasonOpenLabel', { range: seasonRange }) : t('home.seasonClosedLabel', { month: nextOpenMonth })}
              </p>
              {!isInSeason && (
                <p className="text-xs text-muted-foreground">{t('home.seasonClosedNote')}</p>
              )}
            </div>
          </div>
          <Button variant="ghost" className="text-primary hover:text-primary/80 font-semibold text-sm" onClick={handleSearchClick}>
            {t('home.browseAll')} <ArrowRight className="w-4 h-4 ltr:ml-2 rtl:mr-2 rtl:rotate-180" />
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1 w-full space-y-16">

        {/* M-5: inline error state with retry — never a silently empty home */}
        {!loading && campsError && (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center">
            <p className="text-foreground font-semibold mb-3">{t('home.loadErrorTitle')}</p>
            <button
              onClick={() => loadCamps()}
              className="inline-flex items-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              {t('home.loadErrorRetry')}
            </button>
          </div>
        )}

        {/* Browse by Equipment (New) */}
        {(loading || topAmenities.length > 0) && (
          <section>
            <div className="mb-6">
              <h2 className="text-2xl font-bold font-sans">{t('home.amenityTitle')}</h2>
              <p className="text-muted-foreground mt-1">{t('home.amenitySubtitle')}</p>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-28 rounded-2xl bg-muted animate-pulse" />
                ))
              ) : (
                topAmenities.map(([name, count]) => (
                  <button
                    key={name}
                    onClick={() => navigate(`/search?amenities=${encodeURIComponent(name)}&ts=${Date.now()}`)}
                    className="flex flex-col items-center justify-center p-4 rounded-2xl bg-card border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all group text-center shadow-sm hover:shadow-md"
                  >
                    <div className="text-muted-foreground group-hover:text-primary mb-3 transition-colors">
                      {getAmenityIcon(name)}
                    </div>
                    <span className="text-xs font-semibold text-foreground mb-1 line-clamp-1 w-full">
                      {t(`amenityNames.${name}`, name)}
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {count}
                    </span>
                  </button>
                ))
              )}
            </div>
          </section>
        )}

        {/* Marketplace: Food */}
        <section>
          <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold font-sans">{t('home.hungryTitle')}</h2>
              <p className="text-muted-foreground mt-1">{t('home.hungrySubtitle')}</p>
            </div>
            <Badge variant="outline" className="w-fit text-xs px-3 py-1 font-medium bg-background text-muted-foreground">
              {t('home.marketplaceNote')}
            </Badge>
          </div>
          <div className="flex overflow-x-auto gap-4 pb-6 px-1 -mx-1 snap-x scrollbar-hide">
            {foodItems.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => setSelectedMarketItem(item)}
                className="group cursor-pointer min-w-[260px] md:min-w-[300px] shrink-0 snap-start bg-card border border-border/50 hover:border-primary/50 rounded-3xl overflow-hidden transition-all duration-300 hover:shadow-lg flex flex-col text-left rtl:text-right focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <div className="relative h-48 overflow-hidden bg-muted">
                  <img src={item.image} alt={isRTL ? item.nameAr : item.nameEn} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute top-3 right-3 rtl:right-auto rtl:left-3">
                    <Badge className="bg-background/80 backdrop-blur-md text-foreground border-none font-semibold shadow-sm">
                      {t('home.itemSoonChip')}
                    </Badge>
                  </div>
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="font-bold text-lg mb-1">{isRTL ? item.nameAr : item.nameEn}</h3>
                  <div className="mt-auto pt-4 flex items-baseline gap-1">
                    <span className="font-bold font-display text-xl text-primary tabular-nums">{item.price} {t('common.currency')}</span>
                    <span className="text-sm text-muted-foreground font-medium">/ {isRTL ? item.unitAr : item.unitEn}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Marketplace: Supplies */}
        <section>
          <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold font-sans">{t('home.suppliesTitle')}</h2>
              <p className="text-muted-foreground mt-1">{t('home.suppliesSubtitle')}</p>
            </div>
            <Badge variant="outline" className="w-fit text-xs px-3 py-1 font-medium bg-background text-muted-foreground">
              {t('home.marketplaceNote')}
            </Badge>
          </div>
          <div className="flex overflow-x-auto gap-4 pb-6 px-1 -mx-1 snap-x scrollbar-hide">
            {suppliesItems.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => setSelectedMarketItem(item)}
                className="group cursor-pointer min-w-[260px] md:min-w-[300px] shrink-0 snap-start bg-card border border-border/50 hover:border-primary/50 rounded-3xl overflow-hidden transition-all duration-300 hover:shadow-lg flex flex-col text-left rtl:text-right focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <div className="relative h-48 overflow-hidden bg-muted">
                  <img src={item.image} alt={isRTL ? item.nameAr : item.nameEn} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute top-3 right-3 rtl:right-auto rtl:left-3">
                    <Badge className="bg-background/80 backdrop-blur-md text-foreground border-none font-semibold shadow-sm">
                      {t('home.itemSoonChip')}
                    </Badge>
                  </div>
                  <div className="absolute top-3 left-3 rtl:left-auto rtl:right-3">
                    <Badge variant="secondary" className="bg-secondary/90 backdrop-blur-sm font-medium">
                      {item.category === 'firewood' ? t('home.serviceFirewood') : t('home.serviceGear')}
                    </Badge>
                  </div>
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="font-bold text-lg mb-1">{isRTL ? item.nameAr : item.nameEn}</h3>
                  <div className="mt-auto pt-4 flex items-baseline gap-1">
                    <span className="font-bold font-display text-xl text-primary tabular-nums">{item.price} {t('common.currency')}</span>
                    <span className="text-sm text-muted-foreground font-medium">/ {isRTL ? item.unitAr : item.unitEn}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Marketplace category quick links — below camp discovery */}
        <section>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {([
              { cat: 'food', Icon: UtensilsCrossed, label: t('home.serviceCampFood') },
              { cat: 'firewood', Icon: Flame, label: t('home.serviceFirewood') },
              { cat: 'gear', Icon: ShoppingBag, label: t('home.serviceGear') },
            ] as const).map(({ cat, Icon, label }) => (
              <button
                key={cat}
                type="button"
                onClick={() => navigate(`/market?cat=${cat}`)}
                className="group flex items-center gap-4 rounded-3xl bg-card border border-border/50 hover:border-primary/50 p-5 shadow-sm hover:shadow-md transition-all text-left rtl:text-right focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <span className="h-12 w-12 shrink-0 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                  <Icon className="w-6 h-6 text-primary" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold">{label}</span>
                  <span className="block text-xs text-muted-foreground mt-0.5">{t('home.marketplaceNote')}</span>
                </span>
                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary rtl:rotate-180 shrink-0 transition-colors" />
              </button>
            ))}
          </div>
        </section>

        {/* How it works Band */}
        <section className="bg-primary/5 rounded-3xl p-8 border border-primary/10">
          <h2 className="text-2xl font-bold font-sans text-center mb-8">{t('home.howTitle')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center px-4">
              <div className="w-16 h-16 mx-auto bg-primary/20 rounded-full flex items-center justify-center mb-4 text-primary">
                <SearchIcon className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold font-sans mb-2">{t('home.how1Title')}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{t('home.how1Text')}</p>
            </div>
            <div className="text-center px-4">
              <div className="w-16 h-16 mx-auto bg-primary/20 rounded-full flex items-center justify-center mb-4 text-primary">
                <CalendarCheck className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold font-sans mb-2">{t('home.how2Title')}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{t('home.how2Text')}</p>
            </div>
            <div className="text-center px-4">
              <div className="w-16 h-16 mx-auto bg-primary/20 rounded-full flex items-center justify-center mb-4 text-primary">
                <Flame className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold font-sans mb-2">{t('home.how3Title')}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{t('home.how3Text')}</p>
            </div>
          </div>
        </section>

        {/* Featured / Top Rated */}
        {!loading && topRatedCamp && (
          <section>
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-2xl font-bold font-sans">{t('home.tonightsPick')}</h2>
              <div className="h-px flex-1 bg-border/60" />
            </div>
            
            {(() => {
              const camp = topRatedCamp;
              const campAny = camp as any;
              const listingType = (campAny.listingType || 'camp') as ListingType;

              if (listingType === 'kashta') {
                return (
                  <div className="max-w-md mx-auto md:max-w-none md:w-full lg:w-2/3">
                    <KashtaListingCard
                      listing={{
                        id: camp.id,
                        title: camp.title,
                        description: camp.description || '',
                        location: camp.location,
                        latitude: 0,
                        longitude: 0,
                        price: camp.price,
                                  weekendPrice: camp.weekendPrice,
                                  holidayPrice: camp.holidayPrice,
                        images: camp.photo ? [{ id: camp.id, url: camp.photo, isMain: true }] : [],
                        status: 'active',
                        hostId: camp.hostId || '',
                        hostName: camp.hostName || '',
                        maxGuests: camp.maxGuests,
                        checkInTime: camp.checkInTime || '15:00',
                        checkOutTime: camp.checkOutTime || '11:00',
                        rules: '',
                        specialFeatures: '',
                        createdAt: camp.createdAt || new Date().toISOString(),
                        listingType: 'kashta',
                        seatingCapacity: campAny.seatingCapacity ?? 10,
                        beachfrontAccess: campAny.beachfrontAccess ?? false,
                        shadeType: campAny.shadeType,
                        viewType: campAny.viewType,
                        waterActivities: campAny.waterActivities ?? [],
                        kashtaAmenities: camp.amenities || [],
                        rating: camp.averageRating,
                        reviewCount: camp.reviewCount,
                        cancellationPolicy: campAny.cancellationPolicy ?? { type: 'full_refundable' as const },
                        views: campAny.views
                      }}
                      onClick={() => handleCampClick(camp.id)}
                    />
                  </div>
                );
              }

              return (
                <Card
                  className="group cursor-pointer overflow-hidden bg-card/60 border border-primary/20 hover:border-primary/50 transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_8px_30px_rgba(0,0,0,0.5)] backdrop-blur-sm md:grid md:grid-cols-5 rounded-3xl"
                  onClick={() => handleCampClick(camp.id)}
                >
                  <div className="relative h-72 md:h-full md:col-span-3 overflow-hidden rounded-t-3xl md:rounded-tr-none md:rounded-l-3xl rtl:md:rounded-tr-3xl rtl:md:rounded-l-none rtl:md:rounded-r-3xl">
                    <img
                      src={camp.photo}
                      alt={camp.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-in-out"
                      onError={(e) => {
                        e.currentTarget.src = 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/10 to-transparent md:bg-gradient-to-r opacity-80" />

                    <div className="absolute top-4 right-4 flex gap-2 items-center rtl:right-auto rtl:left-4 z-20">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          toggleFavorite(camp.id);
                        }}
                        aria-pressed={isFavorite(camp.id)}
                        aria-label={t('campDetails.favoriteLabel', 'Save to favourites')}
                        className="p-1.5 rounded-full bg-background/50 backdrop-blur-md border border-border/50 hover:bg-background transition-colors"
                      >
                        <Heart aria-hidden="true" className={`w-5 h-5 transition-colors ${isFavorite(camp.id) ? 'fill-red-500 text-red-500' : 'text-foreground'}`} />
                      </button>
                      {(camp.refundPolicy === 'refundable' || camp.refundPolicy === 'non-refundable') && (
                        <RefundPolicyBadge policy={camp.refundPolicy} />
                      )}
                    </div>
                    <div className="absolute top-4 left-4 rtl:left-auto rtl:right-4 flex gap-2">
                      <Badge className="bg-primary/90 text-primary-foreground backdrop-blur-sm font-semibold px-3 py-1 border border-primary/20 rounded-xl">
                        <Tent className="w-4 h-4 mr-1" />
                        {t('listingType.camp.badge')}
                      </Badge>
                    </div>
                  </div>

                  <div className="p-6 md:p-8 relative md:col-span-2 flex flex-col justify-center">
                    <div className="flex items-center text-muted-foreground text-sm font-medium mb-3">
                      <MapPin className="w-4 h-4 mr-2 text-primary" />
                      {camp.location}
                    </div>
                    <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-3 line-clamp-2 group-hover:text-primary transition-colors font-sans">
                      {camp.title}
                    </h3>

                    <div className="flex items-center gap-2 mb-4">
                      <RatingStars rating={camp.averageRating || 0} size="lg" />
                      <span className="text-base font-medium text-muted-foreground">
                        ({t('home.reviewCount', { count: camp.reviewCount || 0 })})
                      </span>
                    </div>

                    <div className="flex items-center gap-6 text-base text-muted-foreground mb-5 font-medium">
                      <div className="flex items-center">
                        <Users className="w-5 h-5 mr-2 text-primary" />
                        {t('home.upToGuests', { count: camp.maxGuests })}
                      </div>
                      <div className="flex items-center">
                        <Tent className="w-5 h-5 mr-2 text-primary" />
                        {t('home.tentsCount', { count: getTotalTents(camp.tentConfiguration) })}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-5 border-t border-border/50">
                      <div>
                        {hasPeakPricing(camp) && (
                          <span className="text-base text-muted-foreground mr-1 font-medium lowercase">{t('common.from')}</span>
                        )}
                        <span className="text-3xl font-bold text-primary font-display tracking-tight tabular-nums">
                          {hasPeakPricing(camp) ? getStartingRate(camp) : camp.price} BHD
                        </span>
                        <span className="text-base text-muted-foreground ml-2 font-medium">{t('home.perDay')}</span>
                      </div>
                      <Button
                        size="lg"
                        className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-11 px-6 shadow-[0_0_15px_rgba(212,175,55,0.2)] rounded-2xl"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCampClick(camp.id);
                        }}
                      >
                        {t('home.viewDetails')}
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })()}
          </section>
        )}

        {/* Your Favorites */}
        {!loading && favoriteCamps.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Heart className="w-6 h-6 text-red-500 fill-red-500" />
                <h2 className="text-2xl font-bold font-sans">{t('home.yourFavorites')}</h2>
              </div>
              <Button variant="ghost" className="text-primary hover:text-primary/80 font-medium" onClick={() => navigate(`/search?favorites=1&ts=${Date.now()}`)}>
                {t('home.browseAll')} <ArrowRight className="w-4 h-4 ltr:ml-2 rtl:mr-2 rtl:rotate-180" />
              </Button>
            </div>
            
            <div className="flex overflow-x-auto gap-6 pb-6 px-1 -mx-1 snap-x scrollbar-hide">
              {favoriteCamps.map((camp) => {
                const campAny = camp as any;
                const listingType = (campAny.listingType || 'camp') as ListingType;
                
                if (listingType === 'kashta') {
                  return (
                    <div key={camp.id} className="min-w-[320px] md:min-w-[380px] shrink-0 snap-start">
                      <KashtaListingCard
                        listing={{
                          id: camp.id,
                          title: camp.title,
                          description: camp.description || '',
                          location: camp.location,
                          latitude: 0,
                          longitude: 0,
                          price: camp.price,
                                  weekendPrice: camp.weekendPrice,
                                  holidayPrice: camp.holidayPrice,
                          images: camp.photo ? [{ id: camp.id, url: camp.photo, isMain: true }] : [],
                          status: 'active',
                          hostId: camp.hostId || '',
                          hostName: camp.hostName || '',
                          maxGuests: camp.maxGuests,
                          checkInTime: camp.checkInTime || '15:00',
                          checkOutTime: camp.checkOutTime || '11:00',
                          rules: '',
                          specialFeatures: '',
                          createdAt: camp.createdAt || new Date().toISOString(),
                          listingType: 'kashta',
                          seatingCapacity: campAny.seatingCapacity ?? 10,
                          beachfrontAccess: campAny.beachfrontAccess ?? false,
                          shadeType: campAny.shadeType,
                          viewType: campAny.viewType,
                          waterActivities: campAny.waterActivities ?? [],
                          kashtaAmenities: camp.amenities || [],
                          rating: camp.averageRating,
                          reviewCount: camp.reviewCount,
                          cancellationPolicy: campAny.cancellationPolicy ?? { type: 'full_refundable' as const },
                          views: campAny.views
                        }}
                        onClick={() => handleCampClick(camp.id)}
                      />
                    </div>
                  );
                }
                
                return (
                  <div key={camp.id} className="min-w-[320px] md:min-w-[380px] shrink-0 snap-start">
                    <Card
                      className="group cursor-pointer overflow-hidden bg-card/60 border border-border/50 hover:border-primary/50 transition-all duration-500 hover:shadow-[0_8px_30px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)] hover:-translate-y-1 backdrop-blur-sm relative rounded-3xl h-full flex flex-col"
                      onClick={() => handleCampClick(camp.id)}
                    >
                      <div className="relative h-64 overflow-hidden rounded-t-3xl shrink-0">
                      <img
                        src={camp.photo}
                        alt={camp.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-in-out"
                        onError={(e) => {
                          e.currentTarget.src = 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800';
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent opacity-80" />
                      
                      <div className="absolute top-4 right-4 flex gap-2 items-center rtl:right-auto rtl:left-4 z-20">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            toggleFavorite(camp.id);
                          }}
                          aria-pressed={isFavorite(camp.id)}
                          aria-label={t('campDetails.favoriteLabel', 'Save to favourites')}
                          className="p-1.5 rounded-full bg-background/50 backdrop-blur-md border border-border/50 hover:bg-background transition-colors"
                        >
                          <Heart aria-hidden="true" className={`w-5 h-5 transition-colors ${isFavorite(camp.id) ? 'fill-red-500 text-red-500' : 'text-foreground'}`} />
                        </button>
                        {(camp.refundPolicy === 'refundable' || camp.refundPolicy === 'non-refundable') && (
                          <RefundPolicyBadge policy={camp.refundPolicy} />
                        )}
                      </div>
                      
                      <div className="absolute top-4 left-4 rtl:left-auto rtl:right-4 flex gap-2">
                        <Badge className="bg-primary/90 text-primary-foreground backdrop-blur-sm font-semibold px-3 py-1 border border-primary/20 rounded-xl">
                          <Tent className="w-4 h-4 mr-1" />
                          {t('listingType.camp.badge')}
                        </Badge>
                      </div>

                      <div className="absolute bottom-4 left-4 right-4">
                        <div className="flex items-center text-white text-base font-semibold drop-shadow-md">
                          <MapPin className="w-5 h-5 mr-2 text-primary" />
                          {camp.location}
                        </div>
                      </div>
                    </div>

                    <div className="p-6 relative flex-1 flex flex-col">
                      <h3 className="text-xl font-bold text-foreground mb-3 line-clamp-2 group-hover:text-primary transition-colors font-sans">
                        {camp.title}
                      </h3>

                      <div className="flex items-center gap-2 mb-4">
                        <RatingStars rating={camp.averageRating || 0} size="lg" />
                        <span className="text-base font-medium text-muted-foreground">
                          ({t('home.reviewCount', { count: camp.reviewCount || 0 })})
                        </span>
                      </div>

                      <div className="flex items-center gap-6 text-base text-muted-foreground mb-5 font-medium">
                        <div className="flex items-center">
                          <Users className="w-5 h-5 mr-2 text-primary" />
                          {t('home.upToGuests', { count: camp.maxGuests })}
                        </div>
                        <div className="flex items-center">
                          <Tent className="w-5 h-5 mr-2 text-primary" />
                          {t('home.tentsCount', { count: getTotalTents(camp.tentConfiguration) })}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-5 mt-auto border-t border-border/50">
                        <div>
                          {hasPeakPricing(camp) && (
                            <span className="text-base text-muted-foreground mr-1 font-medium lowercase">{t('common.from')}</span>
                          )}
                          <span className="text-3xl font-bold text-primary font-display tracking-tight tabular-nums">
                            {hasPeakPricing(camp) ? getStartingRate(camp) : camp.price} BHD
                          </span>
                          <span className="text-base text-muted-foreground ml-2 font-medium">{t('home.perDay')}</span>
                        </div>
                        <Button 
                          size="lg"
                          className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-11 px-6 shadow-[0_0_15px_rgba(212,175,55,0.2)] rounded-2xl"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCampClick(camp.id);
                          }}
                        >
                          {t('home.viewDetails')}
                        </Button>
                      </div>
                    </div>
                  </Card>
                </div>
              );
            })}
          </div>
        </section>
        )}
        {/* Popular Picks */}
        {!loading && trending.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-2xl font-bold font-sans">{t('home.popularPicksTitle')}</h2>
              <div className="h-px flex-1 bg-border/60" />
            </div>
            <div className="flex overflow-x-auto gap-5 pb-4 px-1 -mx-1 snap-x scrollbar-hide">
              {trending.map((camp) => (
                <button
                  key={camp.id}
                  onClick={() => handleCampClick(camp.id)}
                  type="button"
                  className="group min-w-[220px] md:min-w-[260px] shrink-0 snap-start rounded-3xl bg-card border border-border/50 hover:border-primary/50 overflow-hidden transition-all duration-300 hover:shadow-lg flex flex-col text-left rtl:text-right focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  <div className="relative h-36 overflow-hidden rounded-t-3xl">
                    {camp.photo ? (
                      <img
                        src={camp.photo}
                        alt={camp.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=400'; }}
                      />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <Tent className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
                  </div>
                  <div className="p-4 flex-1 flex flex-col">
                    <p className="font-bold text-sm line-clamp-2 mb-1">{camp.title}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                      <MapPin className="w-3 h-3 shrink-0" />{camp.location}
                    </p>
                    {(camp.averageRating || 0) > 0 && (
                      <div className="mt-auto">
                        <RatingStars rating={camp.averageRating || 0} size="sm" showValue />
                      </div>
                    )}
                    <p className="text-xs font-bold text-primary mt-2">
                      {hasPeakPricing(camp) && (
                        <span className="font-normal text-muted-foreground lowercase">{t('common.from')} </span>
                      )}
                      {hasPeakPricing(camp) ? getStartingRate(camp) : camp.price} <span className="font-normal text-muted-foreground">{t('campDetails.pricePerDay')}</span>
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Host CTA Band */}
        <section className="bg-primary text-primary-foreground rounded-3xl p-8 sm:p-12 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8 mt-4">
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <PatternSadu color="#ffffff" opacity={1} />
          </div>
          <div className="relative z-10 text-center md:text-left rtl:md:text-right max-w-2xl">
            <h2 className="text-3xl font-bold font-sans mb-3 text-white">{t('home.hostCtaTitle')}</h2>
            <p className="text-primary-foreground/80 text-lg leading-relaxed">{t('home.hostCtaText')}</p>
          </div>
          <div className="relative z-10 w-full md:w-auto shrink-0">
            <Button 
              size="lg" 
              onClick={() => navigate('/host')}
              className="w-full md:w-auto bg-white text-primary hover:bg-white/90 text-lg font-bold h-14 px-8 rounded-2xl shadow-xl transition-all hover:scale-105"
            >
              {t('home.hostCtaButton')}
            </Button>
          </div>
        </section>
      </div>

      <MarketItemDialog item={selectedMarketItem} onClose={() => setSelectedMarketItem(null)} />
    </div>
  );
}
