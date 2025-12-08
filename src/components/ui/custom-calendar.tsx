import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  isWithinInterval,
  isBefore,
  isAfter,
} from 'date-fns';

interface CustomCalendarProps {
  mode?: 'single' | 'range';
  selected?: Date | { from: Date; to?: Date };
  onSelect?: (date: Date | { from: Date; to?: Date } | undefined) => void;
  disabled?: (date: Date) => boolean;
  numberOfMonths?: number;
  className?: string;
  variant?: 'default' | 'compact';
  hideLegend?: boolean;
}

export function CustomCalendar({
  mode = 'range',
  selected,
  onSelect,
  disabled,
  numberOfMonths = 1,
  className = '',
  variant = 'default',
  hideLegend = false,
}: CustomCalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const handlePrevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handleDateClick = (date: Date) => {
    if (disabled && disabled(date)) return;

    if (mode === 'single') {
      onSelect?.(date);
    } else if (mode === 'range') {
      if (!selected || typeof selected === 'object' && 'from' in selected && selected.to) {
        // Start new range
        onSelect?.({ from: date, to: undefined });
      } else if (typeof selected === 'object' && 'from' in selected && !selected.to) {
        // Complete the range
        const from = selected.from;
        if (isBefore(date, from)) {
          onSelect?.({ from: date, to: from });
        } else {
          onSelect?.({ from, to: date });
        }
      }
    }
  };

  const isDateSelected = (date: Date): boolean => {
    if (!selected) return false;
    
    if (selected instanceof Date) {
      return isSameDay(date, selected);
    }
    
    if ('from' in selected) {
      if (!selected.to) {
        return isSameDay(date, selected.from);
      }
      return (
        isSameDay(date, selected.from) ||
        isSameDay(date, selected.to) ||
        isWithinInterval(date, { start: selected.from, end: selected.to })
      );
    }
    
    return false;
  };

  const isDateRangeStart = (date: Date): boolean => {
    if (!selected || !(typeof selected === 'object' && 'from' in selected)) return false;
    return isSameDay(date, selected.from);
  };

  const isDateRangeEnd = (date: Date): boolean => {
    if (!selected || !(typeof selected === 'object' && 'from' in selected) || !selected.to) return false;
    return isSameDay(date, selected.to);
  };

  const isDateInRange = (date: Date): boolean => {
    if (!selected || !(typeof selected === 'object' && 'from' in selected) || !selected.to) return false;
    return isWithinInterval(date, { start: selected.from, end: selected.to }) &&
           !isSameDay(date, selected.from) &&
           !isSameDay(date, selected.to);
  };

  const isDateDisabled = (date: Date): boolean => {
    return disabled ? disabled(date) : false;
  };

  const getDateClasses = (date: Date): string => {
    const sizeClasses =
      variant === 'compact'
        ? 'h-9 w-9 text-xs'
        : 'h-11 w-11 text-sm';
    const baseClasses = `${sizeClasses} flex items-center justify-center rounded-lg font-medium transition-all duration-200 cursor-pointer`;
    const classes = [baseClasses];

    if (!isSameMonth(date, currentMonth)) {
      classes.push('text-gray-400 opacity-50');
    }

    if (isDateDisabled(date)) {
      classes.push('bg-transparent text-gray-300 border border-gray-200 cursor-not-allowed');
      classes.push('hover:scale-100');
    } else if (isDateRangeStart(date) || isDateRangeEnd(date)) {
      classes.push('bg-#6B4423 text-white font-semibold shadow-md');
      classes.push('hover:bg-#5A3820 hover:scale-105');
    } else if (isDateInRange(date)) {
      classes.push('bg-orange-50 text-#5A3820 border border-terracotta-100');
      classes.push('hover:bg-orange-100 hover:scale-105');
    } else if (isDateSelected(date)) {
      classes.push('bg-#6B4423 text-white font-semibold shadow-md');
      classes.push('hover:bg-#5A3820 hover:scale-105');
    } else if (isToday(date)) {
      classes.push('ring-2 ring-terracotta-300 ring-inset font-semibold');
      classes.push('hover:bg-gray-100 hover:scale-105');
    } else {
      classes.push('border border-gray-200 hover:bg-gray-100 hover:scale-105 hover:shadow-sm');
    }

    classes.push('active:scale-95');

    return classes.join(' ');
  };

  return (
    <div
      className={`bg-white rounded-xl shadow-sm border border-gray-200 ${
        variant === 'compact' ? 'p-3' : 'p-6'
      } ${className}`}
    >
      {/* Header */}
      <div className={`flex items-center justify-between ${variant === 'compact' ? 'mb-3' : 'mb-6'}`}>
        <button
          onClick={handlePrevMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-5 w-5 text-gray-600" />
        </button>
        
        <h2 className={`${variant === 'compact' ? 'text-lg' : 'text-xl'} font-semibold text-gray-900`}>
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        
        <button
          onClick={handleNextMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          aria-label="Next month"
        >
          <ChevronRight className="h-5 w-5 text-gray-600" />
        </button>
      </div>

      {/* Day headers */}
      <div className={`grid grid-cols-7 ${variant === 'compact' ? 'gap-1.5 mb-2' : 'gap-2 mb-3'}`}>
        {dayNames.map((day) => (
          <div
            key={day}
            className={`${variant === 'compact' ? 'h-7 text-[11px]' : 'h-10 text-sm'} flex items-center justify-center font-medium text-gray-600`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className={`grid grid-cols-7 ${variant === 'compact' ? 'gap-1.5' : 'gap-2'}`}>
        {days.map((day, index) => (
          <button
            key={index}
            onClick={() => handleDateClick(day)}
            disabled={isDateDisabled(day)}
            className={getDateClasses(day)}
            aria-label={format(day, 'MMMM d, yyyy')}
          >
            {format(day, 'd')}
          </button>
        ))}
      </div>

      {/* Legend */}
      {!hideLegend && (
        <div className="mt-6 pt-4 border-t border-gray-200 flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border-2 border-blue-500"></div>
            <span className="text-gray-600">Today</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-[#D2691E]"></div>
            <span className="text-gray-600">Selected</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-orange-200"></div>
            <span className="text-gray-600">In Range</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-100"></div>
            <span className="text-gray-600">Unavailable</span>
          </div>
        </div>
      )}
    </div>
  );
}
