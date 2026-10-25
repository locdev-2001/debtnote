import { accessSync, constants, statSync } from 'node:fs';
import { delimiter, join, resolve } from 'node:path';

const postgresTools = new Set(['psql', 'pg_dump', 'pg_restore', 'createdb', 'dropdb']);
function isExecutable(path) {
  try {
    accessSync(path, constants.X_OK);
    return statSync(path).isFile();
  } catch {
    return false;
  }
}
export function resolvePostgresTool(
  command,
  {
    postgresBin,
    searchPath = process.env.PATH || '',
    defaultDirectories = ['/www/server/pgsql/bin'],
  } = {},
) {
  if (!postgresTools.has(command)) throw new Error('Lệnh PostgreSQL chưa được hỗ trợ.');
  const directories = postgresBin
    ? [postgresBin]
    : [...defaultDirectories, ...searchPath.split(delimiter).filter(Boolean)];
  for (const directory of [...new Set(directories.map((candidate) => resolve(candidate)))]) {
    if (!['psql', 'pg_dump'].every((tool) => isExecutable(join(directory, tool)))) continue;
    const executable = join(directory, command);
    if (!isExecutable(executable))
      throw new Error(
        `Thiếu ${command} trong ${directory}. Kiểm tra bộ công cụ PostgreSQL đã cài.`,
      );
    return executable;
  }
  throw new Error(
    postgresBin
      ? `POSTGRES_BIN=${postgresBin} chưa có đủ psql và pg_dump.`
      : 'Không tìm thấy psql/pg_dump. Cài PostgreSQL trong aaPanel hoặc thêm POSTGRES_BIN=/duong/dan/postgresql/bin vào .env.production.',
  );
}
