/**
 * Payment Method Selector Component
 * Allows users to choose between Card and Apple Pay
 */

import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CreditCard, Smartphone } from 'lucide-react';

interface PaymentMethodSelectorProps {
  selectedMethod: 'card' | 'apple_pay';
  onMethodChange: (method: 'card' | 'apple_pay') => void;
  applePayAvailable: boolean;
}

export function PaymentMethodSelector({
  selectedMethod,
  onMethodChange,
  applePayAvailable,
}: PaymentMethodSelectorProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Payment Method</h3>
      <RadioGroup value={selectedMethod} onValueChange={(value) => onMethodChange(value as 'card' | 'apple_pay')}>
        <Card className="p-4 cursor-pointer hover:border-#8B5A3C transition-colors border-2">
          <div className="flex items-center space-x-3">
            <RadioGroupItem value="card" id="card" />
            <Label htmlFor="card" className="flex items-center gap-3 cursor-pointer flex-1">
              <CreditCard className="h-5 w-5 text-#6B4423" />
              <div>
                <div className="font-semibold text-gray-900">Credit or Debit Card</div>
                <div className="text-sm text-gray-600">Visa, Mastercard, Amex</div>
              </div>
            </Label>
          </div>
        </Card>

        {applePayAvailable && (
          <Card className="p-4 cursor-pointer hover:border-#8B5A3C transition-colors border-2">
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="apple_pay" id="apple_pay" />
              <Label htmlFor="apple_pay" className="flex items-center gap-3 cursor-pointer flex-1">
                <Smartphone className="h-5 w-5 text-#6B4423" />
                <div>
                  <div className="font-semibold text-gray-900">Apple Pay</div>
                  <div className="text-sm text-gray-600">Fast and secure</div>
                </div>
              </Label>
            </div>
          </Card>
        )}
      </RadioGroup>
    </div>
  );
}