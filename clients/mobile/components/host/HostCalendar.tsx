import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { AppText } from '@/components/AppText';
import { useColors } from '@/hooks/useColors';
import { useI18nContext as useI18n } from '@/contexts/I18nContext';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

interface HostCalendarProps {
  rangeStart: Date | null;
  rangeEnd: Date | null;
  onDayPress: (date: Date) => void;
  bookedDates: Date[];
  blockedRanges: { start: Date; end: Date }[];
}

/**
 * Month calendar for host availability management: shows booked days (dot),
 * host-blocked ranges (muted), and a selectable start→end range. Mirrors the
 * layout patterns of components/Calendar.tsx (weekday arrays, Intl month
 * formatter, RTL row-reverse).
 */
export function HostCalendar({
  rangeStart,
  rangeEnd,
  onDayPress,
  bookedDates,
  blockedRanges,
}: HostCalendarProps) {
  const colors = useColors();
  const { isRTL } = useI18n();
  const { i18n } = useTranslation();

  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  const nextMonth = () =>
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  const prevMonth = () =>
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));

  const isSameDay = (d1: Date, d2: Date) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

  const isDateBooked = (date: Date) => bookedDates.some((bd) => isSameDay(bd, date));

  const isDateBlocked = (date: Date) =>
    blockedRanges.some((block) => {
      const d = date.getTime();
      return d >= block.start.getTime() && d <= block.end.getTime();
    });

  const isDatePast = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const inSelectedRange = (date: Date) => {
    if (!rangeStart) return false;
    if (!rangeEnd) return isSameDay(date, rangeStart);
    const d = date.getTime();
    return d >= rangeStart.getTime() && d <= rangeEnd.getTime();
  };

  const isEndpoint = (date: Date) =>
    (rangeStart ? isSameDay(date, rangeStart) : false) ||
    (rangeEnd ? isSameDay(date, rangeEnd) : false);

  const daysInMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0
  ).getDate();
  const firstDayOfMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
    1
  ).getDay();

  const days: (Date | null)[] = [];
  for (let i = 0; i < firstDayOfMonth; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i));
  }

  const weekdaysEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weekdaysAr = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
  const weekdays = i18n.language === 'ar' ? weekdaysAr : weekdaysEn;

  const monthFormatter = new Intl.DateTimeFormat(
    i18n.language === 'ar' ? 'ar-BH' : 'en-US',
    { month: 'long', year: 'numeric' }
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, isRTL ? styles.rtlRow : null]}>
        <TouchableOpacity onPress={prevMonth} style={styles.arrowBtn}>
          <Ionicons
            name={isRTL ? 'chevron-forward' : 'chevron-back'}
            size={24}
            color={colors.foreground}
          />
        </TouchableOpacity>
        <AppText variant="h3">{monthFormatter.format(currentMonth)}</AppText>
        <TouchableOpacity onPress={nextMonth} style={styles.arrowBtn}>
          <Ionicons
            name={isRTL ? 'chevron-back' : 'chevron-forward'}
            size={24}
            color={colors.foreground}
          />
        </TouchableOpacity>
      </View>

      <View style={[styles.weekdays, isRTL ? styles.rtlRow : null]}>
        {weekdays.map((day, i) => (
          <AppText
            key={i}
            variant="labelSm"
            color={colors.mutedForeground}
            style={styles.weekdayText}
          >
            {day}
          </AppText>
        ))}
      </View>

      <View style={[styles.daysGrid, isRTL ? styles.rtlRow : null]}>
        {days.map((date, i) => {
          if (!date) return <View key={`empty-${i}`} style={styles.dayCell} />;

          const past = isDatePast(date);
          const booked = isDateBooked(date);
          const blocked = isDateBlocked(date);
          const selected = inSelectedRange(date);
          const endpoint = isEndpoint(date);
          const isToday = isSameDay(date, new Date());
          const disabled = past;

          let bgColor = 'transparent';
          let textColor = colors.foreground;
          let borderColor = 'transparent';

          if (endpoint) {
            bgColor = colors.primary;
            textColor = colors.primaryForeground;
          } else if (selected) {
            bgColor = colors.primary + '30';
          } else if (blocked) {
            bgColor = colors.muted;
            textColor = colors.mutedForeground;
          } else if (past) {
            textColor = colors.mutedForeground;
          }
          if (isToday && !endpoint && !selected) borderColor = colors.primary;

          return (
            <TouchableOpacity
              key={date.toISOString()}
              disabled={disabled}
              onPress={() => onDayPress(date)}
              style={[
                styles.dayCell,
                {
                  backgroundColor: bgColor,
                  borderColor,
                  borderWidth: isToday && !endpoint && !selected ? 1 : 0,
                },
              ]}
            >
              <AppText
                variant={endpoint ? 'label' : 'body'}
                color={textColor}
                weight={endpoint ? 'bold' : 'regular'}
              >
                {date.getDate()}
              </AppText>
              {booked && !endpoint ? (
                <View style={[styles.bookedDot, { backgroundColor: colors.destructive }]} />
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
});
