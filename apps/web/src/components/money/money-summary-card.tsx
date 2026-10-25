import { AppIcon } from '../app-icon';
import { MoneyAmount } from './money-amount';
import { type MoneyDirection, moneyDirections } from './presentation';

interface MoneySummaryCardProps {
  direction: MoneyDirection;
  amount: number;
  description: string;
  selected: boolean;
  onSelect: () => void;
}

export function MoneySummaryCard({
  direction,
  amount,
  description,
  selected,
  onSelect,
}: MoneySummaryCardProps) {
  const presentation = moneyDirections[direction];
  return (
    <button
      type="button"
      className="money-summary-card"
      data-direction={direction}
      aria-pressed={selected}
      onClick={onSelect}
    >
      <span className="money-summary-label">
        <AppIcon name={presentation.icon} size="small" />
        {presentation.label}
      </span>
      <MoneyAmount amount={amount} direction={direction} size="summary" />
      <span className="money-summary-description">{description}</span>
    </button>
  );
}
