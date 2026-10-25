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

export function getSettlementState(
  remainingAmount: number,
  awaitingConfirmation: boolean,
  confirmedCount: number,
): SettlementState {
  if (remainingAmount === 0) return 'paid';
  if (awaitingConfirmation) return 'confirmation';
  return confirmedCount > 0 ? 'partial' : 'unpaid';
}
export function getDeadlineView(
  date: string | null,
  promised: boolean,
  today: string,
): { label: string; kind: DeadlineKind } | undefined {
  if (!date) return undefined;
  if (date < today)
    return {
      label: `Quá hạn ${Math.round((Date.parse(today) - Date.parse(date)) / 86_400_000)} ngày`,
      kind: 'overdue',
    };
  if (date === today) return { label: promised ? 'Hẹn hôm nay' : 'Đến hạn hôm nay', kind: 'today' };
  const next = new Date(`${today}T12:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  const relative =
    date === next.toISOString().slice(0, 10)
      ? 'ngày mai'
      : new Intl.DateTimeFormat('vi-VN', {
          day: 'numeric',
          month: 'numeric',
          timeZone: 'UTC',
        }).format(new Date(`${date}T12:00:00Z`));
  return {
    label: `${promised ? 'Hẹn' : 'Đến hạn'} ${relative}`,
    kind: promised ? 'promised' : 'upcoming',
  };
}
