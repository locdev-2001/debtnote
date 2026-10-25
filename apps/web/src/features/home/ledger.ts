import { assertMinorUnits, calculateOutstandingAmount } from '@debtnote/money-core';
import type { MoneyDirection, SettlementState } from '../../components/money/presentation';

export interface HomeRecord {
  id: string;
  personId: string;
  personName: string;
  direction: MoneyDirection;
  principalAmount: number;
  confirmedAmounts: number[];
  awaitingConfirmation: boolean;
  deadline: { date: string; promised: boolean } | null;
  note: string;
}

export type HomeFilter = 'all' | 'attention' | 'today' | 'overdue' | 'confirmation';
export type HomeCommand =
  | { type: 'receive'; id: string; amount: number }
  | { type: 'report-payment'; id: string }
  | { type: 'promise'; id: string; date: string }
  | { type: 'add'; record: HomeRecord }
  | { type: 'add-batch'; records: readonly HomeRecord[] };

export function getTodayKey(instant = new Date()): string {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant);
  const part = (type: string) => parts.find((entry) => entry.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function addDays(date: string, offset: number): string {
  const instant = new Date(`${date}T12:00:00Z`);
  instant.setUTCDate(instant.getUTCDate() + offset);
  return instant.toISOString().slice(0, 10);
}

export function isDateKey(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const instant = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(instant.getTime()) && instant.toISOString().slice(0, 10) === value;
}

export function remainingAmount(record: HomeRecord): number {
  return calculateOutstandingAmount(record.principalAmount, record.confirmedAmounts);
}

export function settlementState(record: HomeRecord): SettlementState {
  if (remainingAmount(record) === 0) return 'paid';
  if (record.awaitingConfirmation) return 'confirmation';
  return record.confirmedAmounts.length > 0 ? 'partial' : 'unpaid';
}

export function summarize(records: readonly HomeRecord[], direction: MoneyDirection) {
  const openRecords = records.filter(
    (record) => record.direction === direction && remainingAmount(record) > 0,
  );
  return {
    amount: openRecords.reduce((total, record) => {
      const nextTotal = total + remainingAmount(record);
      assertMinorUnits(nextTotal);
      return nextTotal;
    }, 0),
    people: new Set(openRecords.map((record) => record.personId)).size,
    count: openRecords.length,
  };
}

export function matchesFilter(record: HomeRecord, filter: HomeFilter, today: string): boolean {
  if (remainingAmount(record) === 0) return false;
  if (filter === 'all') return true;
  if (filter === 'confirmation') return record.awaitingConfirmation;
  if (!record.deadline || record.awaitingConfirmation) return false;
  if (filter === 'attention') return record.deadline.date <= today;
  return filter === 'today' ? record.deadline.date === today : record.deadline.date < today;
}

export function visibleRecords(
  records: readonly HomeRecord[],
  direction: MoneyDirection,
  filter: HomeFilter,
  search: string,
  today: string,
): HomeRecord[] {
  const normalize = (value: string) =>
    value
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/đ/gi, 'd')
      .toLocaleLowerCase('vi-VN');
  const query = normalize(search.trim());
  return records
    .filter(
      (record) =>
        record.direction === direction &&
        matchesFilter(record, filter, today) &&
        normalize(`${record.personName} ${record.note}`).includes(query),
    )
    .sort((left, right) =>
      (left.awaitingConfirmation ? '9999' : (left.deadline?.date ?? '9999')).localeCompare(
        right.awaitingConfirmation ? '9999' : (right.deadline?.date ?? '9999'),
      ),
    );
}

export function receiptError(record: HomeRecord, amount: number): string | undefined {
  try {
    assertMinorUnits(amount);
  } catch {
    return 'Số tiền chưa hợp lệ.';
  }
  if (record.direction !== 'receivable') return 'Khoản này là tiền bạn cần trả.';
  if (amount <= 0) return 'Số tiền nhận phải lớn hơn 0 ₫.';
  if (amount > remainingAmount(record))
    return 'Số tiền vượt phần còn nợ. Hãy kiểm tra lại trước khi xác nhận.';
  return undefined;
}

export function applyHomeCommand(
  records: readonly HomeRecord[],
  command: HomeCommand,
): HomeRecord[] {
  if (command.type === 'add' || command.type === 'add-batch') {
    const additions = command.type === 'add' ? [command.record] : command.records;
    const recordIds = new Set(records.map((record) => record.id));
    for (const record of additions) {
      assertMinorUnits(record.principalAmount);
      if (record.principalAmount === 0 || !record.personName.trim() || recordIds.has(record.id))
        throw new Error('Khoản tiền mới chưa hợp lệ hoặc đã được thêm.');
      recordIds.add(record.id);
    }
    const nextRecords = [...records, ...additions];
    summarize(nextRecords, 'receivable');
    summarize(nextRecords, 'payable');
    return nextRecords;
  }
  const target = records.find((record) => record.id === command.id);
  if (!target || remainingAmount(target) === 0)
    throw new Error('Khoản này đã xong hoặc không còn tồn tại.');
  if (command.type === 'receive') {
    const error = receiptError(target, command.amount);
    if (error) throw new Error(error);
    return records.map((record) =>
      record.id === target.id
        ? {
            ...record,
            confirmedAmounts: [...record.confirmedAmounts, command.amount],
            awaitingConfirmation: false,
          }
        : record,
    );
  }
  if (command.type === 'report-payment') {
    if (target.direction !== 'payable')
      throw new Error('Chỉ đánh dấu đã chuyển đối với khoản cần trả.');
    return records.map((record) =>
      record.id === target.id ? { ...record, awaitingConfirmation: true } : record,
    );
  }
  if (!isDateKey(command.date)) throw new Error('Ngày hẹn chưa hợp lệ.');
  return records.map((record) =>
    record.id === target.id
      ? { ...record, deadline: { date: command.date, promised: true } }
      : record,
  );
}
