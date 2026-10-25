import type { ComponentSize } from '../../design/component-size';
import { AppIcon } from '../app-icon';
import { MoneyAmount } from './money-amount';
import { type MoneyDirection, moneyDirections } from './presentation';

interface MoneySummaryCardProps {
  direction: MoneyDirection;
  amount: number;
  description: string;
  selected: boolean;
  onSelect: () => void;
  size?: ComponentSize;
}

export function MoneySummaryCard({
  direction,
  amount,
  description,
  selected,
  onSelect,
  size = 'regular',
}: MoneySummaryCardProps) {
  const presentation = moneyDirections[direction];
  return (
    <button
      type="button"
      className="money-summary-card"
      data-direction={direction}
      data-component-size={size}
      aria-pressed={selected}
      onClick={onSelect}
    >
      <span className="money-summary-label">
        <AppIcon name={presentation.icon} size="small" />
        {presentation.label}
        {selected && <AppIcon name="check" size="compact" className="summary-selection" />}
      </span>
      <MoneyAmount amount={amount} direction={direction} size="summary" />
      <span className="money-summary-description">{description}</span>
    </button>
  );
}
