export const moneyDirections = {
  receivable: {
    label: 'Cần thu',
    icon: 'receive',
    actionLabel: 'Nhắc thanh toán',
    actionIcon: 'reminder',
  },
  payable: { label: 'Cần trả', icon: 'send', actionLabel: 'Thanh toán', actionIcon: 'send' },
} as const;

export const settlementStates = {
  unpaid: { label: 'Chưa trả', tone: 'pending' },
  partial: { label: 'Trả một phần', tone: 'partial' },
  confirmation: { label: 'Chờ xác nhận', tone: 'confirmation' },
  paid: { label: 'Đã trả', tone: 'paid' },
} as const;

export type MoneyDirection = keyof typeof moneyDirections;
export type SettlementState = keyof typeof settlementStates;
export type DeadlineKind = 'upcoming' | 'today' | 'promised' | 'overdue';
