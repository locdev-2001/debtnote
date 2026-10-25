import { type ChevronProps, DayPicker } from '@daypicker/react';
import { vi } from '@daypicker/react/locale/vi';
import { getTodayKey, isDateKey } from '../../lib/calendar';
import { AppIcon } from '../app-icon';

function CalendarChevron({ orientation = 'right' }: ChevronProps) {
  return (
    <span className="date-calendar-chevron" data-orientation={orientation}>
      <AppIcon name="open" size="small" />
    </span>
  );
}

export default function CalendarPicker({
  id,
  value,
  minDate,
  onSelect,
}: {
  id: string;
  value: string;
  minDate: string;
  onSelect: (date: string) => void;
}) {
  const minimumDate = new Date(`${minDate}T12:00:00`);
  const today = new Date(`${getTodayKey()}T12:00:00`);
  const selectedDate = isDateKey(value) ? new Date(`${value}T12:00:00`) : undefined;
  return (
    <DayPicker
      id={id}
      className="date-calendar"
      role="dialog"
      aria-label="Chọn ngày hẹn"
      mode="single"
      required
      selected={selectedDate}
      defaultMonth={selectedDate ?? today}
      today={today}
      disabled={{ before: minimumDate }}
      startMonth={new Date(minimumDate.getFullYear(), minimumDate.getMonth(), 1)}
      locale={vi}
      weekStartsOn={1}
      showOutsideDays
      fixedWeeks
      autoFocus
      navLayout="after"
      components={{ Chevron: CalendarChevron }}
      formatters={{
        formatCaption: (date) => `Tháng ${date.getMonth() + 1} / ${date.getFullYear()}`,
        formatWeekdayName: (date) =>
          ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][date.getDay()] ?? '',
      }}
      onSelect={(date) => {
        const selectedDateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        if (selectedDateKey >= minDate) onSelect(selectedDateKey);
      }}
    />
  );
}
