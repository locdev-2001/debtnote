import { fileURLToPath } from 'node:url';

let pool;
let connectionString = process.env.DATABASE_URL || '';
try {
  const { readApiEnvironment } = await import('@debtnote/runtime');
  connectionString = readApiEnvironment().DATABASE_URL;
  const { readMigrationFiles } = await import('drizzle-orm/migrator');
  const postgres = await import('pg');
  const Pool = postgres.Pool || postgres.default.Pool;
  pool = new Pool({ connectionString, connectionTimeoutMillis: 10_000, max: 1 });
  const access = await pool.query(`
    SELECT current_database() AS database, current_user AS username,
      has_database_privilege(current_user,current_database(),'CREATE') AS create_schema,
      has_schema_privilege(current_user,'public','CREATE') AS create_tables,
      to_regclass('drizzle.__drizzle_migrations') IS NOT NULL AS drizzle_journal,
      to_regclass('public.__drizzle_migrations') IS NOT NULL AS public_journal
  `);
  const permissions = access.rows[0];
  const migrationsSchema = permissions.drizzle_journal
    ? 'drizzle'
    : permissions.public_journal || !permissions.create_schema
      ? 'public'
      : 'drizzle';
  console.info(
    `PostgreSQL: kết nối OK; DB=${permissions.database}; user=${permissions.username}; tạo schema=${permissions.create_schema ? 'có' : 'không'}; tạo bảng public=${permissions.create_tables ? 'có' : 'không'}; lịch sử migration=${migrationsSchema}.__drizzle_migrations.`,
  );
  const migrations = readMigrationFiles({
    migrationsFolder: fileURLToPath(new URL('../migrations', import.meta.url)),
  });
  // PostgreSQL checks database CREATE before honoring IF NOT EXISTS, so drizzle's migrator fails for a non-owner user.
  if (migrationsSchema === 'drizzle' && !permissions.drizzle_journal)
    await pool.query('CREATE SCHEMA IF NOT EXISTS drizzle');
  const journalTable = `"${migrationsSchema}"."__drizzle_migrations"`;
  await pool.query(
    `CREATE TABLE IF NOT EXISTS ${journalTable} (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at bigint)`,
  );
  const client = await pool.connect();
  let appliedCount = 0;
  try {
    await client.query('BEGIN');
    const lastApplied = await client.query(
      `SELECT created_at FROM ${journalTable} ORDER BY created_at DESC LIMIT 1`,
    );
    const lastAppliedAt = Number(lastApplied.rows[0]?.created_at ?? 0);
    for (const migration of migrations) {
      if (migration.folderMillis <= lastAppliedAt) continue;
      for (const statement of migration.sql) await client.query(statement);
      await client.query(`INSERT INTO ${journalTable} (hash, created_at) VALUES ($1, $2)`, [
        migration.hash,
        migration.folderMillis,
      ]);
      appliedCount++;
    }
    await client.query('COMMIT');
  } catch (migrationError) {
    await client.query('ROLLBACK');
    throw migrationError;
  } finally {
    client.release();
  }
  console.info(`Đã áp dụng ${appliedCount} migration PostgreSQL.`);
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
  console.error(
    `Migration PostgreSQL thất bại${failure?.code ? ` [${failure.code}]` : ''}: ${message}`,
  );
  if (failure?.hint) console.error(`Gợi ý PostgreSQL: ${failure.hint}`);
  if (failure?.code === '42501') {
    console.error(
      'Kiểm tra quyền owner/CREATE của user ứng dụng trên database và schema; không cần cấp SUPERUSER.',
    );
  }
  process.exitCode = 1;
} finally {
  if (pool) await pool.end();
}
