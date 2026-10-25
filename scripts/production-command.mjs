import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { resolvePostgresTool } from './production-postgres.mjs';
import {
  environmentPath,
  projectDirectory,
  readProductionSettings,
} from './production-settings.mjs';

const [operation, ...argumentsList] = process.argv.slice(2);

function execute(command, parameters, environment) {
  const result = spawnSync(command, parameters, {
    cwd: projectDirectory,
    env: environment,
    stdio: 'inherit',
  });
  if (result.error)
    throw new Error(`Không chạy được ${command}; kiểm tra PATH và phần mềm đã cài.`);
  process.exitCode = result.status ?? 1;
}
try {
  if (operation === 'init') {
    if (existsSync(environmentPath))
      console.log('Đã có .env.production; giữ nguyên cấu hình và khóa mã hóa.');
    else {
      const content = [
        'NODE_ENV=production',
        'APP_ORIGIN=https://debtnote.robertnguyen.io.vn',
        `APP_DATA_KEY=${randomBytes(32).toString('hex')}`,
        'DATABASE_URL=postgresql://debtnote:CHANGE_ME@127.0.0.1:5432/debtnote',
        'REDIS_URL=redis://127.0.0.1:6379/0',
        'API_HOST=127.0.0.1',
        'API_PORT=3001',
        'API_TRUST_PROXY_HOPS=1',
        'UPLOAD_DIR=.local/uploads',
        'LOG_LEVEL=info',
        '',
      ].join('\n');
      writeFileSync(environmentPath, content, { flag: 'wx', mode: 0o600 });
      console.log(
        'Đã tạo .env.production. Điền DATABASE_URL và REDIS_URL của aaPanel trước khi deploy.',
      );
    }
  } else {
    const settings = readProductionSettings();
    if (operation === 'environment-path') console.log(environmentPath);
    else if (operation === 'check') {
      const postgresOptions = { postgresBin: settings.POSTGRES_BIN || process.env.POSTGRES_BIN };
      const psql = resolvePostgresTool('psql', postgresOptions);
      resolvePostgresTool('pg_dump', postgresOptions);
      console.log(`Đã kiểm tra cấu hình production. PostgreSQL tools: ${dirname(psql)}`);
    } else if (operation === 'upload-directory') console.log(settings.UPLOAD_DIR);
    else if (operation === 'api-url')
      console.log(`http://127.0.0.1:${settings.API_PORT || '3001'}`);
    else if (operation === 'prepare') {
      for (const directory of [settings.UPLOAD_DIR, join(projectDirectory, '.local/logs')])
        mkdirSync(directory, { recursive: true, mode: 0o700 });
    } else if (operation === 'run') {
      const [command, ...parameters] = argumentsList;
      if (!command) throw new Error('Thiếu lệnh cần chạy.');
      execute(command, parameters, { ...process.env, ...settings });
    } else if (operation === 'postgres') {
      const [command, ...parameters] = argumentsList;
      if (!['psql', 'pg_dump', 'pg_restore', 'createdb', 'dropdb'].includes(command))
        throw new Error('Lệnh PostgreSQL chưa được hỗ trợ.');
      const connection = new URL(settings.DATABASE_URL);
      const environment = {
        ...process.env,
        PGHOST: connection.hostname,
        PGPORT: connection.port || '5432',
        PGUSER: decodeURIComponent(connection.username),
        PGPASSWORD: decodeURIComponent(connection.password),
        PGDATABASE: decodeURIComponent(connection.pathname.slice(1)),
      };
      for (const [option, variable] of [
        ['sslmode', 'PGSSLMODE'],
        ['sslcert', 'PGSSLCERT'],
        ['sslkey', 'PGSSLKEY'],
        ['sslrootcert', 'PGSSLROOTCERT'],
      ])
        if (connection.searchParams.has(option))
          environment[variable] = connection.searchParams.get(option);
      const executable = resolvePostgresTool(command, {
        postgresBin: settings.POSTGRES_BIN || process.env.POSTGRES_BIN,
      });
      execute(executable, parameters, environment);
    } else throw new Error('Thao tác production chưa được hỗ trợ.');
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Chưa thực hiện được lệnh production.');
  process.exitCode = 1;
}
