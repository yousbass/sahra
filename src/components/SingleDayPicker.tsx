import { useState } from 'react';
import { Calendar } from 'react-date-range';
import { isSameDay, format } from 'date-fns';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';

interface SingleDayPickerProps {
  bookedDates: Date[];
  onDateChange: (date: Date | null) => void;
  minDate?: Date;
  selectedDate?: Date | null;
  checkInTime?: string;
  checkOutTime?: string;
}

export const SingleDayPicker = ({ 
  bookedDates, 
  onDateChange,
  minDate = new Date(),
  selectedDate,
  checkInTime = '08:00 AM',
  checkOutTime = '03:00 AM'
}: SingleDayPickerProps) => {
  console.log('=== SINGLE DAY PICKER RENDER ===');
  console.log('Booked dates count:', bookedDates.length);
  console.log('Booked dates:', bookedDates);
  console.log('Selected date:', selectedDate);
  console.log('Check-in time:', checkInTime);
  console.log('Check-out time:', checkOutTime);

  // Check if a date is booked
  const isDateBooked = (date: Date): boolean => {
    const isBooked = bookedDates.some(bookedDate => isSameDay(bookedDate, date));
    if (isBooked) {
      console.log('Date is booked:', date);
    }
    return isBooked;
  };

  // Disable booked dates and past dates
  const disabledDay = (date: Date) => {
    // Disable past dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) {
      return true;
    }
    
    // Disable booked dates
    if (isDateBooked(date)) {
      return true;
    }
    
    return false;
  };

  const handleSelect = (date: Date) => {
    console.log('Date selected:', date);
    onDateChange(date);
  };

  return (
    <div className="single-day-picker-wrapper">
      <Calendar
        date={selectedDate || undefined}
        onChange={handleSelect}
        minDate={minDate}
        disabledDay={disabledDay}
        color="#d97706"
        className="rounded-lg border border-sand-300"
      />
      
      {selectedDate && (
        <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-1">Selected Day</p>
            <p className="text-2xl font-bold text-terracotta-600">
              {format(selectedDate, 'EEEE, MMM dd, yyyy')}
            </p>
            <p className="text-sm text-gray-600 mt-2">
              Full day reservation ({checkInTime} - {checkOutTime} next day)
            </p>
          </div>
        </div>
      )}
      
      {/* Custom styling for booked dates */}
      <style>{`
        .single-day-picker-wrapper .rdrDayDisabled {
          background-color: #fee2e2 !important;
          color: #ef4444 !important;
          text-decoration: line-through;
          cursor: not-allowed !important;
        }
        
        .single-day-picker-wrapper .rdrDay:not(.rdrDayDisabled):hover .rdrDayNumber span {
          background-color: #fef3c7 !important;
        }
        
        .single-day-picker-wrapper .rdrDayToday .rdrDayNumber span:after {
          background: #d97706 !important;
        }
        
        .single-day-picker-wrapper .rdrDayNumber span {
          color: inherit;
        }
        
        .single-day-picker-wrapper .rdrDay.rdrDayPassive .rdrDayNumber span {
          color: #d1d5db;
        }
        
        .single-day-picker-wrapper .rdrSelected .rdrDayNumber span {
          background-color: #d97706 !important;
          color: white !important;
        }
        
        .single-day-picker-wrapper .rdrCalendarWrapper {
          display: flex;
          justify-content: center;
          background: transparent;
        }
        
        @media (max-width: 768px) {
          .single-day-picker-wrapper .rdrCalendarWrapper {
            font-size: 14px;
          }
        }
      `}</style>
    </div>
  );
};