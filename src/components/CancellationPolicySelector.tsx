import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Shield, Clock, AlertTriangle } from 'lucide-react';
import { CancellationPolicyType } from '@/lib/refundCalculator';
import { useTranslation } from 'react-i18next';

interface CancellationPolicySelectorProps {
  value: CancellationPolicyType;
  onChange: (value: CancellationPolicyType) => void;
}

export function CancellationPolicySelector({ value, onChange }: CancellationPolicySelectorProps) {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-base font-semibold">{t('cancelSelector.title')}</Label>
        <p className="text-sm text-gray-600 mt-1">
          {t('cancelSelector.subtitle')}
        </p>
      </div>
      
      <RadioGroup value={value} onValueChange={onChange}>
        <div className="space-y-3">
          {/* Flexible Policy */}
          <div className="flex items-start space-x-3 p-4 border-2 rounded-lg hover:border-terracotta-500 transition-colors cursor-pointer">
            <RadioGroupItem value="flexible" id="flexible" />
            <label htmlFor="flexible" className="flex-1 cursor-pointer">
              <div className="flex items-center gap-2 mb-1">
                <Shield className="w-5 h-5 text-green-600" />
                <span className="font-semibold text-gray-900">{t('cancelSelector.flexible.name')}</span>
                <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                  {t('cancelSelector.mostPopular')}
                </span>
              </div>
              <p className="text-sm text-gray-700 font-medium">
                {t('cancelSelector.flexible.line1')}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                {t('cancelSelector.flexible.line2')}
              </p>
            </label>
          </div>

          {/* Moderate Policy */}
          <div className="flex items-start space-x-3 p-4 border-2 rounded-lg hover:border-terracotta-500 transition-colors cursor-pointer">
            <RadioGroupItem value="moderate" id="moderate" />
            <label htmlFor="moderate" className="flex-1 cursor-pointer">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-5 h-5 text-amber-600" />
                <span className="font-semibold text-gray-900">{t('cancelSelector.moderate.name')}</span>
              </div>
              <p className="text-sm text-gray-700 font-medium">
                {t('cancelSelector.moderate.line1')}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                {t('cancelSelector.moderate.line2')}
              </p>
            </label>
          </div>

          {/* Strict Policy */}
          <div className="flex items-start space-x-3 p-4 border-2 rounded-lg hover:border-terracotta-500 transition-colors cursor-pointer">
            <RadioGroupItem value="strict" id="strict" />
            <label htmlFor="strict" className="flex-1 cursor-pointer">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <span className="font-semibold text-gray-900">{t('cancelSelector.strict.name')}</span>
              </div>
              <p className="text-sm text-gray-700 font-medium">
                {t('cancelSelector.strict.line1')}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                {t('cancelSelector.strict.line2')}
              </p>
            </label>
          </div>
        </div>
      </RadioGroup>
    </div>
  );
}
