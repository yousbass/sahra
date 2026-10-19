import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar } from '@/components/ui/calendar';
import { Card } from '@/components/ui/card';
import { CalendarDays, XCircle, Lock, TrendingUp } from 'lucide-react';
import { isSameDay, isPast, startOfDay } from 'date-fns';
import { isWeekendDate, isHolidayDate } from '@/lib/peakPricing';
import type { PeakPricedCamp } from '@/lib/peakPricing';

interface BookingCalendarProps {
  campId: string;
  bookedDates: Date[];
  blockedDates: Date[];
  selectedDate: Date | null;
  onDateSelect: (date: Date | null) => void;
  minDate?: Date;
  maxDate?: Date;
  checkInTime?: string;
  checkOutTime?: string;
  disabled?: boolean;
  camp?: PeakPricedCamp;
}

export function BookingCalendar({
  campId,
  bookedDates,
  blockedDates,
  selectedDate,
  onDateSelect,
  minDate = new Date(),
  maxDate,
  checkInTime = '08:00 AM',
  checkOutTime = '03:00 AM',
  disabled = false,
  camp,
}: BookingCalendarProps) {
  const { t, i18n } = useTranslation();
  const [month, setMonth] = useState<Date>(selectedDate || new Date());

  const hasWeekendRate = camp && typeof camp.weekendPrice === 'number' && camp.weekendPrice > 0;
  const hasHolidayRate = camp && typeof camp.holidayPrice === 'number' && camp.holidayPrice > 0;

  const isBooked = (date: Date) => bookedDates.some(d => isSameDay(d, date));
  const isBlocked = (date: Date) => blockedDates.some(d => isSameDay(d, date));
  const isPeakDay = (date: Date) =>
    (hasHolidayRate && isHolidayDate(date)) || (hasWeekendRate && isWeekendDate(date));

  const isDisabled = (date: Date) => {
    if (isPast(startOfDay(date)) && !isSameDay(date, new Date())) return true;
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    return isBooked(date) || isBlocked(date);
  };

  const modifiers = {
    booked: (date: Date) => isBooked(date),
    blocked: (date: Date) => isBlocked(date),
    selected: (date: Date) => selectedDate ? isSameDay(date, selectedDate) : false,
    peak: (date: Date) => !isBooked(date) && !isBlocked(date) && isPeakDay(date),
  };

  const modifiersClassNames = {
    booked: 'bg-red-100 text-red-900 line-through cursor-not-allowed hover:bg-red-100',
    blocked: 'bg-gray-100 text-gray-500 line-through cursor-not-allowed hover:bg-gray-100',
    selected: 'bg-primary text-primary-foreground hover:bg-primary/90',
    peak: 'bg-amber-50 text-amber-900 font-semibold ring-1 ring-amber-300 hover:bg-amber-100',
  };

  const selectedIsPeak = selectedDate && isPeakDay(selectedDate);
  const selectedPeakKind = selectedDate
    ? (hasHolidayRate && isHolidayDate(selectedDate) ? 'holiday' : 'weekend')
    : null;

  return (
    <Card className="p-6">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary" />
              {t('bookingCalendar.selectDate')}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {t('bookingCalendar.checkTimes', { checkIn: checkInTime, checkOut: checkOutTime })}
            </p>
          </div>
        </div>

        {/* Calendar */}
        <Calendar
          mode="single"
          selected={selectedDate || undefined}
          onSelect={(date) => {
            if (date instanceof Date && !isDisabled(date)) onDateSelect(date);
          }}
          month={month}
          onMonthChange={setMonth}
          disabled={(date) => disabled || isDisabled(date)}
          modifiers={modifiers}
          modifiersClassNames={modifiersClassNames}
          className="rounded-md border"
        />

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-white border-2 border-border/80"></div>
            <span className="text-gray-700">{t('bookingCalendar.available')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-secondary/500"></div>
            <span className="text-gray-700">{t('bookingCalendar.selected')}</span>
          </div>
          {(hasWeekendRate || hasHolidayRate) && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-amber-50 ring-1 ring-amber-300 flex items-center justify-center">
                <TrendingUp className="w-3 h-3 text-amber-600" />
              </div>
              <span className="text-gray-700">{t('bookingCalendar.peakRate')}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-100 flex items-center justify-center">
              <Lock className="w-3 h-3 text-red-600" />
            </div>
            <span className="text-gray-700">{t('bookingCalendar.booked')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gray-100 flex items-center justify-center">
              <XCircle className="w-3 h-3 text-gray-600" />
            </div>
            <span className="text-gray-700">{t('bookingCalendar.blocked')}</span>
          </div>
        </div>

        {/* Selected Date Info */}
        {selectedDate && (
          <div className="p-4 bg-secondary/50 border-2 border-border rounded-lg space-y-1">
            <p className="font-semibold text-gray-900">{t('bookingCalendar.selectedDate')}</p>
            <p className="text-sm text-gray-700">
              {selectedDate.toLocaleDateString(i18n.language === 'ar' ? 'ar-BH' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            {selectedIsPeak && (
              <p className="text-xs text-amber-700 flex items-center gap-1 font-medium">
                <TrendingUp className="w-3 h-3" />
                {selectedPeakKind === 'holiday'
                  ? t('bookingCalendar.peakHolidayNote')
                  : t('bookingCalendar.peakWeekendNote')}
              </p>
            )}
            <p className="text-xs text-gray-600">
              {t('bookingCalendar.fullDayDesc', { checkIn: checkInTime, checkOut: checkOutTime })}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
