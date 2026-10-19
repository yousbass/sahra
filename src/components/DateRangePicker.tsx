import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CalendarDays, X } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import { DateRange } from 'react-day-picker';

interface DateRangePickerProps {
  onConfirm: (dateRange: { startDate: Date; endDate: Date }, reason: string, reasonCategory: string, notes?: string) => void;
  onCancel: () => void;
  bookedDates?: Date[];
  disabled?: boolean;
}

const BLOCKING_REASON_KEYS = [
  'maintenance', 'personal', 'weather', 'event', 'seasonal', 'other',
] as const;

export function DateRangePicker({
  onConfirm,
  onCancel,
  bookedDates = [],
  disabled = false
}: DateRangePickerProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'ar' ? 'ar-BH' : 'en-US';
  const fmtDate = (d: Date) => d.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' });

  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [reasonCategory, setReasonCategory] = useState<string>('maintenance');
  const [customReason, setCustomReason] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const handleConfirm = () => {
    if (!dateRange?.from) return;
    const startDate = dateRange.from;
    const endDate = dateRange.to || dateRange.from;
    const reason = reasonCategory === 'other' && customReason
      ? customReason
      : t(`manageAvailability.dateRangePicker.reasons.${reasonCategory}`, reasonCategory);
    onConfirm({ startDate, endDate }, reason, reasonCategory, notes || undefined);
  };

  const dayCount = dateRange?.from && dateRange?.to
    ? differenceInDays(dateRange.to, dateRange.from) + 1
    : dateRange?.from ? 1 : 0;

  const isBooked = (date: Date) =>
    bookedDates.some(d => d.toDateString() === date.toDateString());

  return (
    <Card className="p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary" />
              {t('manageAvailability.dateRangePicker.heading')}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {t('manageAvailability.dateRangePicker.subtitle')}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onCancel} className="text-gray-600 hover:text-gray-900">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Calendar */}
        <div>
          <Label className="text-gray-900 font-semibold mb-2 block">
            {t('manageAvailability.dateRangePicker.selectDates')} <span className="text-red-600">*</span>
          </Label>
          <Calendar
            mode="range"
            selected={dateRange}
            onSelect={(value) => {
              if (!value || value instanceof Date) {
                setDateRange(undefined);
              } else {
                setDateRange(value);
              }
            }}
            disabled={(date) => disabled || isBooked(date) || date < new Date()}
            className="rounded-md border"
            numberOfMonths={2}
          />
          {dateRange?.from && (
            <p className="text-sm text-gray-600 mt-2">
              {t('manageAvailability.dateRangePicker.selected')}: {fmtDate(dateRange.from)}
              {dateRange.to && ` – ${fmtDate(dateRange.to)}`}
              {dayCount > 0 && ` (${t('manageAvailability.blockedRanges.day', { count: dayCount })})`}
            </p>
          )}
        </div>

        {/* Reason */}
        <div className="space-y-2">
          <Label htmlFor="reason" className="text-gray-900 font-semibold">
            {t('manageAvailability.dateRangePicker.reasonLabel')} <span className="text-red-600">*</span>
          </Label>
          <Select value={reasonCategory} onValueChange={setReasonCategory}>
            <SelectTrigger id="reason">
              <SelectValue placeholder={t('manageAvailability.dateRangePicker.reasonPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {BLOCKING_REASON_KEYS.map((key) => (
                <SelectItem key={key} value={key}>
                  {t(`manageAvailability.dateRangePicker.reasons.${key}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Custom Reason */}
        {reasonCategory === 'other' && (
          <div className="space-y-2">
            <Label htmlFor="customReason" className="text-gray-900 font-semibold">
              {t('manageAvailability.dateRangePicker.customReasonLabel')} <span className="text-red-600">*</span>
            </Label>
            <Textarea
              id="customReason"
              placeholder={t('manageAvailability.dateRangePicker.customReasonPlaceholder')}
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>
        )}

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes" className="text-gray-900 font-semibold">
            {t('manageAvailability.dateRangePicker.notesLabel')}
          </Label>
          <Textarea
            id="notes"
            placeholder={t('manageAvailability.dateRangePicker.notesPlaceholder')}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onCancel} className="flex-1" disabled={disabled}>
            {t('manageAvailability.dateRangePicker.cancelBtn')}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!dateRange?.from || disabled || (reasonCategory === 'other' && !customReason)}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
          >
            {t('manageAvailability.dateRangePicker.blockBtn')}
            {dayCount > 0 && ` (${t('manageAvailability.blockedRanges.day', { count: dayCount })})`}
          </Button>
        </div>
      </div>
    </Card>
  );
}
