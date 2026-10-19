export interface PriceBreakdown {
  campPrice: number;
  serviceFee: number;
  taxes: number;
  total: number;
  currency: string;
}

export const calculatePriceBreakdown = (
  pricePerNight: number,
  nights: number,
  guests: number,
  serviceFeePercentage: number = 10,
  taxPercentage: number = 10,
  currency: string = 'BHD'
): PriceBreakdown => {
  const campPrice = pricePerNight * nights; // Simplified: usually per night/day, not multiplied by guests unless explicitly per-guest
  const serviceFee = campPrice * (serviceFeePercentage / 100);
  const taxes = (campPrice + serviceFee) * (taxPercentage / 100);
  const total = campPrice + serviceFee + taxes;
  
  return {
    campPrice: roundToTwoDecimals(campPrice),
    serviceFee: roundToTwoDecimals(serviceFee),
    taxes: roundToTwoDecimals(taxes),
    total: roundToTwoDecimals(total),
    currency,
  };
};

export const roundToTwoDecimals = (num: number): number => {
  return Math.round(num * 100) / 100;
};

export const formatPrice = (amount: number | null | undefined, currency: string = 'BHD'): string => {
  const value = Number(amount);
  return `${(Number.isFinite(value) ? value : 0).toFixed(3)} ${currency}`;
};
