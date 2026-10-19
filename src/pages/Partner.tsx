import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Tent, Store, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PatternSadu } from '@/components/BackgroundPatterns';

/** Two doors into the platform: list a camp/kashta as a host, or sell products on the marketplace. */
export default function Partner() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const goBack = () => {
    if (window.history.state && window.history.state.idx > 0) navigate(-1);
    else navigate('/');
  };

  const hostPoints = [
    t('partner.hostPoint1') || 'List your camp or beachfront kashta',
    t('partner.hostPoint2') || 'Manage bookings and availability',
    t('partner.hostPoint3') || 'Get paid for every confirmed stay',
  ];

  const sellerPoints = [
    t('partner.sellerPoint1') || 'Show your food, firewood, or gear to campers',
    t('partner.sellerPoint2') || 'Manage your own shop and items',
    t('partner.sellerPoint3') || 'Reach guests planning their next trip',
  ];

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
            {t('partner.back') || 'Back'}
          </button>
          <h1 className="mt-4 text-3xl sm:text-4xl font-bold text-white">
            {t('partner.title') || 'Partner with MUKHYMAT'}
          </h1>
          <p className="mt-2 text-white/70 text-sm sm:text-base max-w-xl">
            {t('partner.subtitle') ||
              'Join the platform as a host or a marketplace seller.'}
          </p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="grid md:grid-cols-2 gap-5">
          {/* Host door */}
          <Card className="bg-white/95 backdrop-blur-sm border-border/80 p-6 sm:p-8 shadow-lg flex flex-col">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
              <Tent className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {t('partner.hostTitle') || 'Become a Host'}
            </h2>
            <p className="text-gray-700 mb-4">
              {t('partner.hostText') ||
                'Own a desert camp or a beachfront kashta? List it and welcome guests all season.'}
            </p>
            <ul className="space-y-2 mb-6">
              {hostPoints.map((point) => (
                <li key={point} className="flex items-start gap-2 text-sm text-gray-700">
                  <CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  {point}
                </li>
              ))}
            </ul>
            <Button
              onClick={() => navigate('/become-host')}
              className="mt-auto w-full h-11 bg-primary hover:bg-primary/90 text-[#0A1128] font-semibold lantern-halo"
            >
              {t('partner.hostCta') || 'Apply as a host'}
            </Button>
          </Card>

          {/* Seller door */}
          <Card className="bg-white/95 backdrop-blur-sm border-border/80 p-6 sm:p-8 shadow-lg flex flex-col">
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4">
              <Store className="w-6 h-6 text-accent" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {t('partner.sellerTitle') || 'Become a Seller'}
            </h2>
            <p className="text-gray-700 mb-4">
              {t('partner.sellerText') ||
                'Sell camp food, firewood, or camping gear to guests browsing the marketplace.'}
            </p>
            <ul className="space-y-2 mb-6">
              {sellerPoints.map((point) => (
                <li key={point} className="flex items-start gap-2 text-sm text-gray-700">
                  <CheckCircle className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                  {point}
                </li>
              ))}
            </ul>
            <Button
              onClick={() => navigate('/become-seller')}
              className="mt-auto w-full h-11 bg-primary hover:bg-primary/90 text-[#0A1128] font-semibold lantern-halo"
            >
              {t('partner.sellerCta') || 'Apply as a seller'}
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
