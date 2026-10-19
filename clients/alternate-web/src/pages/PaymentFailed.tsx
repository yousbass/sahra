/**
 * Payment Failed Page
 * Displays error message when payment fails
 */

import { useNavigate, useSearchParams } from 'react-router-dom';
import { XCircle, AlertTriangle, CreditCard, Phone, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { config } from '@/lib/config';
import { useTranslation } from 'react-i18next';

export default function PaymentFailed() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const error = searchParams.get('error') || t('paymentFailed.desc');
  const bookingId = searchParams.get('bookingId');

  return (
    <div className="min-h-screen desert-gradient py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Card className="modern-card p-8 md:p-12 text-center space-y-8">
          <div className="flex justify-center">
            <div className="rounded-full bg-red-500/10 border border-red-500/20 p-4">
              <XCircle className="h-16 w-16 text-red-400" />
            </div>
          </div>
          
          <div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-3">{t('paymentFailed.title')}</h1>
            <p className="text-lg text-muted-foreground">
              {t('paymentFailed.desc')}
            </p>
          </div>

          <Alert variant="destructive" className="border-red-500/20 bg-red-500/10 text-left">
            <AlertTriangle className="h-5 w-5" />
            <AlertDescription className="text-red-400 font-medium">{error}</AlertDescription>
          </Alert>

          <div className="glass-card p-6 md:p-8 rounded-xl text-left space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <h2 className="font-bold text-lg text-foreground">{t('paymentFailed.commonIssues')}</h2>
            </div>
            <ul className="space-y-2 text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">•</span>
                <span>{t('paymentFailed.issues.insufficient')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">•</span>
                <span>{t('paymentFailed.issues.declined')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">•</span>
                <span>{t('paymentFailed.issues.incorrect')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">•</span>
                <span>{t('paymentFailed.issues.expired')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">•</span>
                <span>{t('paymentFailed.issues.auth')}</span>
              </li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            {bookingId && (
              <Button 
                onClick={() => navigate(`/bookings`)} 
                className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
                size="lg"
              >
                {t('paymentFailed.tryAgain')}
              </Button>
            )}
            <Button 
              onClick={() => navigate('/')} 
              variant="outline"
              className="border-border hover:bg-secondary font-semibold"
              size="lg"
            >
              {t('paymentFailed.backHome')}
            </Button>
          </div>

          <div className="pt-6 border-t border-border space-y-3">
            <p className="text-sm font-semibold text-foreground">{t('paymentFailed.needHelp')}</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center text-sm">
              <a 
                href={`mailto:${config.supportEmail}`}
                className="flex items-center gap-2 text-primary hover:underline font-medium"
              >
                <Mail className="h-4 w-4" />
                {config.supportEmail}
              </a>
              <a 
                href={`tel:${config.supportPhone.replace(/\s/g, '')}`}
                className="flex items-center gap-2 text-primary hover:underline font-medium"
              >
                <Phone className="h-4 w-4" />
                {config.supportPhone}
              </a>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
