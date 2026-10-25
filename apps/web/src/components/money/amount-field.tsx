import { useId, useState } from 'react';
import { NumericFormat } from 'react-number-format';
import type { ComponentSize } from '../../design/component-size';
import { isSafeVndInput, parseVndPaste, vndCurrencySymbol, vndNumberFormat } from './format-vnd';

interface AmountFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  helperText?: string;
  onValidityChange?: (valid: boolean) => void;
  size?: ComponentSize;
}

export function AmountField({
  label,
  value,
  onChange,
  error,
  helperText,
  onValidityChange,
  size = 'regular',
}: AmountFieldProps) {
  const fieldId = useId();
  const [entryError, setEntryError] = useState<string>();
  const helpId = `${fieldId}-help`;
  const fieldError = error || entryError;
  const message = fieldError || helperText;

  return (
    <div className="amount-field" data-invalid={Boolean(fieldError)} data-component-size={size}>
      <label htmlFor={fieldId}>{label}</label>
      <div className="amount-input-shell">
        <NumericFormat
          {...vndNumberFormat}
          id={fieldId}
          inputMode="numeric"
          autoComplete="off"
          value={value}
          valueIsNumericString
          isAllowed={({ value: digits }) => isSafeVndInput(digits)}
          onValueChange={({ value: digits }, source) => {
            if (source.source !== 'event') return;
            setEntryError(undefined);
            onValidityChange?.(true);
            onChange(digits);
          }}
          onPaste={(event) => {
            if (parseVndPaste(event.clipboardData.getData('text')) === null) {
              event.preventDefault();
              setEntryError('Số tiền vừa dán không hợp lệ. Giá trị hiện tại chưa thay đổi.');
              onValidityChange?.(false);
            } else {
              setEntryError(undefined);
              onValidityChange?.(true);
            }
          }}
          aria-invalid={Boolean(fieldError)}
          aria-describedby={message ? helpId : undefined}
        />
        <span aria-hidden="true">{vndCurrencySymbol}</span>
      </div>
      {message && (
        <span className="amount-field-message" id={helpId}>
          {message}
        </span>
      )}
    </div>
  );
}
