import { createDatabase } from '@debtnote/database';
import {
  closeRedisConnection,
  createReceiptOcrQueue,
  createRedisConnection,
  scheduleReceiptOcr,
} from '@debtnote/jobs';
import { readApiEnvironment, registerShutdown, workspaceRoot } from '@debtnote/runtime';
import { loadEncryptionKey } from './adapters/secrets';
import { createServer } from './app';
import { createServices } from './services/create-services';

const environment = readApiEnvironment();
const database = createDatabase(environment.DATABASE_URL);
const redis = createRedisConnection(environment.REDIS_URL);
const ocrQueue = createReceiptOcrQueue(redis);
const key = await loadEncryptionKey(
  environment.APP_DATA_KEY,
  `${workspaceRoot}.local/data-key`,
  environment.NODE_ENV === 'production',
);
const services = createServices(database.pool, key, environment.UPLOAD_DIR, {
  enqueue: async (attachmentId) => {
    await scheduleReceiptOcr(ocrQueue, attachmentId);
  },
});
const server = createServer({
  trustProxy:
    environment.API_TRUST_PROXY_HOPS > 0
      ? (_address: string, hop: number) => hop < environment.API_TRUST_PROXY_HOPS
      : 'loopback',
  services,
  appOrigin: environment.APP_ORIGIN,
  production: environment.NODE_ENV === 'production',
  logger: {
    level: environment.LOG_LEVEL,
    redact: ['req.headers.cookie', 'req.headers.authorization', 'res.headers["set-cookie"]'],
    serializers: {
      req: (request: { method: string; url: string }) => ({
        method: request.method,
        url: request.url.split('?')[0] ?? '/',
      }),
    },
  },
  readinessChecks: {
    database: () => database.checkConnection(),
    redis: async () => {
      await redis.ping();
    },
  },
});
database.pool.on('error', () => server.log.error('Kết nối PostgreSQL gặp lỗi.'));
redis.on('error', () => server.log.error('Kết nối Redis gặp lỗi.'));
void redis.connect().catch(() => server.log.warn('Redis chưa sẵn sàng.'));
async function closeResources() {
  await server.close();
  await ocrQueue.close();
  await Promise.all([database.close(), closeRedisConnection(redis)]);
}
registerShutdown(closeResources);
try {
  await server.listen({ host: environment.API_HOST, port: environment.API_PORT });
} catch {
  server.log.error('Không thể khởi động API.');
  await closeResources();
  process.exitCode = 1;
}
