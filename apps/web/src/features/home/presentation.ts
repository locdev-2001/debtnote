import { formatVnd } from '../../components/money/format-vnd';
import { getDeadlineView } from '../../components/money/presentation';
import { addDays, type HomeRecord, remainingAmount, settlementState } from './ledger';

export function shortDate(date: string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    day: 'numeric',
    month: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T12:00:00Z`));
}

export function relativeDate(date: string, today: string): string {
  if (date === today) return 'hôm nay';
  if (date === addDays(today, 1)) return 'ngày mai';
  return shortDate(date);
}

export function deadlineView(record: HomeRecord, today: string) {
  return getDeadlineView(record.deadline?.date ?? null, record.deadline?.promised ?? false, today);
}

export function recordView(record: HomeRecord, today: string) {
  const deadline = deadlineView(record, today);
  const received = record.principalAmount - remainingAmount(record);
  return {
    id: record.id,
    name: record.personName,
    amount: remainingAmount(record),
    direction: record.direction,
    state: settlementState(record),
    description: received > 0 ? `Đã nhận ${formatVnd(received)} · ${record.note}` : record.note,
    ...(deadline ? { deadline } : {}),
  };
}
