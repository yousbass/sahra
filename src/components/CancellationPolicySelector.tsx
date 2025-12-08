import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { Shield, Coins, Info } from 'lucide-react';
import { CancellationPolicy, CancellationPolicyType, DEFAULT_PARTIAL_REFUND_RULES } from '@/lib/refundCalculator';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';

interface CancellationPolicySelectorProps {
  value: CancellationPolicy;
  onChange: (value: CancellationPolicy) => void;
}

export function CancellationPolicySelector({ value, onChange }: CancellationPolicySelectorProps) {
  const { t } = useTranslation();
  const [arboonPercentage, setArboonPercentage] = useState(value.arboonPercentage || 20);

  const handlePolicyTypeChange = (type: CancellationPolicyType) => {
    if (type === 'full_refundable') {
      onChange({ type: 'full_refundable' });
    } else {
      onChange({
        type: 'partial_refundable',
        arboonPercentage: arboonPercentage,
        refundRules: DEFAULT_PARTIAL_REFUND_RULES
      });
    }
  };

  const handleArboonChange = (newValue: number[]) => {
    const percentage = newValue[0];
    setArboonPercentage(percentage);
    if (value.type === 'partial_refundable') {
      onChange({
        ...value,
        arboonPercentage: percentage
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Label className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Shield className="w-6 h-6 text-terracotta-600" />
          {t('cancelSelector.title')}
        </Label>
        <p className="text-sm text-gray-600 mt-2 font-medium">
          {t('cancelSelector.subtitle')}
        </p>
      </div>
      
      <RadioGroup value={value.type} onValueChange={handlePolicyTypeChange}>
        <div className="space-y-4">
          {/* Full Refundable Policy */}
          <Card className={`p-5 border-2 transition-all cursor-pointer ${
            value.type === 'full_refundable' 
              ? 'border-terracotta-500 bg-terracotta-50' 
              : 'border-sand-300 hover:border-terracotta-300'
          }`}>
            <div className="flex items-start space-x-3">
              <RadioGroupItem value="full_refundable" id="full_refundable" className="mt-1" />
              <label htmlFor="full_refundable" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-5 h-5 text-green-600" />
                  <span className="font-bold text-gray-900">{t('cancelSelector.fullRefundable.name')}</span>
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-semibold">
                    {t('cancelSelector.recommended')}
                  </span>
                </div>
                <p className="text-sm text-gray-700 font-medium mb-2">
                  {t('cancelSelector.fullRefundable.description')}
                </p>
                <div className="bg-white/80 p-3 rounded-lg border border-green-200 mt-3">
                  <p className="text-xs font-semibold text-gray-900 mb-1">
                    ✓ {t('cancelSelector.fullRefundable.rule1')}
                  </p>
                  <p className="text-xs font-semibold text-gray-900">
                    ✗ {t('cancelSelector.fullRefundable.rule2')}
                  </p>
                </div>
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-blue-900 font-medium">
                      {t('cancelSelector.fullRefundable.example')}
                    </p>
                  </div>
                </div>
              </label>
            </div>
          </Card>

          {/* Partial Refundable with عربون */}
          <Card className={`p-5 border-2 transition-all cursor-pointer ${
            value.type === 'partial_refundable' 
              ? 'border-terracotta-500 bg-terracotta-50' 
              : 'border-sand-300 hover:border-terracotta-300'
          }`}>
            <div className="flex items-start space-x-3">
              <RadioGroupItem value="partial_refundable" id="partial_refundable" className="mt-1" />
              <label htmlFor="partial_refundable" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2 mb-2">
                  <Coins className="w-5 h-5 text-amber-600" />
                  <span className="font-bold text-gray-900">{t('cancelSelector.partialRefundable.name')}</span>
                </div>
                <p className="text-sm text-gray-700 font-medium mb-3">
                  {t('cancelSelector.partialRefundable.description')}
                </p>

                {/* Arboon Percentage Slider */}
                {value.type === 'partial_refundable' && (
                  <div className="space-y-4 mt-4">
                    <div className="bg-white/80 p-4 rounded-lg border border-amber-200">
                      <div className="flex items-center justify-between mb-3">
                        <Label className="text-sm font-bold text-gray-900">
                          {t('cancelSelector.partialRefundable.arboonLabel')}
                        </Label>
                        <span className="text-lg font-bold text-terracotta-600">
                          {arboonPercentage}%
                        </span>
                      </div>
                      <Slider
                        value={[arboonPercentage]}
                        onValueChange={handleArboonChange}
                        min={10}
                        max={50}
                        step={5}
                        className="mb-2"
                      />
                      <p className="text-xs text-gray-600 font-medium">
                        {t('cancelSelector.partialRefundable.arboonHelper')}
                      </p>
                    </div>

                    <div className="bg-white/80 p-3 rounded-lg border border-amber-200">
                      <p className="text-xs font-semibold text-gray-900 mb-2">
                        {t('cancelSelector.partialRefundable.refundRules')}
                      </p>
                      <div className="space-y-1.5">
                        <p className="text-xs text-gray-800">
                          ✓ {t('cancelSelector.partialRefundable.rule1')}
                        </p>
                        <p className="text-xs text-gray-800">
                          ⚠ {t('cancelSelector.partialRefundable.rule2')}
                        </p>
                        <p className="text-xs text-gray-800">
                          ✗ {t('cancelSelector.partialRefundable.rule3')}
                        </p>
                      </div>
                    </div>

                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-blue-900 font-medium">
                          {t('cancelSelector.partialRefundable.example', { arboon: arboonPercentage })}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </label>
            </div>
          </Card>
        </div>
      </RadioGroup>
    </div>
  );
}