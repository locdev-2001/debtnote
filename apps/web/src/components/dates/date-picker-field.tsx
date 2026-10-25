import { lazy, Suspense, useEffect, useId, useRef, useState } from 'react';
import type { ComponentSize } from '../../design/component-size';
import { isDateKey } from '../../lib/calendar';
import { AppIcon } from '../app-icon';
import './date-picker.css';

const CalendarPicker = lazy(() => import('./calendar-picker'));

export function DatePickerField({
  label,
  value,
  minDate,
  onChange,
  size = 'regular',
}: {
  label: string;
  value: string;
  minDate: string;
  onChange: (date: string) => void;
  size?: ComponentSize;
}) {
  const fieldId = useId();
  const calendarId = `${fieldId}-calendar`;
  const labelId = `${fieldId}-label`;
  const valueId = `${fieldId}-value`;
  const [open, setOpen] = useState(false);
  const fieldRef = useRef<HTMLFieldSetElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const displayValue = isDateKey(value) ? value.split('-').reverse().join('/') : 'Chọn ngày';

  useEffect(() => {
    if (!open) return;
    function closeOutside(event: MouseEvent) {
      if (event.target instanceof Node && !fieldRef.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener('click', closeOutside);
    return () => document.removeEventListener('click', closeOutside);
  }, [open]);

  function closeCalendar() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  return (
    <fieldset
      aria-labelledby={labelId}
      className="date-picker-field"
      data-component-size={size}
      ref={fieldRef}
      onKeyDown={(event) => {
        if (open && event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          closeCalendar();
        }
      }}
    >
      <label id={labelId} htmlFor={fieldId}>
        {label}
      </label>
      <button
        ref={triggerRef}
        id={fieldId}
        type="button"
        className="date-picker-trigger"
        aria-labelledby={`${labelId} ${valueId}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? calendarId : undefined}
        onClick={() => setOpen((current) => !current)}
      >
        <span id={valueId}>{displayValue}</span>
        <AppIcon name="calendar" size="small" />
      </button>
      {open && (
        <div className="date-picker-panel">
          <Suspense
            fallback={
              <p className="date-picker-loading" role="status">
                Đang mở lịch…
              </p>
            }
          >
            <CalendarPicker
              id={calendarId}
              value={value}
              minDate={minDate}
              onSelect={(date) => {
                onChange(date);
                closeCalendar();
              }}
            />
          </Suspense>
        </div>
      )}
    </fieldset>
  );
}
