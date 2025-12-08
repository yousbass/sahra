import { useTranslation } from 'react-i18next';
import { Tent, Waves } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ListingType } from '@/types/listing';

interface ListingTypeSelectorProps {
  value: ListingType;
  onChange: (type: ListingType) => void;
  disabled?: boolean;
  variant?: 'cards' | 'tabs';
}

export function ListingTypeSelector({
  value,
  onChange,
  disabled = false,
  variant = 'cards'
}: ListingTypeSelectorProps) {
  const { t } = useTranslation();

  if (variant === 'tabs') {
    return (
      <div className="inline-flex rounded-lg border border-gray-200 p-1 bg-gray-50">
        <button
          type="button"
          onClick={() => onChange('camp')}
          disabled={disabled}
          className={cn(
            'px-4 py-2 rounded-md text-sm font-medium transition-all',
            value === 'camp'
              ? 'bg-white text-primary shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          )}
        >
          <Tent className="w-4 h-4 inline-block mr-2" />
          {t('listingType.camp.title')}
        </button>
        <button
          type="button"
          onClick={() => onChange('kashta')}
          disabled={disabled}
          className={cn(
            'px-4 py-2 rounded-md text-sm font-medium transition-all',
            value === 'kashta'
              ? 'bg-white text-primary shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          )}
        >
          <Waves className="w-4 h-4 inline-block mr-2" />
          {t('listingType.kashta.title')}
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <button
        type="button"
        onClick={() => onChange('camp')}
        disabled={disabled}
        className={cn(
          'p-6 border-2 rounded-lg transition-all text-left rtl:text-right',
          'hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed',
          value === 'camp'
            ? 'border-primary bg-primary/5'
            : 'border-gray-200 hover:border-gray-300'
        )}
      >
        <div className="flex items-start gap-4 rtl:flex-row-reverse">
          <div className={cn(
            'p-3 rounded-lg',
            value === 'camp' ? 'bg-primary/10' : 'bg-gray-100'
          )}>
            <Tent className={cn(
              'w-8 h-8',
              value === 'camp' ? 'text-primary' : 'text-gray-600'
            )} />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-1">
              {t('listingType.camp.title')}
            </h3>
            <p className="text-sm text-gray-600">
              {t('listingType.camp.description')}
            </p>
            <div className="mt-2 text-xs text-gray-500">
              {t('listingType.camp.features')}
            </div>
          </div>
        </div>
      </button>

      <button
        type="button"
        onClick={() => onChange('kashta')}
        disabled={disabled}
        className={cn(
          'p-6 border-2 rounded-lg transition-all text-left rtl:text-right',
          'hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed',
          value === 'kashta'
            ? 'border-primary bg-primary/5'
            : 'border-gray-200 hover:border-gray-300'
        )}
      >
        <div className="flex items-start gap-4 rtl:flex-row-reverse">
          <div className={cn(
            'p-3 rounded-lg',
            value === 'kashta' ? 'bg-primary/10' : 'bg-gray-100'
          )}>
            <Waves className={cn(
              'w-8 h-8',
              value === 'kashta' ? 'text-primary' : 'text-gray-600'
            )} />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-1">
              {t('listingType.kashta.title')}
            </h3>
            <p className="text-sm text-gray-600">
              {t('listingType.kashta.description')}
            </p>
            <div className="mt-2 text-xs text-gray-500">
              {t('listingType.kashta.features')}
            </div>
          </div>
        </div>
      </button>
    </div>
  );
}