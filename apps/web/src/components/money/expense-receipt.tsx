import type { ReactNode } from 'react';
import { MoneyAmount } from './money-amount';

export function ExpenseReceipt({ meta, children }: { meta: string; children: ReactNode }) {
  return (
    <section className="expense-receipt-mat" aria-label="Phiếu chia tiền">
      <div className="expense-receipt">
        <header className="receipt-heading">
          <strong>DEBTNOTE</strong>
          <span>HÓA ĐƠN CHIA TIỀN</span>
          <small>{meta}</small>
        </header>
        {children}
      </div>
    </section>
  );
}

export function ReceiptAmountRow({
  label,
  amount,
  detail,
  emphasis = 'regular',
}: {
  label: string;
  amount: number;
  detail?: string;
  emphasis?: 'regular' | 'total' | 'settlement';
}) {
  return (
    <div className="receipt-amount-row" data-emphasis={emphasis}>
      <div>
        <span>{label}</span>
        {detail && <small>{detail}</small>}
      </div>
      <MoneyAmount amount={amount} />
    </div>
  );
}
