import { assertMinorUnits, calculateOutstandingAmount } from '@debtnote/money-core';
import { isDateKey } from '../../lib/calendar';

export interface PaymentRequest {
  id: string;
  recipientName: string;
  collectorName: string;
  principalAmount: number;
  confirmedAmounts: readonly number[];
  dueDate: string | null;
  access: 'active' | 'expired';
  billTotal: number;
  lines: readonly {
    id: string;
    title: string;
    totalAmount: number;
    participantCount: number;
    personalAmount: number;
  }[];
}
export interface PaymentRequestReader {
  load: (requestId: string) => Promise<PaymentRequest | null>;
}
export const disputeReasons = {
  amount: 'Sai số tiền',
  items: 'Không dùng khoản này',
  paid: 'Đã trả rồi',
  other: 'Lý do khác',
} as const;
export type DisputeReason = keyof typeof disputeReasons;
export interface RecipientResponse {
  reportedAmount: number | null;
  promisedDate: string | null;
  dispute: { reason: DisputeReason; note: string; itemId: string | null } | null;
}
export type RecipientCommand =
  | { type: 'report-payment'; amount: number }
  | { type: 'cancel-report' }
  | { type: 'promise'; date: string }
  | { type: 'dispute'; reason: DisputeReason; note: string; itemId: string | null };

export function emptyRecipientResponse(): RecipientResponse {
  return { reportedAmount: null, promisedDate: null, dispute: null };
}
export function requestOutstanding(request: PaymentRequest): number {
  return calculateOutstandingAmount(request.principalAmount, request.confirmedAmounts);
}
export function reportAmountIssue(request: PaymentRequest, amount: number): string | undefined {
  try {
    assertMinorUnits(amount);
  } catch {
    return 'Số tiền chưa hợp lệ.';
  }
  if (amount <= 0) return 'Nhập số tiền lớn hơn 0 ₫.';
  if (amount > requestOutstanding(request)) return 'Vượt số tiền còn cần trả.';
  return undefined;
}
export function applyRecipientCommand(
  request: PaymentRequest,
  response: RecipientResponse,
  command: RecipientCommand,
  today: string,
): RecipientResponse {
  if (request.access !== 'active') throw new Error('Link đã hết hạn.');
  if (requestOutstanding(request) === 0) throw new Error('Khoản này đã được xác nhận đủ.');
  if (command.type === 'report-payment') {
    const issue = reportAmountIssue(request, command.amount);
    if (issue) throw new Error(issue);
    return { ...response, reportedAmount: command.amount };
  }
  if (command.type === 'cancel-report') return { ...response, reportedAmount: null };
  if (command.type === 'promise') {
    if (!isDateKey(command.date) || command.date < today) throw new Error('Chọn ngày từ hôm nay.');
    return { ...response, promisedDate: command.date };
  }
  if (!Object.hasOwn(disputeReasons, command.reason) || command.note.length > 240)
    throw new Error('Kiểm tra lại lý do báo sai.');
  const itemId = command.reason === 'items' ? command.itemId : null;
  if (
    command.reason === 'items' &&
    !request.lines.some((line) => line.id === itemId && line.personalAmount > 0)
  )
    throw new Error('Chọn khoản cần kiểm tra.');
  return { ...response, dispute: { reason: command.reason, note: command.note.trim(), itemId } };
}
