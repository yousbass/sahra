/**
 * Price Calculation Utilities
 * Handles all pricing logic for bookings
 */

export interface PriceBreakdown {
  campPrice: number;
  serviceFee: number;
  taxes: number;
  total: number;
  currency: string;
}

/**
 * Calculates complete price breakdown for a booking
 */
export const calculatePriceBreakdown = (
  pricePerNight: number,
  nights: number,
  guests: number,
  serviceFeePercentage: number = 10,
  taxPercentage: number = 10,
  currency: string = 'BHD'
): PriceBreakdown => {
  // Base camp price
  const campPrice = pricePerNight * nights * guests;
  
  // Service fee (10% of camp price)
  const serviceFee = campPrice * (serviceFeePercentage / 100);
  
  // Taxes (10% of camp price + service fee)
  const taxes = (campPrice + serviceFee) * (taxPercentage / 100);
  
  // Total
  const total = campPrice + serviceFee + taxes;
  
  return {
    campPrice: roundToTwoDecimals(campPrice),
    serviceFee: roundToTwoDecimals(serviceFee),
    taxes: roundToTwoDecimals(taxes),
    total: roundToTwoDecimals(total),
    currency,
  };
};

/**
 * Rounds a number to 2 decimal places
 */
export const roundToTwoDecimals = (num: number): number => {
  return Math.round(num * 100) / 100;
};

/**
 * Converts BHD to fils (smallest currency unit)
 */
export const bhdToFils = (bhd: number): number => {
  return Math.round(bhd * 1000);
};

/**
 * Converts fils to BHD
 */
export const filsToBhd = (fils: number): number => {
  return fils / 1000;
};

/**
 * Formats price for display
 */
export const formatPrice = (
  amount: number,
  currency: string = 'BHD'
): string => {
  return `${amount.toFixed(2)} ${currency}`;
};