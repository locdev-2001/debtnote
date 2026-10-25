import type { ReactNode } from 'react';
import { MascotIllustration, type MascotState } from '../illustrations/mascot-illustration';
import { MoneyAmount } from './money-amount';

export function ExpenseReceipt({
  meta,
  children,
  watermark,
}: {
  meta: string;
  children: ReactNode;
  watermark?: MascotState;
}) {
  return (
    <section className="expense-receipt-mat" aria-label="Phiếu chia tiền">
      <div className="expense-receipt">
        {watermark && (
          <div className="receipt-watermark" aria-hidden="true">
            <MascotIllustration state={watermark} decorative priority />
          </div>
        )}
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
