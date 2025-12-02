import { useState } from 'react';
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
import { format, differenceInDays } from 'date-fns';
import { DateRange } from 'react-day-picker';

interface DateRangePickerProps {
  onConfirm: (dateRange: { startDate: Date; endDate: Date }, reason: string, reasonCategory: string, notes?: string) => void;
  onCancel: () => void;
  bookedDates?: Date[];
  disabled?: boolean;
}

const BLOCKING_REASONS = [
  { value: 'maintenance', label: 'Maintenance/Repairs' },
  { value: 'personal', label: 'Personal Use' },
  { value: 'weather', label: 'Weather Conditions' },
  { value: 'event', label: 'Special Event' },
  { value: 'seasonal', label: 'Seasonal Closure' },
  { value: 'other', label: 'Other' },
];

export function DateRangePicker({
  onConfirm,
  onCancel,
  bookedDates = [],
  disabled = false
}: DateRangePickerProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [reasonCategory, setReasonCategory] = useState<string>('maintenance');
  const [customReason, setCustomReason] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const handleConfirm = () => {
    if (!dateRange?.from) {
      return;
    }

    const startDate = dateRange.from;
    const endDate = dateRange.to || dateRange.from;

    const reason = reasonCategory === 'other' && customReason 
      ? customReason 
      : BLOCKING_REASONS.find(r => r.value === reasonCategory)?.label || 'Not specified';

    onConfirm(
      { startDate, endDate },
      reason,
      reasonCategory,
      notes || undefined
    );
  };

  const dayCount = dateRange?.from && dateRange?.to
    ? differenceInDays(dateRange.to, dateRange.from) + 1
    : dateRange?.from
    ? 1
    : 0;

  const isBooked = (date: Date) => {
    return bookedDates.some(bookedDate => 
      bookedDate.toDateString() === date.toDateString()
    );
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-terracotta-600" />
              Block Date Range
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Select dates to block for your camp
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="text-gray-600 hover:text-gray-900"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Calendar */}
        <div>
          <Label className="text-gray-900 font-semibold mb-2 block">
            Select Dates <span className="text-red-600">*</span>
          </Label>
          <Calendar
            mode="range"
            selected={dateRange}
            onSelect={setDateRange}
            disabled={(date) => disabled || isBooked(date) || date < new Date()}
            className="rounded-md border"
            numberOfMonths={2}
          />
          {dateRange?.from && (
            <p className="text-sm text-gray-600 mt-2">
              Selected: {format(dateRange.from, 'MMM dd, yyyy')}
              {dateRange.to && ` - ${format(dateRange.to, 'MMM dd, yyyy')}`}
              {dayCount > 0 && ` (${dayCount} day${dayCount > 1 ? 's' : ''})`}
            </p>
          )}
        </div>

        {/* Reason */}
        <div className="space-y-2">
          <Label htmlFor="reason" className="text-gray-900 font-semibold">
            Reason for Blocking <span className="text-red-600">*</span>
          </Label>
          <Select value={reasonCategory} onValueChange={setReasonCategory}>
            <SelectTrigger id="reason">
              <SelectValue placeholder="Select a reason..." />
            </SelectTrigger>
            <SelectContent>
              {BLOCKING_REASONS.map((reason) => (
                <SelectItem key={reason.value} value={reason.value}>
                  {reason.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Custom Reason */}
        {reasonCategory === 'other' && (
          <div className="space-y-2">
            <Label htmlFor="customReason" className="text-gray-900 font-semibold">
              Custom Reason <span className="text-red-600">*</span>
            </Label>
            <Textarea
              id="customReason"
              placeholder="Please specify the reason..."
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
            Additional Notes (Optional)
          </Label>
          <Textarea
            id="notes"
            placeholder="Any additional information..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={onCancel}
            className="flex-1"
            disabled={disabled}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!dateRange?.from || disabled || (reasonCategory === 'other' && !customReason)}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
          >
            Block {dayCount > 0 ? `${dayCount} Date${dayCount > 1 ? 's' : ''}` : 'Dates'}
          </Button>
        </div>
      </div>
    </Card>
  );
}