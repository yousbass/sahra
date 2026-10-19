export type TrendPoint = { label: string; revenue: number; bookings: number; users: number; listings: number };

export type AnalyticsRecord = Record<string, unknown>;

function dateOf(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'object' && value !== null && 'toDate' in value) return (value as { toDate: () => Date }).toDate();
  const date = new Date(value as string | number);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function buildAdminTrends(
  records: { users: AnalyticsRecord[]; bookings: AnalyticsRecord[]; listings: AnalyticsRecord[] },
  start: Date,
  end: Date,
): TrendPoint[] {
  const points: TrendPoint[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const finish = new Date(end.getFullYear(), end.getMonth(), 1);
  while (cursor <= finish) {
    const month = cursor.getMonth();
    const year = cursor.getFullYear();
    const inMonth = (row: AnalyticsRecord) => {
      const date = dateOf(row.createdAt ?? row.date ?? row.checkIn ?? row.timestamp);
      return date?.getMonth() === month && date.getFullYear() === year;
    };
    const bookings = records.bookings.filter(inMonth);
    points.push({
      label: cursor.toLocaleDateString(undefined, { month: 'short' }),
      bookings: bookings.length,
      users: records.users.filter(inMonth).length,
      listings: records.listings.filter(inMonth).length,
      revenue: bookings.filter(row => row.paymentStatus === 'paid' || row.paymentStatus === 'cash_collected')
        .reduce((sum, row) => sum + Number(row.totalPrice ?? row.amount ?? 0), 0),
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return points;
}

export function safePercentage(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(100, Math.max(0, number)) : fallback;
}