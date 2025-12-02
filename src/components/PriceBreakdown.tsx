/**
 * Price Breakdown Component
 * Displays detailed pricing information for a booking
 */

import React from 'react';

interface PriceBreakdownProps {
  campPrice: number;
  nights: number;
  guests: number;
  serviceFeePercentage?: number;
  taxPercentage?: number;
  currency?: string;
  pricePerNight?: number;
}

export const PriceBreakdown: React.FC<PriceBreakdownProps> = ({
  campPrice,
  nights,
  guests,
  serviceFeePercentage = 10,
  taxPercentage = 10,
  currency = 'BD',
  pricePerNight,
}) => {
  const basePrice = campPrice;
  const serviceFee = basePrice * (serviceFeePercentage / 100);
  const taxes = (basePrice + serviceFee) * (taxPercentage / 100);
  const total = basePrice + serviceFee + taxes;
  
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-gray-900">Price Details</h3>
      
      <div className="space-y-2">
        <div className="flex justify-between text-gray-700">
          <span className="font-medium">
            {pricePerNight ? `${pricePerNight} ${currency} × ` : ''}
            {nights} night{nights !== 1 ? 's' : ''} × {guests} guest{guests !== 1 ? 's' : ''}
          </span>
          <span className="font-semibold">{basePrice.toFixed(2)} {currency}</span>
        </div>
        
        <div className="flex justify-between text-gray-700">
          <span className="font-medium">Service Fee ({serviceFeePercentage}%)</span>
          <span className="font-semibold">{serviceFee.toFixed(2)} {currency}</span>
        </div>
        
        <div className="flex justify-between text-gray-700">
          <span className="font-medium">Taxes ({taxPercentage}% VAT)</span>
          <span className="font-semibold">{taxes.toFixed(2)} {currency}</span>
        </div>
        
        <div className="border-t-2 border-sand-300 pt-3 flex justify-between text-lg font-bold">
          <span className="text-gray-900">Total</span>
          <span className="text-terracotta-600">
            {total.toFixed(2)} {currency}
          </span>
        </div>
      </div>
    </div>
  );
};