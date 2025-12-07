import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

export default function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50 p-6 text-center">
      <div className="space-y-6 max-w-md">
        <div className="space-y-3">
          <h1 className="text-8xl font-bold text-blue-600">{t('notFound.title')}</h1>
          <h2 className="text-2xl font-semibold text-gray-800">{t('notFound.heading')}</h2>
          <p className="text-muted-foreground">{t('notFound.description')}</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild>
            <a href="/">{t('notFound.returnHome')}</a>
          </Button>
          <Button variant="outline" onClick={() => window.history.back()}>
            {t('notFound.goBack')}
          </Button>
        </div>
      </div>
    </div>
  );
}