import * as React from 'react';
import { CustomCalendar } from './custom-calendar';

export type CalendarProps = {
  mode?: 'single' | 'range';
  selected?: Date | { from: Date; to?: Date };
  onSelect?: (date: Date | { from: Date; to?: Date } | undefined) => void;
  disabled?: (date: Date) => boolean;
  numberOfMonths?: number;
  className?: string;
  variant?: 'default' | 'compact';
  hideLegend?: boolean;
};

function Calendar(props: CalendarProps) {
  return <CustomCalendar {...props} />;
}

Calendar.displayName = 'Calendar';

export { Calendar };
