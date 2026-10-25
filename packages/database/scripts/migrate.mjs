import { fileURLToPath } from 'node:url';

let pool;
let connectionString = process.env.DATABASE_URL || '';
try {
  const { readApiEnvironment } = await import('@debtnote/runtime');
  connectionString = readApiEnvironment().DATABASE_URL;
  const { drizzle } = await import('drizzle-orm/node-postgres');
  const { migrate } = await import('drizzle-orm/node-postgres/migrator');
  const postgres = await import('pg');
  const Pool = postgres.Pool || postgres.default.Pool;
  pool = new Pool({ connectionString, connectionTimeoutMillis: 10_000, max: 1 });
  const access = await pool.query(`
    SELECT current_database() AS database, current_user AS username,
      has_database_privilege(current_user,current_database(),'CREATE') AS create_schema,
      has_schema_privilege(current_user,'public','CREATE') AS create_tables
  `);
  const permissions = access.rows[0];
  if (permissions) {
    console.info(`PostgreSQL: kết nối OK; DB=${permissions.database}; user=${permissions.username}; tạo schema=${permissions.create_schema ? 'có' : 'không'}; tạo bảng public=${permissions.create_tables ? 'có' : 'không'}.`);
  }
  await migrate(drizzle(pool), {
    migrationsFolder: fileURLToPath(new URL('../migrations', import.meta.url)),
  });
  console.info('Đã áp dụng migration PostgreSQL.');
} catch (error) {
  let failure = error;
  for (let depth = 0; depth < 8; depth++) {
    if (!failure || typeof failure !== 'object') break;
    const cause = failure.cause || failure.errors?.[0];
    if (!cause || cause === failure) break;
    failure = cause;
  }
  let message = failure?.message || 'Chưa xác định được lỗi PostgreSQL.';
  if (connectionString) message = message.replaceAll(connectionString, '[kết nối đã ẩn]');
  console.error(`Migration PostgreSQL thất bại${failure?.code ? ` [${failure.code}]` : ''}: ${message}`);
  if (failure?.hint) console.error(`Gợi ý PostgreSQL: ${failure.hint}`);
  if (failure?.code === '42501') {
    console.error('Kiểm tra quyền owner/CREATE của user ứng dụng trên database và schema; không cần cấp SUPERUSER.');
  }
  process.exitCode = 1;
} finally {
  if (pool) await pool.end();
}
