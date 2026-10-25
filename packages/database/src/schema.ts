import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

const createdAt = () =>
  timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow();
export const accounts = pgTable('accounts', {
  id: uuid('id').primaryKey(),
  phone: text('phone').notNull().unique(),
  name: text('name').notNull().default('Bạn'),
  pinHash: text('pin_hash').notNull(),
  recoveryHash: text('recovery_hash'),
  failedAttempts: integer('failed_attempts').notNull().default(0),
  lockedUntil: timestamp('locked_until', { withTimezone: true, mode: 'string' }),
  createdAt: createdAt(),
});
export const sessions = pgTable(
  'sessions',
  {
    hash: text('hash').primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'string' }).notNull(),
    createdAt: createdAt(),
  },
  (table) => [index('sessions_account_idx').on(table.accountId)],
);
export const authLimits = pgTable('auth_limits', {
  key: text('key').primaryKey(),
  attempts: integer('attempts').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'string' }).notNull(),
});
const owned = () => ({
  id: uuid('id').primaryKey(),
  ownerId: uuid('owner_id')
    .notNull()
    .references(() => accounts.id, { onDelete: 'cascade' }),
  createdAt: createdAt(),
});
export const people = pgTable(
  'people',
  { ...owned(), name: text('name').notNull(), phone: text('phone').notNull().default('') },
  (table) => [index('people_owner_idx').on(table.ownerId)],
);
export const bills = pgTable(
  'bills',
  {
    ...owned(),
    title: text('title').notNull(),
    payerId: text('payer_id').notNull(),
    participants: jsonb('participants').notNull(),
    items: jsonb('items').notNull(),
    mode: text('mode').notNull(),
    fee: bigint('fee', { mode: 'number' }).notNull().default(0),
    discount: bigint('discount', { mode: 'number' }).notNull().default(0),
    totalAmount: bigint('total_amount', { mode: 'number' }).notNull(),
    ownAmount: bigint('own_amount', { mode: 'number' }).notNull(),
    status: text('status').notNull(),
    attachmentId: uuid('attachment_id'),
  },
  (table) => [
    index('bills_owner_idx').on(table.ownerId),
    check(
      'bill_amounts_valid',
      sql`${table.fee} >= 0 AND ${table.discount} >= 0 AND ${table.totalAmount} BETWEEN 0 AND 9007199254740991 AND ${table.ownAmount} BETWEEN 0 AND ${table.totalAmount}`,
    ),
    check(
      'bill_mode_valid',
      sql`${table.mode} IN ('equal','custom') AND ${table.status} IN ('active','cancelled')`,
    ),
  ],
);
export const debts = pgTable(
  'debts',
  {
    ...owned(),
    personId: uuid('person_id')
      .notNull()
      .references(() => people.id),
    billId: uuid('bill_id').references(() => bills.id),
    direction: text('direction').notNull(),
    principalAmount: bigint('principal_amount', { mode: 'number' }).notNull(),
    note: text('note').notNull().default(''),
    dueDate: date('due_date'),
    status: text('status').notNull(),
  },
  (table) => [
    index('debts_owner_status_idx').on(table.ownerId, table.status),
    index('debts_owner_person_idx').on(table.ownerId, table.personId),
    check('debt_amount_valid', sql`${table.principalAmount} BETWEEN 1 AND 9007199254740991`),
    check(
      'debt_state_valid',
      sql`${table.direction} IN ('receivable','payable') AND ${table.status} IN ('active','cancelled')`,
    ),
  ],
);
export const payments = pgTable(
  'payments',
  {
    ...owned(),
    personId: uuid('person_id')
      .notNull()
      .references(() => people.id),
    direction: text('direction').notNull(),
    amount: bigint('amount', { mode: 'number' }).notNull(),
    allocations: jsonb('allocations').notNull(),
    excessAmount: bigint('excess_amount', { mode: 'number' }).notNull().default(0),
    status: text('status').notNull(),
    shareId: uuid('share_id'),
    note: text('note').notNull().default(''),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true, mode: 'string' }),
  },
  (table) => [
    index('payments_owner_status_idx').on(table.ownerId, table.status),
    check(
      'payment_amount_valid',
      sql`${table.amount} BETWEEN 1 AND 9007199254740991 AND ${table.excessAmount} BETWEEN 0 AND ${table.amount}`,
    ),
    check(
      'payment_state_valid',
      sql`${table.direction} IN ('receivable','payable') AND ${table.status} IN ('pending','confirmed','rejected') AND (${table.status} <> 'confirmed' OR ${table.confirmedAt} IS NOT NULL)`,
    ),
  ],
);
export const promises = pgTable(
  'promises',
  {
    ...owned(),
    debtId: uuid('debt_id')
      .notNull()
      .references(() => debts.id),
    date: date('date').notNull(),
    amount: bigint('amount', { mode: 'number' }).notNull(),
  },
  (table) => [
    uniqueIndex('promises_owner_debt_idx').on(table.ownerId, table.debtId),
    check('promise_amount_valid', sql`${table.amount} BETWEEN 1 AND 9007199254740991`),
  ],
);
export const disputes = pgTable(
  'disputes',
  {
    ...owned(),
    debtId: uuid('debt_id')
      .notNull()
      .references(() => debts.id),
    reason: text('reason').notNull(),
    note: text('note').notNull().default(''),
    itemId: text('item_id'),
    status: text('status').notNull(),
  },
  (table) => [index('disputes_owner_idx').on(table.ownerId)],
);
export const shares = pgTable(
  'shares',
  {
    ...owned(),
    personId: uuid('person_id')
      .notNull()
      .references(() => people.id),
    debtIds: jsonb('debt_ids').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'string' }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true, mode: 'string' }),
  },
  (table) => [index('shares_owner_idx').on(table.ownerId)],
);
export const shareKeys = pgTable('share_keys', {
  shareId: uuid('share_id')
    .primaryKey()
    .references(() => shares.id, { onDelete: 'cascade' }),
  hash: text('hash').notNull().unique(),
  sealedKey: text('sealed_key').notNull(),
});
export const events = pgTable(
  'ledger_events',
  {
    ...owned(),
    debtId: uuid('debt_id'),
    billId: uuid('bill_id'),
    personId: uuid('person_id'),
    kind: text('kind').notNull(),
    summary: text('summary').notNull(),
    amount: bigint('amount', { mode: 'number' }),
  },
  (table) => [index('events_owner_idx').on(table.ownerId)],
);
export const reminders = pgTable(
  'reminders',
  {
    ...owned(),
    debtId: uuid('debt_id')
      .notNull()
      .references(() => debts.id),
    dueAt: timestamp('due_at', { withTimezone: true, mode: 'string' }).notNull(),
    status: text('status').notNull(),
  },
  (table) => [index('reminders_due_idx').on(table.status, table.dueAt)],
);
export const notifications = pgTable(
  'notifications',
  {
    ...owned(),
    debtId: uuid('debt_id'),
    title: text('title').notNull(),
    body: text('body').notNull(),
    readAt: timestamp('read_at', { withTimezone: true, mode: 'string' }),
    eventKey: text('event_key').notNull(),
  },
  (table) => [uniqueIndex('notifications_event_idx').on(table.ownerId, table.eventKey)],
);
export const drafts = pgTable(
  'drafts',
  {
    id: uuid('id').primaryKey(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    content: jsonb('content').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull(),
  },
  (table) => [index('drafts_owner_idx').on(table.ownerId)],
);
export const commands = pgTable(
  'command_receipts',
  {
    ...owned(),
    kind: text('kind').notNull(),
    digest: text('digest').notNull(),
    result: jsonb('result').notNull(),
  },
  (table) => [index('commands_owner_idx').on(table.ownerId)],
);
export const receivingProfiles = pgTable('receiving_profiles', {
  ownerId: uuid('owner_id')
    .primaryKey()
    .references(() => accounts.id, { onDelete: 'cascade' }),
  sealedPayload: text('sealed_payload'),
  remindersEnabled: boolean('reminders_enabled').notNull().default(true),
  remindHour: integer('remind_hour').notNull().default(9),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull(),
});
export const attachments = pgTable(
  'attachments',
  {
    ...owned(),
    name: text('name').notNull(),
    mime: text('mime').notNull(),
    path: text('path').notNull(),
    status: text('status').notNull(),
    ocrResult: jsonb('ocr_result'),
    error: text('error'),
  },
  (table) => [index('attachments_owner_idx').on(table.ownerId)],
);
export const pushSubscriptions = pgTable('push_subscriptions', {
  ...owned(),
  shareId: uuid('share_id'),
  endpointHash: text('endpoint_hash').notNull().unique(),
  subscription: jsonb('subscription').notNull(),
});
export const schema = {
  accounts,
  sessions,
  authLimits,
  people,
  bills,
  debts,
  payments,
  promises,
  disputes,
  shares,
  shareKeys,
  events,
  reminders,
  notifications,
  drafts,
  commands,
  receivingProfiles,
  attachments,
  pushSubscriptions,
};
