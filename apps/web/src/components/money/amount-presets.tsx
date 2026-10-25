import { formatVnd } from './format-vnd';

export function AmountPresets({
  amounts,
  selected,
  onSelect,
  fullAmount,
  fullLabel = 'Nhận đủ',
}: {
  amounts: readonly number[];
  selected: string;
  onSelect: (amount: number) => void;
  fullAmount?: number;
  fullLabel?: string;
}) {
  return (
    <div className="money-presets">
      {[...new Set(amounts)].map((amount) => (
        <button
          type="button"
          key={amount}
          aria-pressed={selected === String(amount)}
          onClick={() => onSelect(amount)}
        >
          {amount === fullAmount ? fullLabel : formatVnd(amount)}
        </button>
      ))}
    </div>
  );
}
