import * as React from 'react';
import { useTranslation } from 'react-i18next';
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
import type { DateRange } from 'react-day-picker';

interface CustomCalendarProps {
  mode?: 'single' | 'range';
  selected?: Date | DateRange | undefined;
  onSelect?: (date: Date | DateRange | undefined) => void;
  disabled?: (date: Date) => boolean;
  numberOfMonths?: number;
  className?: string;
  variant?: 'default' | 'compact';
  hideLegend?: boolean;
  month?: Date;
  onMonthChange?: (month: Date) => void;
  modifiers?: Record<string, Date[] | ((date: Date) => boolean)>;
  modifiersClassNames?: Record<string, string>;
  initialFocus?: boolean;
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
  month,
  onMonthChange,
  modifiers,
  modifiersClassNames,
  initialFocus,
}: CustomCalendarProps) {
  const { t, i18n } = useTranslation();
  const [internalMonth, setInternalMonth] = React.useState(month ?? new Date());

  // Keep internal month in sync when controlled month prop changes
  React.useEffect(() => {
    if (month) setInternalMonth(month);
  }, [month]);

  const currentMonth = month ?? internalMonth;

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const locale = i18n.language === 'ar' ? 'ar-BH' : 'en-US';
  // Generate locale-aware weekday abbreviations starting from Sunday
  const dayNames = [0, 1, 2, 3, 4, 5, 6].map(i => {
    const d = new Date(2024, 0, 7 + i); // Jan 7 2024 = Sunday
    return d.toLocaleDateString(locale, { weekday: 'short' });
  });

  const handlePrevMonth = () => {
    const prev = subMonths(currentMonth, 1);
    if (onMonthChange) onMonthChange(prev);
    setInternalMonth(prev);
  };

  const handleNextMonth = () => {
    const next = addMonths(currentMonth, 1);
    if (onMonthChange) onMonthChange(next);
    setInternalMonth(next);
  };

  const handleDateClick = (date: Date) => {
    if (disabled && disabled(date)) return;

    if (mode === 'single') {
      onSelect?.(date);
    } else if (mode === 'range') {
      const rangeSelected = selected as DateRange | undefined;
      if (!rangeSelected || rangeSelected.to) {
        // Start new range
        onSelect?.({ from: date, to: undefined });
      } else if (rangeSelected.from && !rangeSelected.to) {
        // Complete the range
        const from = rangeSelected.from;
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

    const rangeSelected = selected as DateRange;
    if (rangeSelected.from) {
      if (!rangeSelected.to) {
        return isSameDay(date, rangeSelected.from);
      }
      return (
        isSameDay(date, rangeSelected.from) ||
        isSameDay(date, rangeSelected.to) ||
        isWithinInterval(date, { start: rangeSelected.from, end: rangeSelected.to })
      );
    }

    return false;
  };

  const isDateRangeStart = (date: Date): boolean => {
    if (!selected || selected instanceof Date) return false;
    const rangeSelected = selected as DateRange;
    return rangeSelected.from ? isSameDay(date, rangeSelected.from) : false;
  };

  const isDateRangeEnd = (date: Date): boolean => {
    if (!selected || selected instanceof Date) return false;
    const rangeSelected = selected as DateRange;
    return rangeSelected.to ? isSameDay(date, rangeSelected.to) : false;
  };

  const isDateInRange = (date: Date): boolean => {
    if (!selected || selected instanceof Date) return false;
    const rangeSelected = selected as DateRange;
    if (!rangeSelected.from || !rangeSelected.to) return false;
    return (
      isWithinInterval(date, { start: rangeSelected.from, end: rangeSelected.to }) &&
      !isSameDay(date, rangeSelected.from) &&
      !isSameDay(date, rangeSelected.to)
    );
  };

  const isDateDisabled = (date: Date): boolean => {
    return disabled ? disabled(date) : false;
  };

  // Evaluate custom modifiers for a date and collect extra class names
  const getModifierClasses = (date: Date): string => {
    if (!modifiers || !modifiersClassNames) return '';
    const extra: string[] = [];
    for (const key of Object.keys(modifiers)) {
      const matcher = modifiers[key];
      let matched = false;
      if (Array.isArray(matcher)) {
        matched = matcher.some(d => isSameDay(d, date));
      } else if (typeof matcher === 'function') {
        matched = matcher(date);
      }
      if (matched && modifiersClassNames[key]) {
        extra.push(modifiersClassNames[key]);
      }
    }
    return extra.join(' ');
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
      classes.push('bg-primary text-primary-foreground font-semibold shadow-md');
      classes.push('hover:bg-#5A3820 hover:scale-105');
    } else if (isDateInRange(date)) {
      classes.push('bg-secondary/50 text-primary-foreground border border-terracotta-100');
      classes.push('hover:bg-secondary hover:scale-105');
    } else if (isDateSelected(date)) {
      classes.push('bg-primary text-primary-foreground font-semibold shadow-md');
      classes.push('hover:bg-#5A3820 hover:scale-105');
    } else if (isToday(date)) {
      classes.push('ring-2 ring-terracotta-300 ring-inset font-semibold');
      classes.push('hover:bg-gray-100 hover:scale-105');
    } else {
      classes.push('border border-gray-200 hover:bg-gray-100 hover:scale-105 hover:shadow-sm');
    }

    classes.push('active:scale-95');

    const modifierClasses = getModifierClasses(date);
    if (modifierClasses) classes.push(modifierClasses);

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
          aria-label={t('customCalendar.prevMonth')}
        >
          <ChevronLeft className="h-5 w-5 text-gray-600" />
        </button>
        
        <h2 className={`${variant === 'compact' ? 'text-lg' : 'text-xl'} font-semibold text-gray-900`}>
          {currentMonth.toLocaleDateString(i18n.language === 'ar' ? 'ar-BH' : 'en-US', { year: 'numeric', month: 'long' })}
        </h2>
        
        <button
          onClick={handleNextMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          aria-label={t('customCalendar.nextMonth')}
        >
          <ChevronRight className="h-5 w-5 text-gray-600" />
        </button>
      </div>

      {/* Day headers */}
      <div className={`grid grid-cols-7 ${variant === 'compact' ? 'gap-1.5 mb-2' : 'gap-2 mb-3'}`}>
        {dayNames.map((day) => (
          <div
            key={day}
            className={`${variant === 'compact' ? 'h-7 text-xs' : 'h-10 text-sm'} flex items-center justify-center font-medium text-gray-600`}
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
            aria-label={day.toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' })}
          >
            {day.toLocaleDateString(locale, { day: 'numeric' })}
          </button>
        ))}
      </div>

      {/* Legend */}
      {!hideLegend && (
        <div className="mt-6 pt-4 border-t border-gray-200 flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border-2 border-blue-500"></div>
            <span className="text-gray-600">{t('customCalendar.today')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-[#D2691E]"></div>
            <span className="text-gray-600">{t('customCalendar.selected')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-orange-200"></div>
            <span className="text-gray-600">{t('customCalendar.inRange')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-100"></div>
            <span className="text-gray-600">{t('customCalendar.unavailable')}</span>
          </div>
        </div>
      )}
    </div>
  );
}
