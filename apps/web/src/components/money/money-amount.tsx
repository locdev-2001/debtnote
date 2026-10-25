import type { MoneyDirection } from './presentation';

const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

export function formatVnd(amount: number): string {
  return currencyFormatter.format(amount);
}

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
