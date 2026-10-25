import type { LedgerRepository, LedgerState } from '@debtnote/contracts';
import { emptyLedgerState } from '@debtnote/contracts';
import type { Pool, PoolClient } from 'pg';

const tables = [
  { key: 'people', table: 'people', fields: ['id', 'name', 'phone', 'createdAt'] },
  {
    key: 'bills',
    table: 'bills',
    fields: [
      'id',
      'title',
      'payerId',
      'participants',
      'items',
      'mode',
      'fee',
      'discount',
      'totalAmount',
      'ownAmount',
      'status',
      'attachmentId',
      'createdAt',
    ],
  },
  {
    key: 'debts',
    table: 'debts',
    fields: [
      'id',
      'personId',
      'billId',
      'direction',
      'principalAmount',
      'note',
      'dueDate',
      'status',
      'createdAt',
    ],
  },
  {
    key: 'payments',
    table: 'payments',
    fields: [
      'id',
      'personId',
      'direction',
      'amount',
      'allocations',
      'excessAmount',
      'status',
      'shareId',
      'note',
      'createdAt',
      'confirmedAt',
    ],
  },
  { key: 'promises', table: 'promises', fields: ['id', 'debtId', 'date', 'amount', 'createdAt'] },
  {
    key: 'disputes',
    table: 'disputes',
    fields: ['id', 'debtId', 'reason', 'note', 'itemId', 'status', 'createdAt'],
  },
  {
    key: 'shares',
    table: 'shares',
    fields: ['id', 'personId', 'debtIds', 'expiresAt', 'revokedAt', 'createdAt'],
  },
  {
    key: 'events',
    table: 'ledger_events',
    fields: ['id', 'debtId', 'billId', 'personId', 'kind', 'summary', 'amount', 'createdAt'],
  },
  {
    key: 'reminders',
    table: 'reminders',
    fields: ['id', 'debtId', 'dueAt', 'status', 'createdAt'],
  },
  {
    key: 'notifications',
    table: 'notifications',
    fields: ['id', 'debtId', 'title', 'body', 'readAt', 'eventKey', 'createdAt'],
  },
  { key: 'drafts', table: 'drafts', fields: ['id', 'content', 'updatedAt'] },
  {
    key: 'commands',
    table: 'command_receipts',
    fields: ['id', 'kind', 'digest', 'result', 'createdAt'],
  },
] as const;
const jsonFields = new Set([
  'participants',
  'items',
  'allocations',
  'debtIds',
  'content',
  'result',
]);
const moneyFields = new Set([
  'fee',
  'discount',
  'totalAmount',
  'ownAmount',
  'principalAmount',
  'amount',
  'excessAmount',
]);
const dateFields = new Set(['dueDate', 'date']);
const columnName = (field: string) =>
  field.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
type Entity = Record<string, unknown> & { id: string };
type PersistedState = Record<Exclude<keyof LedgerState, 'preferences'>, Entity[]>;

export class PostgresLedgerRepository implements LedgerRepository {
  constructor(private readonly pool: Pool) {}
  private async load(client: PoolClient, ownerId: string): Promise<LedgerState> {
    const state = emptyLedgerState();
    const target = state as unknown as PersistedState;
    for (const descriptor of tables) {
      const columns = descriptor.fields
        .map(
          (field) => `${columnName(field)}${dateFields.has(field) ? '::text' : ''} AS "${field}"`,
        )
        .join(',');
      const result = await client.query(
        `SELECT ${columns} FROM ${descriptor.table} WHERE owner_id=$1`,
        [ownerId],
      );
      target[descriptor.key] = result.rows.map(
        (row: Entity) =>
          Object.fromEntries(
            Object.entries(row).map(([field, value]) => [
              field,
              value instanceof Date
                ? value.toISOString()
                : moneyFields.has(field) && value !== null
                  ? Number(value)
                  : value,
            ]),
          ) as Entity,
      );
    }
    const preferences = (
      await client.query(
        'SELECT remind_hour,reminders_enabled FROM receiving_profiles WHERE owner_id=$1',
        [ownerId],
      )
    ).rows[0];
    if (preferences)
      state.preferences = {
        remindHour: preferences.remind_hour,
        remindersEnabled: preferences.reminders_enabled,
      };
    return state;
  }
  private async persist(
    client: PoolClient,
    ownerId: string,
    before: LedgerState,
    after: LedgerState,
  ) {
    const previous = before as unknown as PersistedState;
    const next = after as unknown as PersistedState;
    for (const descriptor of tables) {
      const previousRows = new Map(
        previous[descriptor.key].map((row) => [row.id, JSON.stringify(row)]),
      );
      const currentIds = new Set(next[descriptor.key].map((row) => row.id));
      for (const id of previousRows.keys())
        if (!currentIds.has(id))
          await client.query(`DELETE FROM ${descriptor.table} WHERE owner_id=$1 AND id=$2`, [
            ownerId,
            id,
          ]);
      for (const row of next[descriptor.key]) {
        if (previousRows.get(row.id) === JSON.stringify(row)) continue;
        const fields = descriptor.fields;
        const columns = ['owner_id', ...fields.map(columnName)];
        const values = [
          ownerId,
          ...fields.map((field) =>
            jsonFields.has(field) ? JSON.stringify(row[field]) : (row[field] ?? null),
          ),
        ];
        const placeholders = values.map((_, index) => `$${index + 1}`).join(',');
        const updates = fields
          .filter((field) => field !== 'id')
          .map((field) => `${columnName(field)}=EXCLUDED.${columnName(field)}`)
          .join(',');
        const result = await client.query(
          `INSERT INTO ${descriptor.table} (${columns.join(',')}) VALUES (${placeholders}) ON CONFLICT (id) DO UPDATE SET ${updates} WHERE ${descriptor.table}.owner_id=$1 RETURNING id`,
          values,
        );
        if (!result.rowCount) throw new Error('Không thể ghi dữ liệu ngoài sổ.');
      }
    }
  }
  async dueOwners(now: string) {
    const result = await this.pool.query(
      "SELECT DISTINCT r.owner_id FROM reminders r LEFT JOIN receiving_profiles p ON p.owner_id=r.owner_id WHERE r.status='scheduled' AND r.due_at<=$1 AND COALESCE(p.reminders_enabled,true)=true",
      [now],
    );
    return result.rows.map((row) => row.owner_id as string);
  }
  async read(ownerId: string) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
      const state = await this.load(client, ownerId);
      await client.query('COMMIT');
      return state;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  async transaction<Result>(
    ownerId: string,
    operation: (state: LedgerState) => Result | Promise<Result>,
  ): Promise<Result> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const owner = await client.query('SELECT id FROM accounts WHERE id=$1 FOR UPDATE', [ownerId]);
      if (!owner.rowCount) throw new Error('Tài khoản không tồn tại.');
      const before = await this.load(client, ownerId);
      const after = structuredClone(before);
      const result = await operation(after);
      await this.persist(client, ownerId, before, after);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
