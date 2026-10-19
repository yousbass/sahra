import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, SlidersHorizontal, Tent, Waves } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getCampsWithFilters } from '@/lib/firestore';
import { LegacyCamp, normalizeCampToLegacy } from '@/lib/dataCompatibility';
import { BrowseCard } from '@/components/BrowseCard';

// Dedicated browse sections for the two booking types. Same data source as
// Search, but presented as a standalone destination (Talabat-style vertical),
// not a pre-filtered search state.
export default function TypeBrowse({ type }: { type: 'camp' | 'kashta' }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [camps, setCamps] = useState<LegacyCamp[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const results = await getCampsWithFilters({
          priceRange: [0, 1000],
          locations: [],
          minGuests: 1,
          amenities: [],
          tentTypes: [],
          minRating: 0,
          sortBy: 'rating',
          listingType: type,
        });
        if (cancelled) return;
        const legacy: LegacyCamp[] = [];
        for (const c of results || []) {
          try {
            legacy.push(normalizeCampToLegacy(c));
          } catch (e) {
            console.warn('[TypeBrowse] Skipping listing that failed normalization:', e);
          }
        }
        setCamps(legacy);
      } catch (e) {
        console.error('[TypeBrowse] Failed to load listings:', e);
        if (!cancelled) setCamps([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [type]);

  const goBack = () => {
    if (window.history.state && window.history.state.idx > 0) navigate(-1);
    else navigate('/');
  };

  const isCamp = type === 'camp';
  const n = camps.length;
  const countKey = isCamp ? 'home.campsAvailable' : 'home.kashtasAvailable';

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
            <div className="flex items-center gap-3">
              <span
                className={`p-2.5 rounded-2xl w-11 h-11 flex items-center justify-center ${
                  isCamp ? 'bg-primary/10 text-primary' : 'bg-accent/10 text-accent'
                }`}
              >
                {isCamp ? <Tent className="w-5 h-5" /> : <Waves className="w-5 h-5" />}
              </span>
              <h1 className="text-3xl sm:text-4xl font-bold font-sans">
                {isCamp ? t('home.campsPageTitle') : t('home.kashtasPageTitle')}
              </h1>
            </div>
            <p className="text-muted-foreground mt-2 text-lg">
              {isCamp ? t('home.campsPageSubtitle') : t('home.kashtasPageSubtitle')}
            </p>
            {!isCamp && (
              <p className="text-muted-foreground/70 mt-1 text-sm italic">
                {t('home.kashtaWhatIs')}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="outline"
              className="w-fit text-xs px-3 py-1 font-medium bg-background text-muted-foreground tabular-nums"
            >
              {loading ? '—' : t(countKey, { count: n })}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/search?type=${type}&ts=${Date.now()}`)}
              className="gap-1.5 font-semibold text-muted-foreground hover:text-foreground"
            >
              <SlidersHorizontal className="w-4 h-4" />
              {t('home.browseFilters')}
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-3xl border border-border/50 overflow-hidden">
                <div className="h-44 bg-secondary animate-pulse" />
                <div className="p-4">
                  <div className="h-4 w-3/4 rounded bg-secondary animate-pulse" />
                  <div className="h-3.5 w-1/2 mt-2.5 rounded bg-secondary animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : n > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {camps.map((camp) => (
              <BrowseCard
                key={camp.id}
                camp={camp}
                onClick={() =>
                  navigate(`/camp/${camp.id}`, { state: { from: isCamp ? '/camps' : '/kashtas' } })
                }
              />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-border bg-card/60 backdrop-blur-sm p-8 sm:p-12 text-center max-w-lg mx-auto mt-4">
            <span
              className={`mx-auto w-14 h-14 rounded-2xl flex items-center justify-center ${
                isCamp ? 'bg-primary/10 text-primary' : 'bg-accent/10 text-accent'
              }`}
            >
              {isCamp ? <Tent className="w-7 h-7" /> : <Waves className="w-7 h-7" />}
            </span>
            <h2 className="mt-4 text-xl font-bold font-sans text-foreground">
              {isCamp ? t('home.noCampsTitle') : t('home.noKashtasTitle')}
            </h2>
            <p className="mt-2 text-muted-foreground">
              {isCamp ? t('home.noCampsBrowse') : t('home.noKashtasText')}
            </p>
            <Button
              onClick={() => navigate('/become-host')}
              className="mt-6 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-2xl px-6"
            >
              {t('home.hostCtaButton')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
