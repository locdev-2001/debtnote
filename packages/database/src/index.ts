import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { schema } from './schema';

export function createDatabase(connectionString: string) {
  const pool = new Pool({
    connectionString,
    max: 10,
    connectionTimeoutMillis: 2_000,
    query_timeout: 2_000,
    statement_timeout: 2_000,
  });

  return {
    pool,
    client: drizzle({ client: pool, schema }),
    async checkConnection(): Promise<void> {
      await pool.query('select 1');
    },
    close: () => pool.end(),
  };
}

export { PostgresLedgerRepository } from './ledger-repository';
