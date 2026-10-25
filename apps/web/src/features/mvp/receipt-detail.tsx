import type { Bill, LedgerSnapshot } from '@debtnote/contracts';
import { calculateBillSplit } from '@debtnote/money-core';
import { ExpenseReceipt, ReceiptAmountRow } from '../../components/money/expense-receipt';

export function BillReceipt({ bill, snapshot }: { bill: Bill; snapshot: LedgerSnapshot }) {
  const allocation = calculateBillSplit(
    bill.items,
    bill.participants.map((person) => person.id),
    bill.mode,
    bill.fee,
    bill.discount,
  );
  const records = snapshot.records.filter((record) => record.billId === bill.id);
  const balance = records.reduce((total, record) => total + record.remainingAmount, 0);
  const paid = records.some((record) => record.confirmedAmounts.length > 0);
  return (
    <ExpenseReceipt
      meta={`${bill.participants.length} người · ${bill.payerId === 'self' ? 'Bạn' : (bill.participants.find((person) => person.id === bill.payerId)?.name ?? 'Người khác')} đã trả`}
      watermark={balance === 0 ? 'settled' : paid ? 'partial' : 'upcoming'}
    >
      <div className="receipt-column-labels">
        <span>{bill.title}</span>
        <span>Thành tiền</span>
      </div>
      <div className="receipt-rows">
        {bill.items.map((item) => (
          <ReceiptAmountRow
            key={item.id}
            label={item.title}
            amount={item.amount}
            {...(bill.mode === 'custom' && item.participantIds.length !== bill.participants.length
              ? {
                  detail: item.participantIds
                    .map((id) => bill.participants.find((person) => person.id === id)?.name ?? '')
                    .join(', '),
                }
              : {})}
          />
        ))}
      </div>
      {bill.fee > 0 && <ReceiptAmountRow label="Phí" amount={bill.fee} />}
      {bill.discount > 0 && <ReceiptAmountRow label="Giảm giá" amount={bill.discount} deduction />}
      <ReceiptAmountRow label="Tổng cộng" amount={bill.totalAmount} emphasis="total" />
      <div className="receipt-column-labels">
        <span>Người</span>
        <span>Phần chia</span>
      </div>
      <div className="receipt-rows">
        {allocation.shares.map((share) => (
          <ReceiptAmountRow
            key={share.participantId}
            label={
              bill.participants.find((person) => person.id === share.participantId)?.name ?? 'Bạn'
            }
            amount={share.amount}
          />
        ))}
      </div>
      <ReceiptAmountRow label="Phần của bạn" amount={bill.ownAmount} emphasis="total" />
    </ExpenseReceipt>
  );
}
