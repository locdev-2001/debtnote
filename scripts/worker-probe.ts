import {
  closeRedisConnection,
  createRedisConnection,
  createWorkerProbeEvents,
  createWorkerProbeQueue,
  workerProbeJobName,
} from '@debtnote/jobs';
import { readWorkerEnvironment } from '@debtnote/runtime';

const environment = readWorkerEnvironment();
const producerConnection = createRedisConnection(environment.REDIS_URL);
const eventConnection = createRedisConnection(environment.REDIS_URL, true);
producerConnection.on('error', () => console.error('Không thể kết nối Redis để tạo tác vụ.'));
eventConnection.on('error', () => console.error('Không thể theo dõi tác vụ trên Redis.'));

await producerConnection.connect();
const queue = createWorkerProbeQueue(producerConnection);
const events = createWorkerProbeEvents(eventConnection);

try {
  await events.waitUntilReady();
  const job = await queue.add(workerProbeJobName, { requestedAt: new Date().toISOString() });
  await job.waitUntilFinished(events, 10_000);
  console.info('Kiểm tra thành công: tác vụ đã đi qua Redis và được worker xử lý.');
} finally {
  await Promise.all([queue.close(), events.close()]);
  await Promise.all([
    closeRedisConnection(producerConnection),
    closeRedisConnection(eventConnection),
  ]);
}
