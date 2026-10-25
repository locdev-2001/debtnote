import {
  closeRedisConnection,
  createRedisConnection,
  workerProbeJobName,
  workerProbePayloadSchema,
  workerProbeQueueName,
} from '@debtnote/jobs';
import { readWorkerEnvironment, registerShutdown } from '@debtnote/runtime';
import { Worker } from 'bullmq';

const environment = readWorkerEnvironment();
const connection = createRedisConnection(environment.REDIS_URL, true);
connection.on('error', () => console.error('Worker không thể kết nối Redis.'));

const worker = new Worker(
  workerProbeQueueName,
  async (job) => {
    if (job.name !== workerProbeJobName) {
      throw new Error('Loại tác vụ chưa được đăng ký.');
    }

    workerProbePayloadSchema.parse(job.data);
    return { status: 'ok', processedAt: new Date().toISOString() };
  },
  { connection, concurrency: 5 },
);

worker.on('completed', (job) => console.info(`Đã xử lý tác vụ kiểm tra ${job.id}.`));
worker.on('failed', (job) => console.error(`Tác vụ ${job?.id} thất bại.`));
worker.on('error', () => console.error('Worker gặp lỗi trong quá trình xử lý.'));

registerShutdown(async () => {
  await worker.close();
  await closeRedisConnection(connection);
});

await worker.waitUntilReady();
console.info('Worker đã sẵn sàng.');
