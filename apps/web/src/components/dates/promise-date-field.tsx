import { addDays } from '../../lib/calendar';
import { DatePickerField } from './date-picker-field';

export function PromiseDateField({
  value,
  today,
  onChange,
}: {
  value: string;
  today: string;
  onChange: (date: string) => void;
}) {
  return (
    <>
      <DatePickerField label="Ngày hẹn" value={value} minDate={today} onChange={onChange} />
      <div className="money-presets">
        {[
          { days: 1, label: 'Ngày mai' },
          { days: 3, label: '3 ngày nữa' },
          { days: 7, label: 'Tuần sau' },
        ].map((option) => (
          <button
            type="button"
            key={option.days}
            aria-pressed={value === addDays(today, option.days)}
            onClick={() => onChange(addDays(today, option.days))}
          >
            {option.label}
          </button>
        ))}
      </div>
    </>
  );
}
