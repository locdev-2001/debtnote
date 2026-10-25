import { fileURLToPath } from 'node:url';
import { readApiEnvironment } from '@debtnote/runtime';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

const environment = readApiEnvironment();
const pool = new Pool({ connectionString: environment.DATABASE_URL, connectionTimeoutMillis: 10_000, max: 1 });
try {
  const access = await pool.query<{ database: string; username: string; create_schema: boolean; create_tables: boolean }>(`SELECT current_database() AS database, current_user AS username, has_database_privilege(current_user,current_database(),'CREATE') AS create_schema, has_schema_privilege(current_user,'public','CREATE') AS create_tables`);
  const permissions = access.rows[0];
  if (permissions) console.info(`PostgreSQL: kết nối OK; DB=${permissions.database}; user=${permissions.username}; tạo schema=${permissions.create_schema ? 'có' : 'không'}; tạo bảng public=${permissions.create_tables ? 'có' : 'không'}.`);
  await migrate(drizzle(pool), { migrationsFolder: fileURLToPath(new URL('../migrations', import.meta.url)) });
  console.info('Đã áp dụng migration PostgreSQL.');
} catch (error) {
  let failure: unknown = error;
  for (let depth = 0; depth < 8; depth++) {
    if (!failure || typeof failure !== 'object') break;
    const nested = failure as { cause?: unknown; errors?: unknown[] };
    const cause = nested.cause ?? nested.errors?.[0];
    if (!cause || cause === failure) break;
    failure = cause;
  }
  const details = failure as { code?: string; message?: string; hint?: string } | null;
  const message = (details?.message || 'Chưa xác định được lỗi PostgreSQL.').replaceAll(environment.DATABASE_URL, '[kết nối đã ẩn]');
  console.error(`Migration PostgreSQL thất bại${details?.code ? ` [${details.code}]` : ''}: ${message}`);
  if (details?.hint) console.error(`Gợi ý PostgreSQL: ${details.hint}`);
  if (details?.code === '42501') console.error('Kiểm tra quyền owner/CREATE của user ứng dụng trên database và schema; không cần cấp SUPERUSER.');
  process.exitCode = 1;
} finally {
  await pool.end();
}
