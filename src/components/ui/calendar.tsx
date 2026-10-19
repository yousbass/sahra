import * as React from 'react';
import { CustomCalendar } from './custom-calendar';
import type { DateRange } from 'react-day-picker';

export type CalendarProps = {
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
};

function Calendar(props: CalendarProps) {
  return <CustomCalendar {...props} />;
}

Calendar.displayName = 'Calendar';

export { Calendar };
