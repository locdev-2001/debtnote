import { existsSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';

export const projectDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const environmentPath = resolve(
  projectDirectory,
  process.env.DEBTNOTE_ENV_FILE || '.env.production',
);
export function readProductionSettings() {
  if (!existsSync(environmentPath)) throw new Error('Chạy scripts/production-init.sh trước.');
  const settings = parseEnv(readFileSync(environmentPath, 'utf8'));
  const required = ['DATABASE_URL', 'REDIS_URL', 'APP_ORIGIN', 'APP_DATA_KEY'];
  const missing = required.filter((key) => !settings[key] || /CHANGE_ME/.test(settings[key]));
  if (missing.length)
    throw new Error(`Điền cấu hình trong .env.production: ${missing.join(', ')}.`);
  if (!['postgres:', 'postgresql:'].includes(new URL(settings.DATABASE_URL).protocol))
    throw new Error('DATABASE_URL chưa hợp lệ.');
  if (!['redis:', 'rediss:'].includes(new URL(settings.REDIS_URL).protocol))
    throw new Error('REDIS_URL chưa hợp lệ.');
  if (new URL(settings.APP_ORIGIN).protocol !== 'https:')
    throw new Error('APP_ORIGIN production cần HTTPS.');
  if (!/^[a-fA-F0-9]{64}$/.test(settings.APP_DATA_KEY))
    throw new Error('APP_DATA_KEY cần 64 ký tự hex.');
  const uploads = settings.UPLOAD_DIR || '.local/uploads';
  return {
    ...settings,
    NODE_ENV: 'production',
    UPLOAD_DIR: isAbsolute(uploads) ? uploads : resolve(projectDirectory, uploads),
  };
}
