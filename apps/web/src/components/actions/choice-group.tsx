import type { ComponentSize } from '../../design/component-size';

interface ChoiceGroupProps<Value extends string> {
  label: string;
  value: Value;
  options: readonly { value: Value; label: string }[];
  onChange: (value: Value) => void;
  size?: ComponentSize;
}

export function ChoiceGroup<Value extends string>({
  label,
  value,
  options,
  onChange,
  size = 'small',
}: ChoiceGroupProps<Value>) {
  return (
    <fieldset className="choice-controls" data-component-size={size}>
      <legend>{label}</legend>
      {options.map((option) => (
        <button
          type="button"
          key={option.value}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </fieldset>
  );
}
