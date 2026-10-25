import { formatVnd } from './format-vnd';
import type { MoneyDirection } from './presentation';

interface MoneyAmountProps {
  amount: number;
  direction?: MoneyDirection;
  size?: 'row' | 'summary';
}

export function MoneyAmount({ amount, direction, size = 'row' }: MoneyAmountProps) {
  return (
    <span className="money-amount" data-direction={direction} data-size={size}>
      {formatVnd(amount)}
    </span>
  );
}
