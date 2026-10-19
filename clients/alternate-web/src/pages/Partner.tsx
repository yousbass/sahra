import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Tent, Store, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-10">
        <Button
          variant="ghost"
          onClick={goBack}
          className="mb-6 -ml-2 rtl:ml-0 rtl:-mr-2 gap-2 font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
          {t('partner.back') || 'Back'}
        </Button>

        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold font-sans">
            {t('partner.title') || 'Partner with MUKHYMAT'}
          </h1>
          <p className="text-muted-foreground mt-2 text-lg max-w-xl">
            {t('partner.subtitle') ||
              'Join the platform as a host or a marketplace seller.'}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {/* Host door */}
          <div className="bg-card border border-border/50 rounded-3xl p-6 sm:p-8 flex flex-col">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Tent className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-2xl font-bold font-sans mb-2">
              {t('partner.hostTitle') || 'Become a Host'}
            </h2>
            <p className="text-muted-foreground mb-4">
              {t('partner.hostText') ||
                'Own a desert camp or a beachfront kashta? List it and welcome guests all season.'}
            </p>
            <ul className="space-y-2 mb-6">
              {hostPoints.map((point) => (
                <li key={point} className="flex items-start gap-2 text-sm text-foreground/90">
                  <CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  {point}
                </li>
              ))}
            </ul>
            <Button
              onClick={() => navigate('/become-host')}
              className="mt-auto w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold rounded-xl"
            >
              {t('partner.hostCta') || 'Apply as a host'}
            </Button>
          </div>

          {/* Seller door */}
          <div className="bg-card border border-border/50 rounded-3xl p-6 sm:p-8 flex flex-col">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Store className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-2xl font-bold font-sans mb-2">
              {t('partner.sellerTitle') || 'Become a Seller'}
            </h2>
            <p className="text-muted-foreground mb-4">
              {t('partner.sellerText') ||
                'Sell camp food, firewood, or camping gear to guests browsing the marketplace.'}
            </p>
            <ul className="space-y-2 mb-6">
              {sellerPoints.map((point) => (
                <li key={point} className="flex items-start gap-2 text-sm text-foreground/90">
                  <CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  {point}
                </li>
              ))}
            </ul>
            <Button
              onClick={() => navigate('/become-seller')}
              className="mt-auto w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold rounded-xl"
            >
              {t('partner.sellerCta') || 'Apply as a seller'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
