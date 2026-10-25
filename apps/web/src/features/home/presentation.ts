import { formatVnd } from '../../components/money/format-vnd';
import type { DeadlineKind } from '../../components/money/presentation';
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

export function deadlineView(
  record: HomeRecord,
  today: string,
): { label: string; kind: DeadlineKind } | undefined {
  if (!record.deadline) return undefined;
  const date = record.deadline.date;
  if (date < today) {
    const elapsed = Math.round((Date.parse(today) - Date.parse(date)) / 86_400_000);
    return { label: `Quá hạn ${elapsed} ngày`, kind: 'overdue' };
  }
  if (date === today)
    return { label: record.deadline.promised ? 'Hẹn hôm nay' : 'Đến hạn hôm nay', kind: 'today' };
  return {
    label: `${record.deadline.promised ? 'Hẹn' : 'Đến hạn'} ${relativeDate(date, today)}`,
    kind: record.deadline.promised ? 'promised' : 'upcoming',
  };
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
