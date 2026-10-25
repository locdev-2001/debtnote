export type Direction = 'receivable' | 'payable';
export interface Person {
  id: string;
  name: string;
  phone: string;
  createdAt: string;
}
export interface BillItem {
  id: string;
  title: string;
  amount: number;
  participantIds: string[];
}
export interface BillParticipant {
  id: string;
  name: string;
}
export interface Bill {
  id: string;
  title: string;
  payerId: string;
  participants: BillParticipant[];
  items: BillItem[];
  mode: 'equal' | 'custom';
  fee: number;
  discount: number;
  totalAmount: number;
  ownAmount: number;
  status: 'active' | 'cancelled';
  attachmentId: string | null;
  createdAt: string;
}
export interface Debt {
  id: string;
  personId: string;
  billId: string | null;
  direction: Direction;
  principalAmount: number;
  note: string;
  dueDate: string | null;
  status: 'active' | 'cancelled';
  createdAt: string;
}
export interface PaymentAllocation {
  debtId: string;
  amount: number;
}
export interface Payment {
  id: string;
  personId: string;
  direction: Direction;
  amount: number;
  allocations: PaymentAllocation[];
  excessAmount: number;
  status: 'pending' | 'confirmed' | 'rejected';
  shareId: string | null;
  note: string;
  createdAt: string;
  confirmedAt: string | null;
}
export interface PromiseRecord {
  id: string;
  debtId: string;
  date: string;
  amount: number;
  createdAt: string;
}
export interface Dispute {
  id: string;
  debtId: string;
  reason: string;
  note: string;
  itemId: string | null;
  status: 'open' | 'resolved';
  createdAt: string;
}
export interface ShareRequest {
  id: string;
  personId: string;
  debtIds: string[];
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
}
export interface LedgerEvent {
  id: string;
  debtId: string | null;
  billId: string | null;
  personId: string | null;
  kind: string;
  summary: string;
  amount: number | null;
  createdAt: string;
}
export interface Reminder {
  id: string;
  debtId: string;
  dueAt: string;
  status: 'scheduled' | 'delivered' | 'cancelled';
  createdAt: string;
}
export interface Notification {
  id: string;
  debtId: string | null;
  title: string;
  body: string;
  readAt: string | null;
  eventKey: string;
  createdAt: string;
}
export interface Draft {
  id: string;
  content: Record<string, unknown>;
  updatedAt: string;
}
export interface CommandReceipt {
  id: string;
  kind: string;
  digest: string;
  result: unknown;
  createdAt: string;
}
export interface LedgerState {
  preferences: { remindHour: number; remindersEnabled: boolean };
  people: Person[];
  bills: Bill[];
  debts: Debt[];
  payments: Payment[];
  promises: PromiseRecord[];
  disputes: Dispute[];
  shares: ShareRequest[];
  events: LedgerEvent[];
  reminders: Reminder[];
  notifications: Notification[];
  drafts: Draft[];
  commands: CommandReceipt[];
}
export interface Identity {
  id: string;
  phone: string;
  name: string;
}
export interface GuestScope {
  ownerId: string;
  shareId: string;
}
export interface LedgerRepository {
  read(ownerId: string): Promise<LedgerState>;
  transaction<Result>(
    ownerId: string,
    operation: (state: LedgerState) => Result | Promise<Result>,
  ): Promise<Result>;
}
export interface Clock {
  now(): string;
  today(): string;
  scheduledAt(date: string, hour: number): string;
}
export interface IdGenerator {
  create(): string;
  digest(value: string): string;
}
export interface DebtView extends Debt {
  personName: string;
  confirmedAmounts: number[];
  remainingAmount: number;
  awaitingConfirmation: boolean;
  promisedDate: string | null;
  promisedAmount: number;
  forecastGroups: Exclude<DebtView['forecastGroup'], null>[];
  forecastAmounts: Partial<Record<Exclude<DebtView['forecastGroup'], null>, number>>;
  disputed: boolean;
  attentionDate: string | null;
  deadlineState: 'today' | 'overdue' | 'upcoming' | 'none';
  forecastGroup: 'promised' | 'due' | 'overdue' | 'later' | 'undated' | null;
}
export interface LedgerSnapshot extends Omit<LedgerState, 'commands'> {
  today: string;
  records: DebtView[];
  totals: {
    receivable: number;
    payable: number;
    received: number;
    paid: number;
    advanced: number;
    ownExpense: number;
    excess: number;
  };
  forecast: { promised: number; due: number; overdue: number; later: number; undated: number };
}
export interface GuestRequest {
  debtIds: string[];
  id: string;
  recipientName: string;
  collectorName: string;
  principalAmount: number;
  confirmedAmounts: number[];
  dueDate: string | null;
  access: 'active' | 'expired';
  billTotal: number;
  paymentQrPayload: string | null;
  reference: string;
  originalLines: { id: string; title: string; amount: number; deduction?: boolean }[];
  lines: {
    id: string;
    debtId: string;
    title: string;
    totalAmount: number;
    participantCount: number;
    personalAmount: number;
    deduction?: boolean;
    proportional?: boolean;
    disputable?: boolean;
  }[];
  response: {
    reportedAmount: number | null;
    promisedDate: string | null;
    promisedAmount: number | null;
    dispute: { reason: string; note: string; itemId: string | null } | null;
  };
}

export function emptyLedgerState(): LedgerState {
  return {
    preferences: { remindHour: 9, remindersEnabled: true },
    people: [],
    bills: [],
    debts: [],
    payments: [],
    promises: [],
    disputes: [],
    shares: [],
    events: [],
    reminders: [],
    notifications: [],
    drafts: [],
    commands: [],
  };
}

export interface ReceiptOcrResult {
  text: string;
  confidence: number | null;
  items: { id: string; title: string; amount: number }[];
  detectedTotal: number | null;
  issues: string[];
}
export interface AttachmentView {
  id: string;
  name: string;
  mime: string;
  status: 'queued' | 'processing' | 'ready' | 'error';
  ocrResult: ReceiptOcrResult | null;
  error: string | null;
  createdAt: string;
}
export interface ReceivingProfile {
  name: string;
  paymentQrPayload: string | null;
  remindersEnabled: boolean;
  remindHour: number;
  hasRecovery: boolean;
}
