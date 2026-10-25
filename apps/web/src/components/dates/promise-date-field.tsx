import { addDays } from '../../lib/calendar';

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
      <label className="money-form-field">
        Ngày hẹn
        <input
          type="date"
          required
          min={today}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
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
