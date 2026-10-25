import { useId } from 'react';

interface AmountFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  helperText?: string;
}

export function AmountField({ label, value, onChange, error, helperText }: AmountFieldProps) {
  const fieldId = useId();
  const helpId = `${fieldId}-help`;
  const message = error || helperText;

  return (
    <div className="amount-field" data-invalid={Boolean(error)}>
      <label htmlFor={fieldId}>{label}</label>
      <div className="amount-input-shell">
        <input
          id={fieldId}
          inputMode="numeric"
          autoComplete="off"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={message ? helpId : undefined}
        />
        <span aria-hidden="true">đ</span>
      </div>
      {message && (
        <span className="amount-field-message" id={helpId}>
          {message}
        </span>
      )}
    </div>
  );
}
