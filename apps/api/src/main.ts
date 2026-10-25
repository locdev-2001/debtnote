import { createDatabase } from '@debtnote/database';
import { closeRedisConnection, createRedisConnection } from '@debtnote/jobs';
import { readApiEnvironment, registerShutdown } from '@debtnote/runtime';
import { createServer } from './app';

const environment = readApiEnvironment();
const database = createDatabase(environment.DATABASE_URL);
const redis = createRedisConnection(environment.REDIS_URL);
const server = createServer({
  logger: { level: environment.LOG_LEVEL },
  readinessChecks: {
    database: () => database.checkConnection(),
    redis: async () => {
      await redis.ping();
    },
  },
});

database.pool.on('error', (error) => server.log.error(error, 'Kết nối PostgreSQL gặp lỗi.'));
redis.on('error', (error) => server.log.error(error, 'Kết nối Redis gặp lỗi.'));
void redis.connect().catch(() => server.log.warn('Redis chưa sẵn sàng.'));

async function closeResources() {
  await server.close();
  await Promise.all([database.close(), closeRedisConnection(redis)]);
}

registerShutdown(closeResources);

try {
  await server.listen({ host: environment.API_HOST, port: environment.API_PORT });
} catch (error) {
  server.log.error(error, 'Không thể khởi động API.');
  await closeResources();
  process.exitCode = 1;
}
