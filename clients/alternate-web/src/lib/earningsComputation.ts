/**
 * Pure earnings computation — no Firebase, no React deps.
 * Shared by Host.tsx (web) and importable in tests.
 *
 * Rules:
 *  - Gross (total + month): paymentStatus 'paid' OR 'cash_collected'
 *  - Pending payout: paymentStatus 'paid' AND status 'confirmed'
 *    (cash is already in hand — no platform payout pending)
 */

export interface BookingForEarnings {
  totalPrice: number | string;
  paymentStatus: string;
  status: string;
  createdAt?: string | { toDate: () => Date } | null;
}

export interface EarningsResult {
  totalGross: number;
  monthGross: number;
  pendingPayout: number;
}

function resolveDate(createdAt: BookingForEarnings['createdAt']): Date {
  if (!createdAt) return new Date(0);
  if (typeof createdAt === 'string') return new Date(createdAt);
  if (typeof createdAt === 'object' && 'toDate' in createdAt) return createdAt.toDate();
  return new Date(0);
}

export function computeEarnings(
  bookings: BookingForEarnings[],
  now: Date = new Date()
): EarningsResult {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  let totalGross = 0;
  let monthGross = 0;
  let pendingPayout = 0;

  for (const b of bookings) {
    const isEarned =
      b.paymentStatus === 'paid' || b.paymentStatus === 'cash_collected';
    if (!isEarned) continue;

    const amount = Number(b.totalPrice) || 0;
    totalGross += amount;

    const createdDate = resolveDate(b.createdAt);
    if (createdDate >= monthStart) {
      monthGross += amount;
    }

    if (b.paymentStatus === 'paid' && b.status === 'confirmed') {
      pendingPayout += amount;
    }
  }

  return { totalGross, monthGross, pendingPayout };
}
