import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Shield, Clock, AlertTriangle } from 'lucide-react';
import { CancellationPolicyType } from '@/lib/refundCalculator';

interface CancellationPolicySelectorProps {
  value: CancellationPolicyType;
  onChange: (value: CancellationPolicyType) => void;
}

export function CancellationPolicySelector({ value, onChange }: CancellationPolicySelectorProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-base font-semibold">Cancellation Policy *</Label>
        <p className="text-sm text-gray-600 mt-1">
          Choose how flexible you want to be with cancellations
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
                <span className="font-semibold text-gray-900">Flexible</span>
                <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                  Most Popular
                </span>
              </div>
              <p className="text-sm text-gray-700 font-medium">
                Full refund if cancelled 24+ hours before check-in
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Guests get their money back if they cancel at least 24 hours before check-in
              </p>
            </label>
          </div>

          {/* Moderate Policy */}
          <div className="flex items-start space-x-3 p-4 border-2 rounded-lg hover:border-terracotta-500 transition-colors cursor-pointer">
            <RadioGroupItem value="moderate" id="moderate" />
            <label htmlFor="moderate" className="flex-1 cursor-pointer">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-5 h-5 text-amber-600" />
                <span className="font-semibold text-gray-900">Moderate</span>
              </div>
              <p className="text-sm text-gray-700 font-medium">
                50% refund if cancelled 48+ hours before check-in
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Guests get half their money back if they cancel at least 48 hours before check-in
              </p>
            </label>
          </div>

          {/* Strict Policy */}
          <div className="flex items-start space-x-3 p-4 border-2 rounded-lg hover:border-terracotta-500 transition-colors cursor-pointer">
            <RadioGroupItem value="strict" id="strict" />
            <label htmlFor="strict" className="flex-1 cursor-pointer">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <span className="font-semibold text-gray-900">Strict</span>
              </div>
              <p className="text-sm text-gray-700 font-medium">
                50% refund if cancelled 7+ days before check-in
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Guests get half their money back only if they cancel at least 7 days before check-in
              </p>
            </label>
          </div>
        </div>
      </RadioGroup>
    </div>
  );
}