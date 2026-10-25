import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { z } from 'zod';

export const workspaceRoot = fileURLToPath(new URL('../../../', import.meta.url));

config({ path: `${workspaceRoot}.env`, quiet: true });

const processEnvironmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  REDIS_URL: z.url().refine((value) => ['redis:', 'rediss:'].includes(new URL(value).protocol)),
});

const apiEnvironmentSchema = processEnvironmentSchema.extend({
  APP_ORIGIN: z.url().default('http://localhost:5173'),
  APP_DATA_KEY: z
    .string()
    .regex(/^[a-fA-F0-9]{64}$/)
    .optional(),
  UPLOAD_DIR: z.string().default(`${workspaceRoot}.local/uploads`),
  API_HOST: z.string().default('127.0.0.1'),
  API_TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(2).default(0),
  API_PORT: z.coerce.number().int().min(1).max(65_535).default(3001),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  DATABASE_URL: z
    .url()
    .refine((value) => ['postgres:', 'postgresql:'].includes(new URL(value).protocol)),
});

function parseEnvironment<EnvironmentSchema extends z.ZodType>(schema: EnvironmentSchema) {
  const parsedEnvironment = schema.safeParse(process.env);

  if (!parsedEnvironment.success) {
    const invalidFields = parsedEnvironment.error.issues
      .map((issue) => issue.path.join('.'))
      .join(', ');
    throw new Error(`Cấu hình môi trường không hợp lệ: ${invalidFields}. Kiểm tra file .env.`);
  }

  return parsedEnvironment.data;
}

export function readApiEnvironment() {
  return parseEnvironment(apiEnvironmentSchema);
}

export function readWorkerEnvironment() {
  return parseEnvironment(apiEnvironmentSchema);
}

export function registerShutdown(closeResources: () => Promise<void>): void {
  let closing = false;

  const shutdown = () => {
    if (closing) return;
    closing = true;

    const timeout = setTimeout(() => {
      console.error('Hết thời gian chờ đóng tài nguyên.');
      process.exit(1);
    }, 10_000);
    timeout.unref();

    void closeResources()
      .catch(() => {
        console.error('Không thể đóng đầy đủ tài nguyên.');
        process.exitCode = 1;
      })
      .finally(() => clearTimeout(timeout));
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

export { systemClock, systemIds } from './primitives';
