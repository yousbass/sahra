import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, SlidersHorizontal, Tent, Waves } from 'lucide-react';
import { PatternSadu } from '@/components/BackgroundPatterns';
import { getCampsWithFilters } from '@/lib/firestore';
import { LegacyCamp, normalizeCampToLegacy } from '@/lib/dataCompatibility';
import { MiniCard } from '@/components/MiniCard';

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
          <div className="mt-4 flex items-center gap-3">
            <span
              className={`h-11 w-11 rounded-full flex items-center justify-center shrink-0 ${
                isCamp ? 'bg-white/10 border border-white/15' : 'bg-accent'
              }`}
            >
              {isCamp ? (
                <Tent className="w-5 h-5 text-primary" />
              ) : (
                <Waves className="w-5 h-5 text-white" />
              )}
            </span>
            <h1 className="text-3xl sm:text-4xl font-bold text-white">
              {isCamp ? t('home.campsPageTitle') : t('home.kashtasPageTitle')}
            </h1>
          </div>
          <p className="mt-2 text-white/70 text-sm sm:text-base max-w-xl">
            {isCamp ? t('home.campsPageSubtitle') : t('home.kashtasPageSubtitle')}
          </p>
          {!isCamp && (
            <p className="mt-1 text-white/55 text-xs sm:text-sm max-w-xl italic">
              {t('home.kashtaWhatIs')}
            </p>
          )}
          <div className="mt-4 flex items-center gap-3 flex-wrap">
            <span className="text-white/80 text-sm tabular-nums">
              {loading ? '—' : t(countKey, { count: n })}
            </span>
            <button
              onClick={() => navigate(`/search?type=${type}&ts=${Date.now()}`)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-white/10 border border-white/15 rounded-full px-3 py-1.5 hover:bg-white/15 transition-colors"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              {t('home.browseFilters')}
            </button>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i}>
                <div className="h-40 rounded-xl bg-gray-100 animate-pulse" />
                <div className="h-3.5 w-3/4 mt-3 rounded bg-gray-100 animate-pulse" />
                <div className="h-3 w-1/2 mt-2 rounded bg-gray-100 animate-pulse" />
              </div>
            ))}
          </div>
        ) : n > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {camps.map((camp) => (
              <MiniCard
                key={camp.id}
                camp={camp}
                onClick={() =>
                  navigate(`/camp/${camp.id}`, { state: { from: isCamp ? '/camps' : '/kashtas' } })
                }
              />
            ))}
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-2xl p-8 sm:p-10 text-center max-w-md mx-auto mt-6">
            <span
              className={`mx-auto h-14 w-14 rounded-full flex items-center justify-center ${
                isCamp ? 'bg-secondary text-primary' : 'bg-accent/10 text-accent'
              }`}
            >
              {isCamp ? <Tent className="w-7 h-7" /> : <Waves className="w-7 h-7" />}
            </span>
            <h2 className="mt-4 text-lg font-bold text-gray-900">
              {isCamp ? t('home.noCampsTitle') : t('home.noKashtasTitle')}
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              {isCamp ? t('home.noCampsBrowse') : t('home.noKashtasText')}
            </p>
            <button
              onClick={() => navigate('/become-host')}
              className="mt-5 inline-flex items-center justify-center bg-primary text-[#0A1128] font-semibold rounded-full px-5 py-2.5 text-sm hover:opacity-90 transition-opacity"
            >
              {t('home.hostCtaButton')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
