import React, { useState, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { AppText } from './AppText';
import { useColors } from '@/hooks/useColors';
import { useI18nContext as useI18n } from '@/contexts/I18nContext';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { isWeekendDate, isHolidayDate, type PeakPricedCamp } from '@/lib/peakPricing';

interface CalendarProps {
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
  bookedDates: Date[];
  blockedDates: { start: Date; end: Date }[];
  camp?: PeakPricedCamp;
}

export function Calendar({ selectedDate, onSelectDate, bookedDates, blockedDates, camp }: CalendarProps) {
  const colors = useColors();
  const { isRTL } = useI18n();
  const { i18n } = useTranslation();
  
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getFullYear() === d2.getFullYear() && 
           d1.getMonth() === d2.getMonth() && 
           d1.getDate() === d2.getDate();
  };

  const isDateBooked = (date: Date) => {
    return bookedDates.some(bd => isSameDay(bd, date));
  };

  const isDateBlocked = (date: Date) => {
    return blockedDates.some(block => {
      const d = date.getTime();
      return d >= block.start.getTime() && d <= block.end.getTime();
    });
  };

  const isDatePast = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const isDateDisabled = (date: Date) => {
    return isDatePast(date) || isDateBooked(date) || isDateBlocked(date);
  };

  const hasWeekendRate = camp && typeof camp.weekendPrice === 'number' && camp.weekendPrice > 0;
  const hasHolidayRate = camp && typeof camp.holidayPrice === 'number' && camp.holidayPrice > 0;

  const isDatePeak = (date: Date) =>
    !isDateDisabled(date) &&
    ((hasHolidayRate && isHolidayDate(date)) || (hasWeekendRate && isWeekendDate(date)));

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const daysInMonth = getDaysInMonth(currentMonth.getFullYear(), currentMonth.getMonth());
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();

  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i));
  }

  const weekdaysEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weekdaysAr = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
  const weekdays = i18n.language === 'ar' ? weekdaysAr : weekdaysEn;

  const monthFormatter = new Intl.DateTimeFormat(i18n.language === 'ar' ? 'ar-BH' : 'en-US', { month: 'long', year: 'numeric' });
  const monthName = monthFormatter.format(currentMonth);

  return (
    <View style={styles.container}>
      <View style={[styles.header, isRTL && styles.rtlRow]}>
        <TouchableOpacity onPress={prevMonth} style={styles.arrowBtn}>
          <Ionicons name={isRTL ? "chevron-forward" : "chevron-back"} size={24} color={colors.foreground} />
        </TouchableOpacity>
        <AppText variant="h3">{monthName}</AppText>
        <TouchableOpacity onPress={nextMonth} style={styles.arrowBtn}>
          <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={24} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      <View style={[styles.weekdays, isRTL && styles.rtlRow]}>
        {weekdays.map((day, i) => (
          <AppText key={i} variant="labelSm" color={colors.mutedForeground} style={styles.weekdayText}>
            {day}
          </AppText>
        ))}
      </View>

      <View style={[styles.daysGrid, isRTL && styles.rtlRow]}>
        {days.map((date, i) => {
          if (!date) {
            return <View key={`empty-${i}`} style={styles.dayCell} />;
          }

          const disabled = isDateDisabled(date);
          const booked = isDateBooked(date);
          const isToday = isSameDay(date, new Date());
          const isSelected = selectedDate ? isSameDay(date, selectedDate) : false;
          const isPeak = isDatePeak(date);

          let bgColor = 'transparent';
          let textColor = colors.foreground;
          let borderColor = 'transparent';
          let borderWidth = 0;

          if (isSelected) {
            bgColor = colors.primary;
            textColor = colors.primaryForeground;
          } else if (disabled) {
            textColor = colors.mutedForeground;
            bgColor = colors.muted;
          } else if (isPeak) {
            bgColor = '#FEF3C7'; // amber-100
            textColor = '#92400E'; // amber-800
            borderColor = '#FCD34D'; // amber-300
            borderWidth = 1;
          } else if (isToday) {
            borderColor = colors.primary;
            borderWidth = 1;
          }

          return (
            <TouchableOpacity
              key={date.toISOString()}
              disabled={disabled}
              onPress={() => onSelectDate(date)}
              style={[
                styles.dayCell,
                { backgroundColor: bgColor, borderColor, borderWidth }
              ]}
            >
              <AppText variant={isSelected ? "label" : "body"} color={textColor} weight={isSelected || isPeak ? "bold" : "regular"}>
                {date.getDate()}
              </AppText>
              {booked && !isSelected && (
                <View style={[styles.bookedDot, { backgroundColor: colors.destructive }]} />
              )}
              {isPeak && !isSelected && (
                <View style={[styles.peakDot, { backgroundColor: '#F59E0B' }]} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  rtlRow: {
    flexDirection: 'row-reverse',
  },
  arrowBtn: {
    padding: 8,
  },
  weekdays: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    marginBottom: 4,
  },
  bookedDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    position: 'absolute',
    bottom: 4,
  },
  peakDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    position: 'absolute',
    bottom: 4,
  },
});
