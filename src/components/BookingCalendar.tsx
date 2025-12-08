import { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CalendarDays, XCircle, Lock } from 'lucide-react';
import { format, isSameDay, isPast, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';

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
  disabled = false
}: BookingCalendarProps) {
  const [month, setMonth] = useState<Date>(selectedDate || new Date());

  // Check if a date is booked
  const isBooked = (date: Date) => {
    return bookedDates.some(bookedDate => isSameDay(bookedDate, date));
  };

  // Check if a date is blocked
  const isBlocked = (date: Date) => {
    return blockedDates.some(blockedDate => isSameDay(blockedDate, date));
  };

  // Check if a date is disabled
  const isDisabled = (date: Date) => {
    // Past dates
    if (isPast(startOfDay(date)) && !isSameDay(date, new Date())) {
      return true;
    }
    
    // Before min date
    if (minDate && date < minDate) {
      return true;
    }
    
    // After max date
    if (maxDate && date > maxDate) {
      return true;
    }
    
    // Booked or blocked
    return isBooked(date) || isBlocked(date);
  };

  // Get date status
  const getDateStatus = (date: Date): 'available' | 'booked' | 'blocked' | 'past' | 'selected' => {
    if (selectedDate && isSameDay(date, selectedDate)) return 'selected';
    if (isBooked(date)) return 'booked';
    if (isBlocked(date)) return 'blocked';
    if (isPast(startOfDay(date)) && !isSameDay(date, new Date())) return 'past';
    return 'available';
  };

  // Custom day content
  const modifiers = {
    booked: (date: Date) => isBooked(date),
    blocked: (date: Date) => isBlocked(date),
    selected: (date: Date) => selectedDate ? isSameDay(date, selectedDate) : false,
  };

  const modifiersClassNames = {
    booked: 'bg-red-100 text-red-900 line-through cursor-not-allowed hover:bg-red-100',
    blocked: 'bg-gray-100 text-gray-500 line-through cursor-not-allowed hover:bg-gray-100',
    selected: 'bg-orange-500 text-white hover:bg-[#FF8C42]',
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-#6B4423" />
              Select Your Date
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Check-in: {checkInTime} • Check-out: {checkOutTime} (next day)
            </p>
          </div>
        </div>

        {/* Calendar */}
        <Calendar
          mode="single"
          selected={selectedDate || undefined}
          onSelect={(date) => {
            if (date && !isDisabled(date)) {
              onDateSelect(date);
            }
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
            <div className="w-4 h-4 rounded bg-white border-2 border-orange-300"></div>
            <span className="text-gray-700">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-orange-500"></div>
            <span className="text-gray-700">Selected</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-100 flex items-center justify-center">
              <Lock className="w-3 h-3 text-red-600" />
            </div>
            <span className="text-gray-700">Booked</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gray-100 flex items-center justify-center">
              <XCircle className="w-3 h-3 text-gray-600" />
            </div>
            <span className="text-gray-700">Blocked</span>
          </div>
        </div>

        {/* Selected Date Info */}
        {selectedDate && (
          <div className="p-4 bg-orange-50 border-2 border-orange-200 rounded-lg">
            <p className="font-semibold text-gray-900 mb-1">Selected Date</p>
            <p className="text-sm text-gray-700">
              {format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </p>
            <p className="text-xs text-gray-600 mt-2">
              Full day reservation from {checkInTime} to {checkOutTime} (next day)
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
