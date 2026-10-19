import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

export default function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center desert-bg p-6 text-center">
      <div className="space-y-6 max-w-md">
        <div className="space-y-3">
          <h1 className="font-display text-8xl font-bold text-primary">{t('notFound.title')}</h1>
          <h2 className="text-2xl font-semibold text-foreground">{t('notFound.heading')}</h2>
          <p className="text-muted-foreground">{t('notFound.description')}</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild>
            <Link to="/">{t('notFound.returnHome')}</Link>
          </Button>
          <Button variant="outline" onClick={() => window.history.back()}>
            {t('notFound.goBack')}
          </Button>
        </div>
      </div>
    </div>
  );
}